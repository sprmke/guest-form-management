import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const recordVideo = process.env.PLAYWRIGHT_RECORD_VIDEO === '1';
const slowMoRaw = process.env.PLAYWRIGHT_SLOW_MO;
const slowMoParsed = slowMoRaw ? Number.parseInt(slowMoRaw, 10) : 0;
const slowMo = Number.isFinite(slowMoParsed) && slowMoParsed > 0 ? slowMoParsed : 0;

export default defineConfig({
  testDir: './ui/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html'], ['list']] : [['list']],
  outputDir: 'test-results/playwright',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    video: recordVideo ? 'on' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1440, height: 960 },
    ...(slowMo
      ? {
          headless: false,
          launchOptions: { slowMo },
        }
      : {}),
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-side-by-side',
      use: {
        ...devices['Desktop Chrome'],
        headless: false,
        viewport: { width: 900, height: 960 },
      },
    },
  ],
  webServer: {
    command: `bun run dev:ui -- --host 127.0.0.1 --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 120_000,
  },
});
