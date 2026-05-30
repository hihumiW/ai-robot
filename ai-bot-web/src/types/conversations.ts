// 一个完整的会话数据
export interface ConversationDto{
  id : string;
  title : string | null;
  createAt: string;
  updateAt: string;
}


// 查询会话列表出参
export interface GetConversationsResponseDto{
  conversations : ConversationDto[];
}

// 创建会话时的入参
export interface CreateConversationRequestDto{
  title? : string;
}

// 创建会话时的出参
export interface CreateConversationResponseDto{
  conversation : ConversationDto
}

