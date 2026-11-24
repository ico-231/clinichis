import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Chạy các script tiện ích (không phải test) bằng vitest để dùng lại alias @/ và TypeScript của dự án, không cần thêm thư viện
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, '../src') } },
  test: { environment: 'node', include: ['scripts/**/*.script.ts'], testTimeout: 120_000 },
})
