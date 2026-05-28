import express from "express";
import { chatRouter } from "./routes/chatRoutes.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import { conversationRouter } from "./routes/conversationRoutes.js";
import { messageRouter } from "./routes/messageRoutes.js";

export const app = express();

app.use(express.json());

app.use("/api", chatRouter);
app.use("/api", conversationRouter);
app.use("/api", messageRouter)

app.use(errorMiddleware);
