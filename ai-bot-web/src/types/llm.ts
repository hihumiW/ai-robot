import type { ChatRole } from './chat';

export interface LlmChatMessage {
  role: ChatRole;
  content: string;
}

export interface LlmChatCompletionRequest {
  model: string;
  messages: LlmChatMessage[];
  stream: boolean;
}
