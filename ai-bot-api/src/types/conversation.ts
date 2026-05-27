import type { ChatRole } from "./chat.js";



export interface MessageDto {
  id: string;
  conversationId: string;
  role: ChatRole;
  content: string;
  sequenceNo: number;
  createdAt: string;
}

export interface CreateDemoConversationRequestDto {
  title?: string;
}

export interface CreateDemoMessageRequestDto {
  role: ChatRole;
  content: string;
}

export interface CreateDemoConversationResponseDto {
  conversation: ConversationDto;
}

export interface CreateDemoMessageResponseDto {
  message: MessageDto;
}

export interface ListDemoMessagesResponseDto {
  messages: MessageDto[];
}


//------my Code

// 一个完整的会话数据
export interface ConversationDto{
  id : string;
  title : string | null;
  createAt: string;
  updateAt: string;
}

// 创建会话时的入参
export interface CreateConversationRequestDto{
  title? : string;
}

// 创建会话时的出参
export interface CreateConversationResponseDto{
  conversation : ConversationDto
}


// 查询会话列表出参
export interface GetConversationsResponseDto{
  conversations : ConversationDto[];
}