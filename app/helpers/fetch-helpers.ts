/**
 * Performs a fetch request with automatic retries on failure.
 * 
 * @param url - The URL to fetch.
 * @param options - Standard RequestInit options.
 * @param retries - Number of times to retry before throwing an error.
 * @returns A promise that resolves to the Response object.
 */
export async function fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = 2
): Promise<Response> {
    for (let i = 0; i <= retries; i++) {
        try {
            return await fetch(url, options);
        } catch (err) {
            if (i === retries) throw err;
        }
    }
    // Should never reach here due to the throw in the loop
    throw new Error("Fetch failed after retries");
}
