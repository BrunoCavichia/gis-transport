import { DEFAULT_TIMEOUT, DEFAULT_RETRIES } from "@/lib/config";

/**
 * Performs a fetch request with automatic retries on failure.
 */
export async function fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = DEFAULT_RETRIES
): Promise<Response> {
    for (let i = 0; i <= retries; i++) {
        try {
            return await fetch(url, options);
        } catch (err) {
            if (i === retries) throw err;
        }
    }
    throw new Error("Fetch failed after retries");
}

/**
 * Performs a fetch request with a timeout and optional retries.
 */
export async function fetchWithTimeout(
    url: string,
    options: RequestInit & { timeout?: number; retries?: number }
): Promise<Response> {
    const { timeout = DEFAULT_TIMEOUT, retries = DEFAULT_RETRIES, ...fetchOptions } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        return await fetchWithRetry(url, { ...fetchOptions, signal: controller.signal }, retries);
    } finally {
        clearTimeout(id);
    }
}
