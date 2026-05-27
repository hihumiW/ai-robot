import express from "express";
import { chatRouter } from "./routes/chatRoutes.js";
import { testRouter } from "./routes/testRoutes.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import { conversationRouter } from "./routes/conversationRoutes.js";

export const app = express();

app.use(express.json());

app.use("/api", testRouter);
app.use("/api", chatRouter);
app.use("/api", conversationRouter);

app.use(errorMiddleware);
