export type ChatRole = "user" | "assistant" | "system";

export type ChatMessageStatus = "sending" | "streaming" | "done" | "error";

export type ChatReasoningEffort = 'none' | "low" | "medium" | "high";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  images?: readonly string[];
  status: ChatMessageStatus;
  created: number;
  errorMessage?: string;
  thinkingContent?: string;
  isThinking?: boolean;
}

export type ChatMessagePatch = Partial<
  Pick<ChatMessage, "id" | "content" | "status" | "created" | "errorMessage" | "images" | "thinkingContent" | "isThinking">
>;

export interface SendChatRequest {
  conversationId: string;
  content: string;
  images?: string[];
  // 思考等级
  reasoningEffort?: ChatReasoningEffort;
}

export interface RegenerateChatRequest {
  conversationId: string;
  messageId: string;
  regenerateContent: string;
  // 思考等级
  reasoningEffort?: ChatReasoningEffort;
}

export interface SendChatResponse {
  id: string;
  created: number;
  reply: string;
}

export interface ChatStreamChunkEvent {
  content: string;
  reasoning_content?: string;
}

export interface ChatStreamDoneEvent {
  id: string;
  created: number;
  reply: string;
  isNewConversation?: boolean;
  generatedTitle?: string;
  insertedUserMessageId: string;
}

export interface ChatStreamErrorEvent {
  message: string;
}
