import type {
  ApiErrorCode,
  ApiErrorResponse,
  ApiSuccessResponse,
} from "../types/api.js";

export const successResponse = <TData>(
  data: TData,
  message?: string,
): ApiSuccessResponse<TData> => ({
  ok: true,
  data,
  ...(message ? { message } : {}),
});

export const errorResponse = (
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): ApiErrorResponse => ({
  ok: false,
  code,
  message,
  ...(details ? { details } : {}),
});
