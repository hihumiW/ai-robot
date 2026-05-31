import type { RequestHandler, Response } from "express";
import type { ApiResponse } from "../types/api.js";
import type {
  ChatMessageDto,
  ChatRequestDto,
  ChatResponseDto,
  RegenerateChatRequestDto,
} from "../types/chat.js";
import { AppError } from "../utils/AppError.js";
import {
  createChatCompletion,
  openChatCompletionStream,
} from "../services/lmStudioClient.js";
import {
  chatRequestSchema,
  regenerateChatRequestSchema,
} from "../validators/chatSchemas.js";
import {
  createMessage,
  deleteMessageByIds,
  listMessagesByConversationId,
} from "../repositories/messageRepository.js";
import { MessageDto } from "../types/conversation.js";
import { getChatSummaryTitlePrompt } from "../utils/prompt.js";
import {
  updateConversationTitle,
  updateConversationUpdateAt,
} from "../repositories/conversationRepository.js";

type ChatStreamEvent = "chunk" | "done" | "error";

const writeSseEvent = (
  res: Response,
  eventName: ChatStreamEvent,
  payload: unknown,
) => {
  // 第一步：按 SSE 格式写入事件名和 JSON 数据，空行表示事件结束。
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const toChatMessageDto = (message: MessageDto): ChatMessageDto => {
  return {
    role: message.role,
    content: message.content,
  };
};

const setSseRespHeader = (res: Response) => {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
};

interface ChatStreamOptions {
  res: Response;
  conversationId: string;
  llmHistoryMessages: ChatMessageDto[];
  insertedUserMessageId: string;
  isNewConversation?: boolean;
  originalUserPrompt?: string; // postChat 时传，用来生成标题
}
const handleStream = async ({
  res,
  conversationId,
  llmHistoryMessages,
  insertedUserMessageId,
  isNewConversation = false,
  originalUserPrompt,
}: ChatStreamOptions) => {
  // 1. 注册连接关闭监听
  let isAborted = false;
  res.on("close", () => {
    //如果不是手动write.end， 那么肯定是用户停止了生成
    if (!res.writableEnded) {
      isAborted = true;
    }
  });

  try {
    // 2. 连接模型并设置 SSE 响应头
    const completionStream = await openChatCompletionStream(llmHistoryMessages);
    setSseRespHeader(res);
    let assistantReply = "";
    let completionId = `chatcmpl-${Date.now()}`;
    let created = Math.floor(Date.now() / 1000);

    // 3. 循环输出 Chunk
    for await (const delta of completionStream) {
      if (isAborted) {
        break;
      }
      assistantReply += delta.content;
      completionId = delta.id ?? completionId;
      created = delta.created ?? created;
      //给前端吐字
      writeSseEvent(res, "chunk", {
        content: delta.content,
      });
    }

    if (assistantReply.trim() !== "") {
      // 4. 保存模型回复
      const insertedAssistantMessage = await createMessage({
        conversationId,
        role: "assistant",
        content: assistantReply,
      });
      if (!insertedAssistantMessage) {
        throw new AppError(500, "INTERNAL_SERVER_ERROR", "插入AI助手消息失败");
      }
    }

    // 5. 更新会话元数据（时间/标题）
    let generatedTitle = null;
    try {
      if (assistantReply.trim() !== "") {
        if (
          isNewConversation &&
          assistantReply &&
          conversationId &&
          originalUserPrompt
        ) {
          const summaryPrompt = getChatSummaryTitlePrompt(
            originalUserPrompt,
            assistantReply,
          );
          const summaryResponse = await createChatCompletion([
            {
              role: "user",
              content: summaryPrompt,
            },
          ]);
          generatedTitle = summaryResponse.choices[0]?.message?.content?.trim();
          await updateConversationTitle(conversationId, generatedTitle);
        }
        //如果不是新会话， 那么要更新一下会话时间
        if (!isNewConversation) {
          await updateConversationUpdateAt(conversationId);
        }
      }
    } catch (error) {
      console.error("更新会话时间或会话标题失败", error);
    }
    // 6. 发送完成事件并结束
    writeSseEvent(res, "done", {
      id: completionId,
      created,
      reply: assistantReply,
      isNewConversation,
      generatedTitle,
      insertedUserMessageId,
    });

    return res.end();
  } catch (error) {
    // 统一处理流中抛出的异常
    if (res.headersSent) {
      const message =
        error instanceof Error ? error.message : "模型响应流处理失败";
      writeSseEvent(res, "error", { message });
      return res.end();
    }
    // 未开始发流时，继续抛出让外部控制器捕获
    throw error;
  }
};

export const postChat: RequestHandler<
  Record<string, never>,
  ApiResponse<ChatResponseDto> | void,
  ChatRequestDto
> = async (req, res, next) => {
  try {
    // 第一步：校验前端传入的聊天历史，避免把非法消息发给模型。
    const parsedBody = chatRequestSchema.safeParse(req.body);

    if (!parsedBody.success) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Invalid chat request.",
        parsedBody.error.flatten(),
      );
    }

    const { conversationId, content } = parsedBody.data;

    //将当前的对话新增到历史记录中
    const insertedUserMessage = await createMessage({
      conversationId,
      role: "user",
      content,
    });

    if (!insertedUserMessage) {
      throw new AppError(500, "INTERNAL_SERVER_ERROR", "插入用户消息失败");
    }

    //再查询出当前会话的所有历史消息
    const historyMessages = await listMessagesByConversationId(conversationId);
    // 将数据库返回的 MessageDto 转换为 LLM需要的 ChatMessageDto
    const llmHistoryMessages = historyMessages.map((message) =>
      toChatMessageDto(message),
    );

    await handleStream({
      res,
      conversationId,
      llmHistoryMessages,
      insertedUserMessageId: insertedUserMessage.id,
      originalUserPrompt: content,
      isNewConversation: historyMessages.length === 1,
    });
  } catch (error) {
    // 第七步：如果还没开始 SSE，就交给统一错误中间件返回 JSON 错误。
    return next(error);
  }
};

