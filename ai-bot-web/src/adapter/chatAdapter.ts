import type { ChatMessage } from '../types/chat';
import type { LlmChatMessage } from '../types/llm';

export const normalizeLlmChatMessages = (
  messages: readonly ChatMessage[]
): LlmChatMessage[] => {
  return messages.map((message) => ({
    role: message.role,
    content: message.content
  }));
};
