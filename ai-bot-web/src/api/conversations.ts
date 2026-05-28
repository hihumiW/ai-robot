import type { CreateConversationRequestDto, CreateConversationResponseDto, GetConversationsResponseDto } from "../types/conversations";
import { apiRequest } from "./client";

// 获取会话列表
export const fetchConversations = async () => {
    return apiRequest<GetConversationsResponseDto>('/conversations', {
        method : 'GET',
    });
}
fetchConversations.queryKey = 'conversations';

// 创建新的会话
export const createConversation = async (title? : string) => {
    return apiRequest<CreateConversationResponseDto, CreateConversationRequestDto>('/conversations', {
        method : 'POST',
        body : { title }
    });
}
