import {z} from 'zod';


export const createConversationSchema = z.object({
    title : z.string().trim().min(1).max(100).optional()
});


export const deleteConversationByIdSchema = z.object({
    conversationId : z.string().nonempty(),
})

export const updateConversationSchema = z.object({
    title : z.string().trim().min(1, '会话标题不能为空').max(100, '会话标题最多为100个字符')
})