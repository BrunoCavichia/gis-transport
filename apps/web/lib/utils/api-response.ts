import { ApiResponse } from "@/lib/types";

export function successResponse<T>(data: T): ApiResponse<T> {
  return {
    timestamp: new Date().toISOString(),
    data,
  };
}

export function errorResponse(
  code: string,
  message: string,
  details?: string
): ApiResponse<never> {
  return {
    timestamp: new Date().toISOString(),
    error: { code, message, details },
  };
}
