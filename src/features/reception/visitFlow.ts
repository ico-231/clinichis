import { CheckCheck, Play, UserCheck, type LucideIcon } from 'lucide-react'
import type { VisitStatus } from '@/store/types'

/** Bước tiếp theo trong luồng: Đã đăng ký → Chờ khám → Đang khám → Đã khám */
export const NEXT_STEP: Partial<Record<VisitStatus, { to: VisitStatus; label: string; short: string; icon: LucideIcon }>> = {
  registered: { to: 'waiting', label: 'Tiếp nhận (chuyển Chờ khám)', short: 'Tiếp nhận', icon: UserCheck },
  waiting: { to: 'in_progress', label: 'Chuyển vào khám', short: 'Vào khám', icon: Play },
  in_progress: { to: 'done', label: 'Hoàn tất khám', short: 'Hoàn tất', icon: CheckCheck },
}

export const STEP_LABEL: Record<VisitStatus, string> = {
  registered: 'đã chuyển sang Chờ khám',
  waiting: 'đã vào khám',
  in_progress: 'đã hoàn tất khám',
  done: '',
  cancelled: '',
}
