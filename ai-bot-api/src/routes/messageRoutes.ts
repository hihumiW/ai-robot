import { Router } from 'express';
import { getConversationMessages } from '../controllers/messageController.js';

export const messageRouter = Router();

messageRouter.get('/conversations/:conversationId/messages', getConversationMessages);