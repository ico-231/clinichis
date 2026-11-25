import { getRepos, handle, json } from '../http.js'

/**
 * GET /api/health — API còn sống không, cơ sở dữ liệu trả lời mất bao lâu. Không cần mã, không trả dữ liệu nào.
 * Lịch chạy của Vercel gọi mỗi sáng (vercel.json → crons): Supabase gói miễn phí tự tạm dừng project sau 7 ngày
 * không có lượt gọi, mà app 1.0 trên web không gọi API ⇒ cần một lượt đọc nhẹ mỗi ngày để giữ project chạy.
 */
export function GET(request: Request) {
  return handle(
    request,
    async () => {
      const started = Date.now()
      const db = process.env.CLINIC_DATA === 'memory' ? 'memory' : 'supabase'
      try {
        await getRepos().settings.get('system') // một lượt đọc nhẹ (1 dòng)
        return json({ ok: true, db, ms: Date.now() - started })
      } catch {
        return json({ ok: false, db, ms: Date.now() - started }, 503)
      }
    },
    'public',
  )
}
