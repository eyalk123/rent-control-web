/**
 * The original, human-readable file name of a stored file.
 *
 * Files are uploaded to Firebase Storage under `${entityType}/${ownerId}/${uuid}/${file.name}`,
 * and that bare path is what is stored, so the name is its last segment. A URI (a local
 * preview, a mock-API upload) encodes the name and may carry a query string, so it is decoded.
 */
export function fileNameFromUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) return url.split('/').pop() ?? '';
  try {
    const withoutQuery = url.split('?')[0];
    const decoded = decodeURIComponent(withoutQuery);
    return decoded.split('/').pop() ?? '';
  } catch {
    // decodeURIComponent throws on malformed input; fall back to a best-effort segment.
    return url.split('?')[0].split('/').pop() ?? '';
  }
}
