import { Router } from "express";
import { postChat, regenerateChat, testChat } from "../controllers/chatController.js";

export const chatRouter = Router();

chatRouter.post("/chat", postChat);

chatRouter.post('/regenerateChat', regenerateChat)

chatRouter.post('/test', testChat)