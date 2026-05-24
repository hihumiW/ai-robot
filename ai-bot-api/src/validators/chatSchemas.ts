import { z } from "zod";

export const chatRoleSchema = z.enum(["user", "assistant", "system"]);

export const chatMessageSchema = z.object({
  role: chatRoleSchema,
  content: z.string().trim().min(1, "Message content is required."),
});

export const chatRequestSchema = z.object({
  history: z
    .array(chatMessageSchema)
    .min(1, "History array must contain at least one message."),
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
