import { z } from "zod";

export const chatRoleSchema = z.enum(["user", "assistant", "system"]);

export const chatMessageSchema = z.object({
  role: chatRoleSchema,
  content: z.string().trim().min(1, "Message content is required."),
});

export const chatRequestSchema = z.object({
  conversationId : z.string().nonempty(),
  content : z.string().nonempty(),
});

export const getConversationMessageParamsSchema =  z.object({
  conversationId : z.string().nonempty(),
}); ;

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;

