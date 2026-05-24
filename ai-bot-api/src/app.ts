import express from "express";
import { chatRouter } from "./routes/chatRoutes.js";
import { testRouter } from "./routes/testRoutes.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";

export const app = express();

app.use(express.json());

app.use("/api", testRouter);
app.use("/api", chatRouter);

app.use(errorMiddleware);
