import { Play, UserCheck, type LucideIcon } from 'lucide-react'
import type { VisitStatus } from '@/store/types'

/** Bước tiếp theo trong luồng: Đã đăng ký → Chờ khám → Đang khám → Đã khám */
export const NEXT_STEP: Partial<Record<VisitStatus, { to: VisitStatus; label: string; short: string; icon: LucideIcon }>> = {
  registered: { to: 'waiting', label: 'Tiếp nhận (chuyển Chờ khám)', short: 'Tiếp nhận', icon: UserCheck },
  waiting: { to: 'in_progress', label: 'Chuyển vào khám', short: 'Vào khám', icon: Play },
  // Đang khám: chỉ bác sĩ hoàn thành ở màn khám (kiểm tra sinh hiệu, chẩn đoán) – Lễ tân không đóng ca thay
}

export const STEP_LABEL: Record<VisitStatus, string> = {
  registered: 'đã chuyển sang Chờ khám',
  waiting: 'đã vào khám',
  in_progress: 'đã hoàn tất khám',
  done: '',
  cancelled: '',
}

/** Các bước được phép chuyển từ mỗi trạng thái (dropdown trên dòng – ảnh 019) */
export const STATUS_ACTIONS: Record<VisitStatus, { to: VisitStatus; label: string }[]> = {
  registered: [
    { to: 'waiting', label: 'Tiếp nhận' },
    { to: 'cancelled', label: 'Huỷ lịch' },
  ],
  waiting: [
    { to: 'in_progress', label: 'Vào khám' },
    { to: 'cancelled', label: 'Huỷ lượt khám' },
  ],
  in_progress: [],
  done: [],
  cancelled: [],
}
