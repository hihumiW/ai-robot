import { Router } from "express";
import { deleteConversation, getConversations, postConversation, putConversation } from "../controllers/conversationController.js";

export const conversationRouter = Router();

// 1. 获取会话列表
conversationRouter.get('/conversations', getConversations);

// 2. 创建新的会话
conversationRouter.post('/conversations', postConversation);

// 3. 删除会话
conversationRouter.delete('/conversations/:conversationId', deleteConversation);

// 4. 重命名会话
conversationRouter.put('/conversations/:conversationId', putConversation);