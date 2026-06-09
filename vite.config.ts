import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
    // Do not ship source maps to the public server (they expose source).
    sourcemap: false,
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