//重新生成消息
export const regenerateChat: RequestHandler<
  Record<string, never>,
  ApiResponse<ChatResponseDto> | void,
  RegenerateChatRequestDto
> = async (req, res, next) => {
  try {
    const parsedBody = regenerateChatRequestSchema.safeParse(req.body);
    if (!parsedBody.success) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "参数校验失败",
        parsedBody.error.flatten(),
      );
    }
    const { conversationId, messageId, regenerateContent } = parsedBody.data;
    //查询出该会话的所有历史
    const historyMessages = await listMessagesByConversationId(conversationId);
    // 删除更新会话后面的所有记录
    const currentMessageIndex = historyMessages.findIndex(
      (message) => message.id === messageId,
    );
    const deleteMessageIds = historyMessages
      .filter((_, idx) => idx >= currentMessageIndex)
      .map((message) => message.id);
    if (currentMessageIndex === -1 || !deleteMessageIds.length) {
      throw new AppError(
        500,
        "INTERNAL_SERVER_ERROR",
        "没有找到重新生成的消息",
      );
    }
    console.log(deleteMessageIds, "deleteMessageIds");
    //删除当前消息后面的ids
    const result = await deleteMessageByIds(deleteMessageIds);
    if (!result) {
      throw new AppError(500, "INTERNAL_SERVER_ERROR", "删除旧消息失败");
    }

    //插入当前更新后的消息
    const insertedUserMessage = await createMessage({
      conversationId,
      role: "user",
      content: regenerateContent,
    });
    if (!insertedUserMessage) {
      throw new AppError(500, "INTERNAL_SERVER_ERROR", "插入用户更新消息失败");
    }
    const llmHistoryMessages = historyMessages
      .slice(0, currentMessageIndex)
      .map((i) => toChatMessageDto(i))
      .concat(toChatMessageDto(insertedUserMessage));

    await handleStream({
      res,
      conversationId,
      insertedUserMessageId: insertedUserMessage.id,
      llmHistoryMessages: llmHistoryMessages,
      isNewConversation: false,
    });
  } catch (error) {
    return next(error);
  }
};
