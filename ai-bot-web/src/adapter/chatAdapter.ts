import dayjs from 'dayjs';
import type { ChatMessage } from '../types/chat';
import type { LlmChatMessage } from '../types/llm';
import { MessageDto } from '../types/messages';

export const normalizeLlmChatMessages = (
  messages: readonly ChatMessage[]
): LlmChatMessage[] => {
  return messages.map((message) => ({
    role: message.role,
    content: message.content
  }));
};

/** 将服务端的历史消息， 转换为客户端的历史消息结构 */
export const normalizeHistoryMessage = (messageDto : MessageDto) : ChatMessage => {
  return {
    id : messageDto.id,
    role : messageDto.role,
    content : messageDto.content,
    images: messageDto.images,
    // 后端返回来的createds是 ISO格式的时间字符串
    created : dayjs(messageDto.createdAt).unix(),
    // 历史消息， 默认都成功
    status : 'done',
  }
}
