import { ApiError } from '../../errors.js'
import { handle, json } from '../../http.js'
import { seedSupabase } from '../../seed.js'

/**
 * POST /api/admin/seed — nạp dữ liệu mẫu của 1.0 lên Supabase (ghi đè theo id).
 * Chỉ chạy khi máy chủ đặt ALLOW_SEED=yes VÀ đã đặt CLINIC_API_KEY (request phải gửi đúng x-clinic-key).
 * Nạp xong nên xoá ALLOW_SEED trên Vercel.
 */
export function POST(request: Request) {
  return handle(request, async () => {
    const env = process.env
    if (env.ALLOW_SEED !== 'yes' || !env.CLINIC_API_KEY) throw new ApiError('not_found', 'Không có chức năng này')
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new ApiError('server_error', 'Chưa cấu hình Supabase')
    try {
      return json(await seedSupabase(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY))
    } catch (err) {
      // API quản trị, đã qua khoá + ALLOW_SEED: trả nguyên lỗi để dễ sửa
      throw new ApiError('server_error', err instanceof Error ? err.message : String(err))
    }
  })
}
