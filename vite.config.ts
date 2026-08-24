import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import path from 'path'

// Source-map upload is opt-in on the credentials being present. CI injects no secrets,
// so the plugin is absent there and the build stays byte-identical to a plain build.
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN
const uploadSourcemaps = Boolean(
  sentryAuthToken && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT,
)

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(uploadSourcemaps
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: sentryAuthToken,
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
