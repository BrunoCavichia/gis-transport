import { ApiResponse } from "@/lib/types";

export function successResponse<T>(data: T): ApiResponse<T> {
  return {
    timestamp: new Date().toISOString(),
    success: true,
    data,
  };
}

export function errorResponse(
  code: string,
  message: string,
  details?: string,
): ApiResponse<never> {
  return {
    timestamp: new Date().toISOString(),
    success: false,
    error: { code, message, details },
  };
}
