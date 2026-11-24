/**
 * Ngày hôm nay theo giờ Việt Nam (YYYY-MM-DD).
 * Máy chủ Vercel chạy giờ UTC; dùng giờ máy chủ thì từ 0h–7h sáng VN sẽ lệch sang ngày hôm trước.
 */
/**
 * Ngày dạng YYYY-MM-DD và có thật trên lịch. `Date.parse('2026-02-31')` của JS vẫn ra số (tự cộng sang tháng 3),
 * còn Postgres thì từ chối ⇒ phải tự kiểm tra, không thì API trả lỗi 500 thay vì 422.
 */
export function isISODate(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

export function todayVN(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}
