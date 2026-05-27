import { Router } from "express";
import { getConversations, postConversation } from "../controllers/conversationController.js";

export const conversationRouter = Router();

// 1. 获取会话列表
conversationRouter.get('/conversations', getConversations);

// 2. 创建新的会话
conversationRouter.post('/conversations', postConversation);
