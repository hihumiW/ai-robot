export type ChatRole = "user" | "assistant" | "system";

export type ChatMessageStatus = "sending" | "streaming" | "done" | "error";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  status: ChatMessageStatus;
  created: number;
  errorMessage?: string;
}

export type ChatMessagePatch = Partial<
  Pick<ChatMessage, "id" | "content" | "status" | "created" | "errorMessage">
>;

export interface SendChatRequest {
  conversationId: string;
  content: string;
}

export interface RegenerateChatRequest {
  conversationId: string;
  messageId: string;
  regenerateContent: string;
}

export interface SendChatResponse {
  id: string;
  created: number;
  reply: string;
}

export interface ChatStreamChunkEvent {
  content: string;
}

export interface ChatStreamDoneEvent {
  id: string;
  created: number;
  reply: string;
  isNewConversation?: boolean;
  generatedTitle?: string;
  insertedUserMessageId : string;
}

export interface ChatStreamErrorEvent {
  message: string;
}
