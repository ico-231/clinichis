import { createSeedState } from '../src/store/seed.js'
import { rowIn } from './supabaseRepo.js'

/**
 * Đẩy dữ liệu mẫu của 1.0 (người bệnh, lượt khám, phiếu thu, chỉ định) lên Supabase qua REST,
 * ghi đè theo id nên chạy lại nhiều lần được. Dùng chung cho script ở máy và API /api/admin/seed.
 */
export async function seedSupabase(url: string, serviceKey: string, fetchImpl: typeof fetch = fetch) {
  const state = createSeedState()
  const patients = state.patients.map((p) => rowIn(p as unknown as Record<string, unknown>))
  const visits = state.visits.map((v) => rowIn(v as unknown as Record<string, unknown>))
  const base = url.replace(/\/$/, '')
  async function upsert(table: string, rows: Record<string, unknown>[]) {
    for (let i = 0; i < rows.length; i += 200) {
      const res = await fetchImpl(`${base}/rest/v1/${table}?on_conflict=id`, {
        method: 'POST',
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify(rows.slice(i, i + 200)),
      })
      if (!res.ok) throw new Error(`Ghi ${table} lỗi ${res.status}: ${await res.text()}`)
    }
  }
  await upsert('patients', patients)
  await upsert('visits', visits)
  return { patients: patients.length, visits: visits.length, payments: state.visits.reduce((n, v) => n + v.payments.length, 0) }
}
