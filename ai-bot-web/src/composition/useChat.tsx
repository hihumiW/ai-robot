import {
  computed,
  ComputedRef,
  inject,
  type InjectionKey,
  readonly,
  ref,
  type Ref,
  unref,
} from "vue";
import { streamChatRequest } from "../api/client";
import type {
  ChatMessage,
  ChatMessagePatch,
  RegenerateChatRequest,
  SendChatRequest,
} from "../types/chat";
import { getRamdomId } from "../utils";
import {
  createConversation as createConversationApi,
  deleteConversation as deleteConversationApi,
  fetchConversations,
  updateConversation as updateConversationApi,
} from "../api/conversations";
import { useQueryClient, useMutation } from "@tanstack/vue-query";
import { getConversationMessages as getConversationMessagesApi } from "../api/messages";
import { normalizeHistoryMessage } from "../adapter/chatAdapter";
import { useToast } from "./useToast";

export interface ChatContext {
  //当前会话id
  currentConversationId: Readonly<Ref<string | null>>;
  //当前会话记录
  chatMessages: Readonly<Ref<readonly ChatMessage[]>>;
  isGenerating: Readonly<Ref<boolean>>;
  lastUserMessageId: ComputedRef<string | void>;
  sendMessage: (content: string) => Promise<void>;
  updateMessage: (messageId: string, patch: ChatMessagePatch) => void;
  setNewChat: () => void;
  selectConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  renameConversation: (conversationId: string, title: string) => Promise<void>;
  stopGenerating: () => void; // 终止生成
  regenerateContent: (
    messageId: string,
    regenerateContent: string,
  ) => Promise<void>;
}

export const CHAT_CONTEXT_INJECT_KEY: InjectionKey<ChatContext> =
  Symbol("ChatContext");

