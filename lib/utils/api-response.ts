import { ApiResponse, ApiError } from '@/lib/types/api-types';

const API_VERSION = '1.0.0';

export function successResponse<T>(data: T): ApiResponse<T> {
    return {
        success: true,
        timestamp: new Date().toISOString(),
        version: API_VERSION,
        data,
    };
}

export function errorResponse(
    code: string,
    message: string,
    details?: string
): ApiResponse<never> {
    return {
        success: false,
        timestamp: new Date().toISOString(),
        version: API_VERSION,
        error: { code, message, details },
    };
}
