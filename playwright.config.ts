import { defineConfig, devices } from '@playwright/test';

const startPreviewServer = process.env.PLAYWRIGHT_START_SERVER === '1';
const defaultBaseUrl = startPreviewServer
  ? 'http://localhost:4173'
  : 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || defaultBaseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        permissions: ['camera'],
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
          ],
        },
      },
    },
  ],
  ...(startPreviewServer
    ? {
        webServer: {
          command: 'npm run preview -- --port 4173 --host localhost',
          url: 'http://localhost:4173',
          reuseExistingServer: true,
          timeout: 120000,
        },
      }
    : {}),
});
