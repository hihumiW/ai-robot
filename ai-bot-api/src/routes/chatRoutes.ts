import { Router } from "express";
import { postChat, regenerateChat } from "../controllers/chatController.js";

export const chatRouter = Router();

chatRouter.post("/chat", postChat);

chatRouter.post('/regenerateChat', regenerateChat)