import { ChatRole } from "./chat";

export interface MessageDto {
  id: string;
  conversationId: string;
  role: ChatRole;
  content: string;
  sequenceNo: number;
  createdAt: string;
}

export interface GetConversationMessageResponseDto {
  messages: MessageDto[];
}