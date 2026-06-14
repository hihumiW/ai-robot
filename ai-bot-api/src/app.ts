import 'dotenv/config';
import express from "express";
import { chatRouter } from "./routes/chatRoutes.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import { conversationRouter } from "./routes/conversationRoutes.js";
import { messageRouter } from "./routes/messageRoutes.js";


export const app = express();

//防止包含base64的内容时，超出容量
app.use(express.json({ limit: "20mb" }));

app.use("/api", chatRouter);
app.use("/api", conversationRouter);
app.use("/api", messageRouter)

app.use(errorMiddleware);
