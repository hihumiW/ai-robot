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


// 删除会话
export const deleteConversation = async (conversationId : string) => {
    return apiRequest<boolean>(`/conversations/${conversationId}`, {
        method : 'DELETE'
    });
}

// 重命名会话
export const updateConversation = async (conversationId: string, title: string) => {
    return apiRequest<boolean, { title: string }>(`/conversations/${conversationId}`, {
        method: 'PUT',
        body: { title }
    });
}