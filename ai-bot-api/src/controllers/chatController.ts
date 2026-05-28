import type { RequestHandler, Response } from "express";
import type { ApiResponse } from "../types/api.js";
import type { ChatMessageDto, ChatRequestDto, ChatResponseDto } from "../types/chat.js";
import { AppError } from "../utils/AppError.js";
import { openChatCompletionStream } from "../services/lmStudioClient.js";
import { chatRequestSchema } from "../validators/chatSchemas.js";
import { createMessage, listMessagesByConversationId } from "../repositories/messageRepository.js";
import { MessageDto } from "../types/conversation.js";

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

const toChatMessageDto = (message : MessageDto) : ChatMessageDto  => {
  return {
    role : message.role,
    content : message.content
  }
}

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
      role : 'user',
      content 
    });

    if(!insertedUserMessage){
      throw new AppError(500, "INTERNAL_SERVER_ERROR", "插入用户消息失败")
    }
    
    //再查询出当前会话的所有历史消息
     const historyMessages = await listMessagesByConversationId(conversationId);
    // 将数据库返回的 MessageDto 转换为 LLM需要的 ChatMessageDto
     const llmHistoryMessages = historyMessages.map(message => toChatMessageDto(message));

    // 第二步：先连通 LM Studio，只有模型流可读时才开始写浏览器 SSE 响应。
    const completionStream = await openChatCompletionStream(
      llmHistoryMessages,
    );

    // 第三步：设置 SSE 响应头，让浏览器可以边收边渲染。
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    let assistantReply = "";
    let completionId = `chatcmpl-${Date.now()}`;
    let created = Math.floor(Date.now() / 1000);

    // 第四步：逐块读取模型增量文本，并立即转发给前端。
    for await (const delta of completionStream) {
      assistantReply += delta.content;
      completionId = delta.id ?? completionId;
      created = delta.created ?? created;

      writeSseEvent(res, "chunk", {
        content: delta.content,
      });
    }

    // 第五步：模型输出结束后，把完整回复发给前端，为后续持久化预留完整文本。
    writeSseEvent(res, "done", {
      id: completionId,
      created,
      reply: assistantReply,
    });

   const insertedAssistantMessage = await createMessage({
      conversationId,
      role : 'assistant',
      content : assistantReply
    });

    if(!insertedAssistantMessage.id){
      throw new AppError(500, 'INTERNAL_SERVER_ERROR', '插入assistant消息失败');
    }

    return res.end();
  } catch (error) {
    // 第六步：如果流已经开始，只能通过 SSE error 事件通知前端。
    if (res.headersSent) {
      const message =
        error instanceof Error ? error.message : "模型响应流处理失败。";

      writeSseEvent(res, "error", { message });
      return res.end();
    }

    // 第七步：如果还没开始 SSE，就交给统一错误中间件返回 JSON 错误。
    return next(error);
  }
};

