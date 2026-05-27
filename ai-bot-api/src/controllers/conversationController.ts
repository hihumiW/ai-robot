import { RequestHandler } from "express";
import { ApiResponse } from "../types/api.js";

import type {
  ConversationDto,
  CreateConversationResponseDto,
  GetConversationsResponseDto,
} from "../types/conversation.js";
import {
  createConversation,
  listConversations,
} from "../repositories/conversationRepository.js";
import { successResponse } from "../utils/apiResponse.js";
import { createConversationSchema } from "../validators/conversationSchema.js";

//创建一个会话控制器
export const postConversation: RequestHandler<
  Record<string, never>,
  ApiResponse<CreateConversationResponseDto>
> = async (request, response, next) => {
  try {

    //1. 对 request.body 进行校验
    const parsedBody = createConversationSchema.parse(request.body);

    // 2.将title 传递给 repository 进行数据库持久操作
    const conversation = await createConversation(parsedBody.title);

    // 3.返回查询结果
    return response.json(successResponse({ conversation }));
  } catch (e) {
    next(e);
  }
};

//获取会话列表控制器
export const getConversations: RequestHandler<
  null,
  ApiResponse<GetConversationsResponseDto>
> = async (request, response, next) => {
  try {
    const conversations = await listConversations();

    return response.json(successResponse({ conversations: conversations }));
  } catch (error) {
    next(error);
  }
};
