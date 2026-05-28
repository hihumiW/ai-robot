import { GetConversationMessageResponseDto } from "../types/messages"
import { apiRequest } from "./client"

export const getConversationMessages = async(conversationId : string) => {
    return apiRequest<GetConversationMessageResponseDto>(`/conversations/${conversationId}/messages`)
}