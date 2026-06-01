import { defineConfig, devices } from '@playwright/test';

// Dedicated port for the E2E server so it never collides with a normal `npm run dev`
// (which runs in default mode without mock/auth-bypass).
const PORT = 5179;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    // ≥1536px (Tailwind 2xl) so the labelled sidebar renders; below that the app
    // shows an icon-only sidebar / mobile bottom bar, which makes nav links text-less.
    viewport: { width: 1600, height: 900 },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // Boot Vite in `test` mode so it loads .env.test (VITE_USE_MOCK_API + VITE_E2E_AUTH_BYPASS).
  webServer: {
    command: `npx vite --mode test --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
