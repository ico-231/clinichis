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
import { rowIn } from '../server/supabaseRepo'

it('nạp dữ liệu mẫu lên Supabase', async () => {
  const state = createSeedState()
  const patients = state.patients.map((p) => rowIn(p as unknown as Record<string, unknown>))
  const visits = state.visits.map((v) => rowIn(v as unknown as Record<string, unknown>))
  console.log(`Dữ liệu mẫu: ${patients.length} người bệnh, ${visits.length} lượt khám, ${state.visits.reduce((n, v) => n + v.payments.length, 0)} phiếu thu/hoàn`)
  expect(patients.length).toBeGreaterThan(0)

  const url = process.env.SUPABASE_URL?.replace(/\/$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || process.env.SEED_CONFIRM !== 'yes') {
    console.log('Chỉ xem thử. Đặt SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY và SEED_CONFIRM=yes để ghi thật.')
    return
  }

  async function upsert(table: string, rows: Record<string, unknown>[]) {
    for (let i = 0; i < rows.length; i += 200) {
      const res = await fetch(`${url}/rest/v1/${table}?on_conflict=id`, {
        method: 'POST',
        headers: { apikey: key!, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify(rows.slice(i, i + 200)),
      })
      if (!res.ok) throw new Error(`Ghi ${table} lỗi ${res.status}: ${await res.text()}`)
    }
    console.log(`Đã ghi ${rows.length} dòng vào ${table}`)
  }
  await upsert('patients', patients)
  await upsert('visits', visits)
})
