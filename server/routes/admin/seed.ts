import { ApiError } from '../../errors'
import { handle, json } from '../../http'
import { seedSupabase } from '../../seed'

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
    return json(await seedSupabase(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY))
  })
}
