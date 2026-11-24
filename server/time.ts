/**
 * Ngày hôm nay theo giờ Việt Nam (YYYY-MM-DD).
 * Máy chủ Vercel chạy giờ UTC; dùng giờ máy chủ thì từ 0h–7h sáng VN sẽ lệch sang ngày hôm trước.
 */
export function todayVN(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}
