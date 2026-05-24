import { Router } from "express";
import { getTest } from "../controllers/testController.js";

export const testRouter = Router();

testRouter.get("/test", getTest);
