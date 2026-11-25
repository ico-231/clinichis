import { ApiError } from '../../errors.js'
import { handle, json } from '../../http.js'
import { resetDemo } from '../../seed.js'
import { todayVN } from '../../time.js'

/**
 * GET /api/admin/reset-demo — xoá hết dữ liệu rồi nạp lại dữ liệu mẫu theo ngày hôm nay (giờ VN).
 * Chỉ lịch chạy của Vercel gọi được (vercel.json → crons, mỗi đêm): phải đặt CRON_SECRET trên Vercel,
 * Vercel tự gửi `Authorization: Bearer <CRON_SECRET>`. Không đặt hoặc sai mã ⇒ 404.
 */
export function GET(request: Request) {
  return handle(
    request,
    async () => {
      const env = process.env
      if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new ApiError('server_error', 'Chưa cấu hình Supabase')
      try {
        return json({ date: todayVN(), ...(await resetDemo(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)) })
      } catch (err) {
        // Chỉ lịch chạy gọi được: trả nguyên lỗi để đọc trong nhật ký Vercel
        throw new ApiError('server_error', err instanceof Error ? err.message : String(err))
      }
    },
    'cron',
  )
}
