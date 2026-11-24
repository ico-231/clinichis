/**
 * Nạp dữ liệu mẫu của 1.0 (người bệnh, lượt khám, phiếu thu, chỉ định) lên Supabase.
 *
 * Xem thử (không ghi gì):
 *   npx vitest run --config scripts/vitest.config.ts
 * Ghi thật (ghi đè các bản ghi cùng id, chạy lại nhiều lần được):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SEED_CONFIRM=yes npx vitest run --config scripts/vitest.config.ts
 * (PowerShell: $env:SUPABASE_URL='...'; $env:SUPABASE_SERVICE_ROLE_KEY='...'; $env:SEED_CONFIRM='yes'; npx vitest run --config scripts/vitest.config.ts)
 *
 * Ngày trong dữ liệu mẫu tính theo hôm nay lúc chạy script.
 */
import { expect, it } from 'vitest'
import { createSeedState } from '@/store/seed'
import { seedSupabase } from '../server/seed'

it('nạp dữ liệu mẫu lên Supabase', async () => {
  const state = createSeedState()
  console.log(`Dữ liệu mẫu: ${state.patients.length} người bệnh, ${state.visits.length} lượt khám, ${state.visits.reduce((n, v) => n + v.payments.length, 0)} phiếu thu/hoàn`)
  expect(state.patients.length).toBeGreaterThan(0)
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || process.env.SEED_CONFIRM !== 'yes') {
    console.log('Chỉ xem thử. Đặt SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY và SEED_CONFIRM=yes để ghi thật.')
    return
  }
  console.log('Đã ghi:', await seedSupabase(url, key))
})
