import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import path from 'path'
import { thirdPartyNotices } from './build-plugins/thirdPartyNotices'

// Source-map upload is opt-in on the credentials being present. CI injects no secrets,
// so the plugin is absent there and the build stays byte-identical to a plain build.
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN
const uploadSourcemaps = Boolean(
  sentryAuthToken && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT,
)

// The build this bundle is. Reused as the `X-Client-Version` telemetry header
// (src/core/api/clientHeaders.ts) so an `owner_client_days` row and a Sentry issue name
// the same build — hence the same env var the Sentry release below is cut from, rather
// than a second version string that could disagree with it. Outside a Railway build there
// is no release to name, so it stays empty and the header is omitted.
//
// Shortened: the backend caps the header at 32 characters and stores nothing longer, so a
// full 40-char SHA would be discarded outright. Twelve is unambiguous and still prefixes
// the Sentry release.
const appVersion = (process.env.RAILWAY_GIT_COMMIT_SHA ?? '').slice(0, 12)

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    react(),
    tailwindcss(),
    thirdPartyNotices(),
    ...(uploadSourcemaps
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: sentryAuthToken,
            // The org is EU-hosted (the DSN points at ingest.de.sentry.io). sentry-cli
            // defaults to the US instance, where these credentials do not resolve, so
            // the upload has to be aimed explicitly or it fails at build time.
            url: 'https://de.sentry.io/',
            telemetry: false,
            release: { name: process.env.RAILWAY_GIT_COMMIT_SHA },
            sourcemaps: {
              // Upload the maps, then delete them from dist so Caddy can never serve
              // them. Combined with sourcemap:'hidden' (no sourceMappingURL comment in
              // the bundle), this keeps DEPLOYMENT_CHECKLIST S6 intact.
              filesToDeleteAfterUpload: ['./dist/**/*.map'],
            },
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    open: true,
    port: 5173,
  },
  build: {
    // Never `true` — that would ship maps to the public server. 'hidden' emits them for
    // upload without a sourceMappingURL comment, and they are deleted right after.
    sourcemap: uploadSourcemaps ? 'hidden' : false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Split large vendors into their own chunks for better caching.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('/firebase/') || id.includes('/@firebase/')) return 'firebase'
          if (id.includes('/recharts/') || id.includes('/d3-')) return 'charts'
          if (id.includes('/react-dom/') || id.includes('/react-router')) return 'react'
        },
      },
    },
  },
})
