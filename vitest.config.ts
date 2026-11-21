import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Cấu hình test riêng (không nạp các plugin Figma của vite.config.ts)
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
