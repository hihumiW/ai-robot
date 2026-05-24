import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { errorResponse } from "../utils/apiResponse.js";
import { AppError } from "../utils/AppError.js";

export const errorMiddleware: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next,
) => {
  console.error(error);

  if (error instanceof AppError) {
    return res
      .status(error.statusCode)
      .json(errorResponse(error.code, error.message, error.details));
  }

  if (error instanceof ZodError) {
    return res
      .status(400)
      .json(
        errorResponse("VALIDATION_ERROR", "Invalid request.", error.flatten()),
      );
  }

  return res
    .status(500)
    .json(errorResponse("INTERNAL_SERVER_ERROR", "Internal server error."));
};
