import { RequestHandler } from "express";
import { ApiResponse } from "../types/api.js";

import type {
  ConversationDto,
  CreateConversationResponseDto,
  DeleteConversationByIdParamsDto,
  GetConversationsResponseDto,
} from "../types/conversation.js";
import {
  createConversation,
  deleteConversationById,
  listConversations,
  updateConversationTitle,
} from "../repositories/conversationRepository.js";
import { successResponse } from "../utils/apiResponse.js";
import {
  createConversationSchema,
  deleteConversationByIdSchema,
  updateConversationSchema,
} from "../validators/conversationSchema.js";
import { AppError } from "../utils/AppError.js";

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
  Record<string, never>,
  ApiResponse<GetConversationsResponseDto>
> = async (request, response, next) => {
  try {
    const conversations = await listConversations();

    return response.json(successResponse({ conversations: conversations }));
  } catch (error) {
    next(error);
  }
};


export const deleteConversation : RequestHandler<
  DeleteConversationByIdParamsDto,
  ApiResponse<boolean>
> = async (request, response, next) => {
  try {
    const parsedParams =  deleteConversationByIdSchema.safeParse(request.params);
    console.log('geggg', parsedParams.data);
    if(!parsedParams.success){
      throw new AppError(400, 'BAD_REQUEST', "无效的删除参数", parsedParams.error.flatten())
    }
    const result = await deleteConversationById(parsedParams.data.conversationId);
    if(!result){
      throw new AppError(500, 'INTERNAL_SERVER_ERROR', '删除会话失败');
    }
    return response.json(successResponse(true, '会话删除成功'));
  } catch (error) {
    next(error);
  }
}

// 修改会话名称控制器
export const putConversation: RequestHandler<
  DeleteConversationByIdParamsDto,
  ApiResponse<boolean>
> = async (request, response, next) => {
  try {
    const parsedParams = deleteConversationByIdSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw new AppError(400, 'BAD_REQUEST', "无效的会话参数", parsedParams.error.flatten());
    }

    const parsedBody = updateConversationSchema.safeParse(request.body);
    if (!parsedBody.success) {
      throw new AppError(400, 'BAD_REQUEST', "会话名称不符合规范", parsedBody.error.flatten());
    }

    const result = await updateConversationTitle(
      parsedParams.data.conversationId,
      parsedBody.data.title
    );
    if (!result) {
      throw new AppError(500, 'INTERNAL_SERVER_ERROR', "更新会话名称失败");
    }

    return response.json(successResponse(true, "会话重命名成功"));
  } catch (e) {
    next(e);
  }
}