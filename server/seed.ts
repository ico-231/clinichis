import { createSeedState } from '../src/store/seed.js'
import { rowIn, supabaseAuthHeaders } from './supabaseRepo.js'

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
      const chunk = rows.slice(i, i + 200)
      // PostgREST đòi mọi dòng trong một lần ghi có cùng bộ khoá: khai báo đủ cột (?columns=),
      // dòng nào thiếu trường tuỳ chọn thì lấy giá trị mặc định của cột (missing=default).
      const columns = [...new Set(chunk.flatMap((r) => Object.keys(r)))].join(',')
      const res = await fetchImpl(`${base}/rest/v1/${table}?on_conflict=id&columns=${columns}`, {
        method: 'POST',
        headers: { ...supabaseAuthHeaders(serviceKey), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,missing=default' },
        body: JSON.stringify(chunk),
      })
      if (!res.ok) throw new Error(`Ghi ${table} lỗi ${res.status}: ${(await res.text()).slice(0, 300)}`)
    }
  }
  await upsert('patients', patients)
  await upsert('visits', visits)
  return { patients: patients.length, visits: visits.length, payments: state.visits.reduce((n, v) => n + v.payments.length, 0) }
}
