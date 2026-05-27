import { z } from "zod";
import { chatRoleSchema } from "./chatSchemas.js";

// 第一步：校验创建会话的请求体，标题可以不传。
export const createDemoConversationSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
});

// 第二步：校验创建消息的请求体，role 只能是系统支持的三种角色。
export const createDemoMessageSchema = z.object({
  role: chatRoleSchema,
  content: z.string().trim().min(1, "Message content is required."),
});

