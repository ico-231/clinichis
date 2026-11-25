import { createSeedState } from '../src/store/seed.js'
import { rowIn, supabaseAuthHeaders } from './supabaseRepo.js'

/**
 * Chạy `fn` theo giờ Việt Nam. Dữ liệu mẫu của 1.0 lấy "hôm nay" và giờ khám theo giờ của máy;
 * máy chủ Vercel chạy giờ UTC nên nạp lúc 0h–7h sáng VN sẽ lệch sang ngày hôm trước, giờ khám lệch 7 tiếng.
 * Node đọc lại process.env.TZ mỗi lần gán (nhưng xoá thì không) ⇒ xong thì gán lại múi giờ cũ của máy.
 */
export function inVietnamTime<T>(fn: () => T): T {
  const prev = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone
  process.env.TZ = 'Asia/Ho_Chi_Minh'
  try {
    return fn()
  } finally {
    process.env.TZ = prev
  }
}

/**
 * Đẩy dữ liệu mẫu của 1.0 (người bệnh, lượt khám, phiếu thu, chỉ định) lên Supabase qua REST,
 * ghi đè theo id nên chạy lại nhiều lần được. Dùng chung cho script ở máy và API /api/admin/seed.
 */
export async function seedSupabase(url: string, serviceKey: string, fetchImpl: typeof fetch = fetch) {
  const state = inVietnamTime(createSeedState)
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

/**
 * Đặt lại bản demo: xoá hết dữ liệu (lượt khám, người bệnh, bộ đếm, danh mục, cài đặt — hàm SQL `reset_demo_data`,
 * một giao dịch) rồi nạp lại dữ liệu mẫu theo ngày hôm nay. Lịch chạy của Vercel gọi mỗi đêm (/api/admin/reset-demo)
 * để hôm nào mở ra cũng có lượt khám của hôm nay, và dọn luôn dữ liệu người xem tự nhập.
 */
export async function resetDemo(url: string, serviceKey: string, fetchImpl: typeof fetch = fetch) {
  const res = await fetchImpl(`${url.replace(/\/$/, '')}/rest/v1/rpc/reset_demo_data`, {
    method: 'POST',
    headers: { ...supabaseAuthHeaders(serviceKey), 'Content-Type': 'application/json' },
    body: '{}',
  })
  if (!res.ok) throw new Error(`Xoá dữ liệu cũ lỗi ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return seedSupabase(url, serviceKey, fetchImpl)
}
