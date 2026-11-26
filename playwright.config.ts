import { defineConfig, devices } from '@playwright/test'

/**
 * Test bấm thử trên trình duyệt (E2E). Chạy: `pnpm e2e` (cần Chrome đã cài trên máy).
 * Dùng Chrome có sẵn (channel 'chrome') nên không tải trình duyệt riêng của Playwright.
 * Mỗi test mở một hồ sơ trình duyệt mới ⇒ localStorage trống ⇒ app tự nạp dữ liệu mẫu.
 * Chạy trên bản build (vite build + preview) ở cổng 4174: nhanh, ổn định, không đụng
 * cổng dev 8443 (Claude Code) / 8444 (Antigravity).
 */
const PORT = Number(process.env.E2E_PORT || 4174)

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  outputDir: 'test-results',
  use: {
    ...devices['Desktop Chrome'],
    channel: 'chrome',
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1440, height: 900 },
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
