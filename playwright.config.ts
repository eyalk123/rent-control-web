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
    // Desktop. The viewport in `use` above (1600x900) applies here.
    { name: 'chromium', testIgnore: /mobile\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    // Mobile. Scoped to mobile.spec.ts on purpose: the other specs' selectors assume the
    // labelled >=1536px sidebar, which does not render at phone width. `devices` supplies
    // its own 390x844 viewport (overriding the desktop one above) plus touch and a mobile
    // UA. `browserName` is forced back to chromium because the iPhone descriptor defaults
    // to webkit, and only the chromium browser is installed for this project.
    {
      name: 'mobile',
      testMatch: /mobile\.spec\.ts/,
      use: { ...devices['iPhone 14'], browserName: 'chromium' },
    },
  ],
  // Boot Vite in `test` mode so it loads .env.test (VITE_USE_MOCK_API + VITE_E2E_AUTH_BYPASS).
  // Routes are lazy-loaded chunks served by a dev server shared across all workers, so
  // the first assertion after a navigation can legitimately take longer than the 5s
  // default when the suite runs fully parallel. This buys headroom without masking a
  // real hang — the 30s test timeout still applies.
  expect: { timeout: 10_000 },
  webServer: {
    command: `npx vite --mode test --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
