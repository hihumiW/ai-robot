export type ApiErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "LLM_SERVICE_ERROR"
  | "INTERNAL_SERVER_ERROR";

export interface ApiSuccessResponse<TData> {
  ok: true;
  data: TData;
  message?: string;
}

export interface ApiErrorResponse {
  ok: false;
  message: string;
  code: ApiErrorCode;
  details?: unknown;
}

export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiErrorResponse;
