import { addDays, todayISO } from '../src/lib/date.js'
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

/** Số ngày tới có sẵn dữ liệu trên Supabase */
export const FUTURE_DAYS = 60

/**
 * Dữ liệu cho bản demo trên Supabase (theo giờ VN): 7 ngày trước + hôm nay lấy từ dữ liệu mẫu của 1.0,
 * cộng `futureDays` ngày tới, **mỗi ngày tạo như một ngày đang làm việc** (18 lượt: đã khám, đang khám, chờ, hẹn, huỷ).
 * Đánh đổi đã chốt với người dùng 25/11: xem trước lịch ngày tới sẽ thấy ca "đã khám", báo cáo tính cả doanh thu ngày chưa tới.
 * Mỗi ngày dùng bộ sinh số theo chính ngày đó ⇒ các ngày khác nhau, nạp lại vẫn ra như cũ.
 */
export function buildDemoData(futureDays = FUTURE_DAYS) {
  return inVietnamTime(() => {
    const base = createSeedState()
    const today = todayISO()
    const visits = base.visits.filter((v) => v.date <= today)
    for (let i = 1; i <= futureDays; i++) {
      const day = addDays(today, i)
      const s = createSeedState({ today: day, visitSeed: Number(day.replace(/-/g, '')), seqOffset: 10_000 + i * 1000 })
      visits.push(...s.visits.filter((v) => v.date === day))
    }
    return { today, patients: base.patients, visits }
  })
}

/**
 * Đẩy dữ liệu demo (người bệnh, lượt khám, phiếu thu, chỉ định — xem `buildDemoData`) lên Supabase qua REST, ghi đè theo id.
 * Muốn sạch hẳn (không sót lượt cũ) thì dùng `resetDemo`.
 */
export async function seedSupabase(url: string, serviceKey: string, fetchImpl: typeof fetch = fetch, futureDays = FUTURE_DAYS) {
  const state = buildDemoData(futureDays)
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
  return {
    patients: patients.length,
    visits: visits.length,
    payments: state.visits.reduce((n, v) => n + v.payments.length, 0),
    from: state.visits.reduce((m, v) => (v.date < m ? v.date : m), state.today),
    to: addDays(state.today, futureDays),
  }
}

/**
 * Đặt lại bản demo: xoá hết dữ liệu (lượt khám, người bệnh, bộ đếm, danh mục, cài đặt — hàm SQL `reset_demo_data`,
 * một giao dịch) rồi nạp lại dữ liệu demo theo ngày hôm nay (7 ngày trước → 60 ngày tới). Dùng cho /api/admin/seed và
 * lịch chạy mỗi đêm /api/admin/reset-demo (khi đã đặt CRON_SECRET) — dọn luôn dữ liệu người xem tự nhập.
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
