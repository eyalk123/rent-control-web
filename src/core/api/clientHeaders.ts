/**
 * Telemetry headers identifying this client to the backend.
 *
 * The product ships two clients — this one and the Expo mobile app — against one backend,
 * and until these headers existed both sent only `Content-Type` and `Authorization`, so
 * every request looked identical to the server. There was no way to tell where owners
 * actually work, and therefore no evidence on which to split engineering effort between
 * the two. The backend accumulates them into `owner_client_days`.
 *
 * `app` and `platform` are separate on purpose. They are always both `'web'` here, but the
 * *mobile* app can run in a browser (the Expo web preview) where `Platform.OS === 'web'`,
 * and it still reports `app: 'mobile'`. One combined header would merge that with this app
 * and destroy the distinction the whole measurement exists for.
 *
 * Anything the backend does not recognise is stored as `"unknown"` rather than rejected,
 * so a bad value here degrades the data — it never fails a request.
 *
 * Kept in its own module because two things send requests: the Axios instance in
 * `client.ts`, and `features/agent/api/agentStream.ts`, which uses raw `fetch` because
 * Axios cannot stream. Sending an agent message is counted as real work, so the streaming
 * call has to carry these too or that work is attributed to no client at all.
 */

/**
 * Identifies the build. Set by `vite.config.ts` from the same commit SHA the Sentry
 * release uses, so a row in `owner_client_days` and an issue in Sentry name the same
 * build. Undefined outside a Railway build (a local `vite build`, `npm run dev`), where
 * there is no release to name — the header is then simply omitted.
 */
declare const __APP_VERSION__: string | undefined;

const version = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '';

export const CLIENT_HEADERS: Record<string, string> = {
  'X-Client-App': 'web',
  'X-Client-Platform': 'web',
  ...(version ? { 'X-Client-Version': version } : {}),
};
