import type { ReactNode } from 'react'

/** Trạng thái trống: chỉ chữ (không minh hoạ), gọn trong bảng và khung nhỏ */
export function EmptyState({ title = 'Không có dữ liệu', description, action }: { title?: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-4 py-10 text-center">
      <p className="text-[13.5px] font-semibold text-ink-2">{title}</p>
      {description && <p className="max-w-sm text-[12.5px] text-ink-4">{description}</p>}
      {action && <div className="mt-2.5">{action}</div>}
    </div>
  )
}
