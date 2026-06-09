/**
 * React Query `retry` predicate: never retry on 4xx (e.g. 403/404) so the UI can
 * show a "not found" state immediately instead of after backoff retries. Other
 * failures (network, 5xx) still retry a couple of times.
 */
export function retryNon4xx(failureCount: number, error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status && status >= 400 && status < 500) return false;
  return failureCount < 2;
}
