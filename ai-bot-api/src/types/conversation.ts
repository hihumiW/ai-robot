import type { ChatRole } from "./chat.js";

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

export interface MessageDto {
  id: string;
  conversationId: string;
  role: ChatRole;
  content: string;
  sequenceNo: number;
  createdAt: string;
}

export interface GetConversationMessageParamsDto{
  conversationId : string;
}

export interface GetConversationMessageResponseDto {
  messages: MessageDto[];
}



export interface DeleteConversationByIdParamsDto {
  conversationId : string;
}

