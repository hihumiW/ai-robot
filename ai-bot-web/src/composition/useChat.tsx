import { computed, inject, type InjectionKey, readonly, ref, type Ref } from 'vue';
import { streamChatRequest } from '../api/client';
import { normalizeLlmChatMessages } from '../adapter/chatAdapter';
import type {
  ChatMessage,
  ChatMessagePatch,
  SendChatRequest
} from '../types/chat';
import { getRamdomId } from '../utils';

export interface ChatContext {
  chatMessages: Readonly<Ref<readonly ChatMessage[]>>;
  isGenerating: Readonly<Ref<boolean>>;
  sendMessage: (content: string) => Promise<void>;
  updateMessage: (messageId: string, patch: ChatMessagePatch) => void;
}

export const CHAT_CONTEXT_INJECT_KEY: InjectionKey<ChatContext> =
  Symbol('ChatContext');

export const useChat = (): ChatContext => {
  const chatMessages = ref<ChatMessage[]>([]);

  const appendMessage = (message: ChatMessage) => {
    // 第一步：把新消息追加到响应式消息列表中。
    chatMessages.value.push(message);
  };

  const updateMessage = (messageId: string, patch: ChatMessagePatch) => {
    // 第一步：根据当前消息 ID 找到需要更新的消息。
    const targetMessage = chatMessages.value.find(
      (message) => message.id === messageId
    );

    if (!targetMessage) {
      return;
    }

    // 第二步：只覆盖本次流式请求产生变化的字段。
    Object.assign(targetMessage, patch);
  };

  const isGenerating = computed(() =>
    // 第一步：只要存在正在请求或正在吐字的 assistant 消息，就禁用重复发送。
    chatMessages.value.some(
      (message) =>
        message.role === 'assistant' &&
        (message.status === 'sending' || message.status === 'streaming')
    )
  );

  const sendMessage = async (content: string) => {
    // 第一步：清理用户输入，空内容不发起请求。
    const trimmedContent = content.trim();

    if (!trimmedContent || isGenerating.value) {
      return;
    }

    const userMessageId = getRamdomId();
    const assistantMessageId = getRamdomId();

    // 第二步：用户消息立即显示，并标记为已完成。
    appendMessage({
      id: userMessageId,
      role: 'user',
      content: trimmedContent,
      status: 'done',
      created: Date.now()
    });

    // 第三步：只把用户消息加入请求历史，避免把空的 assistant 占位消息发给模型。
    const requestBody: SendChatRequest = {
      history: normalizeLlmChatMessages(chatMessages.value)
    };

    // 第四步：追加 assistant 占位消息，用 sending 状态触发 ChatMessage loading。
    appendMessage({
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      status: 'sending',
      created: Date.now()
    });

    try {
      let streamedContent = '';

      await streamChatRequest({
        body: requestBody,
        onChunk: (payload) => {
          // 第五步：收到第一个 token 后进入 streaming，并持续累加文本。
          streamedContent += payload.content;
          updateMessage(assistantMessageId, {
            content: streamedContent,
            status: 'streaming',
            errorMessage: ''
          });
        },
        onDone: (payload) => {
          // 第六步：流结束后同步服务端返回的完整内容和元数据。
          updateMessage(assistantMessageId, {
            id: payload.id,
            content: payload.reply,
            status: 'done',
            created: payload.created,
            errorMessage: ''
          });
        },
        onError: (payload) => {
          // 第七步：服务端在流中报错时，保留 assistant 消息并展示错误。
          updateMessage(assistantMessageId, {
            status: 'error',
            errorMessage: payload.message
          });
        }
      });
    } catch (error) {
      // 第八步：网络错误或解析错误统一落到 assistant 的 error 状态。
      updateMessage(assistantMessageId, {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : '发送消息失败。'
      });
    }
  };

  return {
    chatMessages: readonly(chatMessages),
    isGenerating: readonly(isGenerating),
    sendMessage,
    updateMessage
  };
};

export const useChatContext = (): ChatContext => {
  const context = inject(CHAT_CONTEXT_INJECT_KEY);

  if (!context) {
    throw new Error('useChatContext must be used under ChatPanel provider.');
  }

  return context;
};
