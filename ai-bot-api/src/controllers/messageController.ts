import { RequestHandler } from "express";
import {
  GetConversationMessageParamsDto,
  GetConversationMessageResponseDto,
} from "../types/conversation.js";
import { getConversationMessageParamsSchema } from "../validators/chatSchemas.js";
import { AppError } from "../utils/AppError.js";
import { listMessagesByConversationId } from "../repositories/messageRepository.js";
import { successResponse } from "../utils/apiResponse.js";
import { ApiResponse } from "../types/api.js";

export const getConversationMessages: RequestHandler<
  GetConversationMessageParamsDto,
  ApiResponse<GetConversationMessageResponseDto>
> = async (request, response, next) => {
  try {
    const parsedParams = getConversationMessageParamsSchema.safeParse(
      request.params,
    );
    if (!parsedParams.success) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Invalid chat request.",
        parsedParams.error.flatten(),
      );
    }
    const {  conversationId } = parsedParams.data;
    const messageList = await listMessagesByConversationId(conversationId);
    return response.json(successResponse({messages : messageList}));
  } catch (error) {
    next(error);
  }
};
