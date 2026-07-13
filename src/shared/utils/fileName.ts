/**
 * Extract the original, human-readable file name from a stored file URL.
 *
 * Files are uploaded to Firebase Storage under `${entityType}/${ownerId}/${uuid}/${file.name}`,
 * and the download URL encodes that whole path into a single segment after `/o/`
 * (path separators become `%2F`). To recover just the original name we must decode
 * first, drop the query string, then take the last path segment — otherwise the UI
 * shows the full storage path or raw `%2F`-encoded gibberish.
 */
export function fileNameFromUrl(url: string | null | undefined): string {
  if (!url) return '';
  try {
    const withoutQuery = url.split('?')[0];
    const decoded = decodeURIComponent(withoutQuery);
    return decoded.split('/').pop() ?? '';
  } catch {
    // decodeURIComponent throws on malformed input; fall back to a best-effort segment.
    return url.split('?')[0].split('/').pop() ?? '';
  }
}