export const useChat = (): ChatContext => {
  const queryClient = useQueryClient();

  const toast = useToast();

  const currentConversationId = ref<string | null>(null);

  const chatMessages = ref<ChatMessage[]>([]);

  const activeAbortController = ref<AbortController | null>(null);

  const appendMessage = (message: ChatMessage) => {
    // 第一步：把新消息追加到响应式消息列表中。
    chatMessages.value.push(message);
  };

  const updateMessage = (messageId: string, patch: ChatMessagePatch) => {
    // 第一步：根据当前消息 ID 找到需要更新的消息。
    const targetMessage = chatMessages.value.find(
      (message) => message.id === messageId,
    );

    if (!targetMessage) {
      return;
    }

    // 第二步：只覆盖本次流式请求产生变化的字段。
    Object.assign(targetMessage, patch);
  };

  const deleteMessage = (messageId: string) => {
    chatMessages.value = chatMessages.value.filter((m) => m.id !== messageId);
  };

  const isGenerating = computed(() =>
    // 第一步：只要存在正在请求或正在吐字的 assistant 消息，就禁用重复发送。
    chatMessages.value.some(
      (message) =>
        message.role === "assistant" &&
        (message.status === "sending" || message.status === "streaming"),
    ),
  );

  const executeChatStream = async (
    requestBody: SendChatRequest | RegenerateChatRequest,
    path: string,
    userMessageId: string,
    assistantMessageId: string,
  ) => {
    activeAbortController.value = new AbortController();
    try {
      let streamedContent = "";
      await streamChatRequest(
        {
          body: requestBody,
          signal: activeAbortController.value.signal,
          onChunk(payload) {
            streamedContent += payload.content;
            updateMessage(assistantMessageId, {
              content: streamedContent,
              status: "streaming",
              errorMessage: "",
            });
          },
          onDone(payload) {
            if (payload.insertedUserMessageId) {
              updateMessage(userMessageId, {
                id: payload.insertedUserMessageId,
              });
            }
            updateMessage(assistantMessageId, {
              id: payload.id,
              content: payload.reply,
              created: payload.created,
              status: "done",
              errorMessage: "",
            });
            queryClient.invalidateQueries({
              queryKey: [fetchConversations.queryKey],
            });
            activeAbortController.value = null;
          },
          onError(payload) {
            updateMessage(assistantMessageId, {
              status: "error",
              errorMessage: payload.message,
            });
            console.error("网络错误或解析错误", payload.message);
            activeAbortController.value = null;
          },
        },
        path,
      );
    } catch (error) {
      activeAbortController.value = null;
      if (error instanceof Error && error.name === "AbortError") {
        const assistantMsg = chatMessages.value.find(
          (m) => m.id === assistantMessageId,
        );
        if (assistantMsg && assistantMsg.content.trim() === "") {
          console.log("未开始吐字即被终止，移除空气泡占位");
          deleteMessage(assistantMessageId);
        } else {
          updateMessage(assistantMessageId, {
            status: "done", // 将状态改为 done，停止 loading 状态
            errorMessage: "", // 清空错误信息
          });
        }
        return;
      }
      updateMessage(assistantMessageId, {
        status: "error",
        errorMessage: error instanceof Error ? error.message : "发送消息失败。",
      });
      console.error("网络错误或解析错误", error);
    }
  };

  const sendMessage = async (content: string) => {
    // 第一步：清理用户输入，空内容不发起请求。
    const trimmedContent = content.trim();

    if (!trimmedContent || isGenerating.value) {
      return;
    }

    //如果当前是新增会话的话， 先建立会话
    if (!currentConversationId.value) {
      // 只取前100字， 作为会话名称
      const { conversation: createdConversation } = await createConversationApi(
        trimmedContent.slice(0, 100),
      );
      currentConversationId.value = createdConversation.id;
      queryClient.invalidateQueries({
        queryKey: [fetchConversations.queryKey],
      });
    }

    const userMessageId = getRamdomId();
    const assistantMessageId = getRamdomId();

    // 第二步：用户消息立即显示，并标记为已完成。
    appendMessage({
      id: userMessageId,
      role: "user",
      content: trimmedContent,
      status: "done",
      created: Date.now(),
    });

    // 第三步：只把用户消息加入请求历史，避免把空的 assistant 占位消息发给模型。
    const requestBody: SendChatRequest = {
      conversationId: currentConversationId.value!,
      content: trimmedContent,
    };

    // 第四步：追加 assistant 占位消息，用 sending 状态触发 ChatMessage loading。
    appendMessage({
      id: assistantMessageId,
      role: "assistant",
      content: "",
      status: "sending",
      created: Date.now(),
    });

    await executeChatStream(
      requestBody,
      "/chat",
      userMessageId,
      assistantMessageId,
    );
  };

  const setNewChat = () => {
    if (!currentConversationId.value) return;
    currentConversationId.value = null;
    chatMessages.value = [];
  };

  //获取会话消息历史
  const {
    mutateAsync: getConversationMessagesAsync,
    isPending: isConversationMessagesFetching,
  } = useMutation({
    mutationFn: getConversationMessagesApi,
  });
  const selectConversation = async (conversationId: string) => {
    if (
      isConversationMessagesFetching.value ||
      !conversationId ||
      conversationId === unref(currentConversationId)
    )
      return;
    try {
      const result = await getConversationMessagesAsync(conversationId);
      currentConversationId.value = conversationId;
      chatMessages.value =
        result.messages?.map((message) => normalizeHistoryMessage(message)) ||
        [];
    } catch (error) {
      console.error("获取会话消息失败", error);
      toast.error(`获取会话消息失败`);
    }
  };

  //删除会话
  const {
    mutateAsync: deleteConversationAsync,
    isPending: isDeleteConversationLoading,
  } = useMutation({
    mutationFn: deleteConversationApi,
  });

  const deleteConversation = async (conversationId: string) => {
    if (!conversationId || isDeleteConversationLoading.value) return;
    try {
      const result = await deleteConversationAsync(conversationId);
      if (!result) throw Error("删除会话失败");
      toast.success("会话删除成功");
      queryClient.invalidateQueries({
        queryKey: [fetchConversations.queryKey],
      });
      if (currentConversationId.value === conversationId) {
        setNewChat();
      }
    } catch (error) {
      console.error(error);
      toast.error("删除会话失败");
    }
  };

  // 重命名会话
  const {
    mutateAsync: renameConversationAsync,
    isPending: isRenameConversationLoading,
  } = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      updateConversationApi(id, title),
  });

  const renameConversation = async (conversationId: string, title: string) => {
    if (!conversationId || !title.trim() || isRenameConversationLoading.value)
      return;
    try {
      const result = await renameConversationAsync({
        id: conversationId,
        title: title.trim(),
      });
      if (!result) throw Error("重命名会话失败");
      toast.success("会话重命名成功");
      queryClient.invalidateQueries({
        queryKey: [fetchConversations.queryKey],
      });
    } catch (error) {
      console.error(error);
      toast.error("重命名会话失败");
    }
  };

  // 终止生成
  const stopGenerating = () => {
    if (activeAbortController.value) {
      activeAbortController.value.abort();
      activeAbortController.value = null;
    }
  };

  //重新生成
  const lastUserMessageId = computed(() => {
    const userMessages = unref(chatMessages).filter(
      (message) => message.role === "user",
    );
    return userMessages[userMessages.length - 1]?.id;
  });
  const regenerateContent: ChatContext["regenerateContent"] = async (
    messageId: string,
    regenerateContent: string,
  ) => {
    const trimmedRegenerateContent = regenerateContent.trim();
    const conversationId = unref(currentConversationId);
    if (!trimmedRegenerateContent || !conversationId) return;
    const messageIndex = chatMessages.value.findIndex(
      (message) => message.id === messageId,
    );
    if (
      messageIndex === -1 ||
      chatMessages.value[messageIndex].content === trimmedRegenerateContent
    )
      return;
    //截断后续数组
    chatMessages.value = chatMessages.value.slice(0, messageIndex);

    const userMessageId = getRamdomId();
    const assistantMessageId = getRamdomId();
    //创建新的用户消息
    appendMessage({
      id: userMessageId,
      role: "user",
      content: trimmedRegenerateContent,
      status: "done",
      created: Date.now(),
    });
    //创建assisant 消息
    appendMessage({
      id: assistantMessageId,
      role: "assistant",
      content: "",
      status: "sending",
      created: Date.now(),
    });
    
    await executeChatStream(
      {
        messageId,
        conversationId,
        regenerateContent: trimmedRegenerateContent,
      },
      "/regenerateChat",
      userMessageId,
      assistantMessageId,
    );
  };

  return {
    currentConversationId: readonly(currentConversationId),
    chatMessages: readonly(chatMessages),
    isGenerating: readonly(isGenerating),
    lastUserMessageId,
    sendMessage,
    updateMessage,
    setNewChat,
    selectConversation,
    deleteConversation,
    renameConversation,
    stopGenerating,
    regenerateContent,
  };
};

export const useChatContext = (): ChatContext => {
  const context = inject(CHAT_CONTEXT_INJECT_KEY);

  if (!context) {
    throw new Error("useChatContext must be used under ChatPanel provider.");
  }

  return context;
};
