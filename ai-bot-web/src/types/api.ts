export interface ApiSuccessResponse<TData> {
  ok: true;
  data: TData;
  message?: string;
}

export interface ApiErrorResponse<TError = unknown> {
  ok: false;
  data?: TError;
  message: string;
}

export type ApiResponse<TData, TError = unknown> =
  | ApiSuccessResponse<TData>
  | ApiErrorResponse<TError>;

export interface ApiRequestOptions<TBody = unknown>
  extends Omit<RequestInit, 'body'> {
  body?: TBody;
}
