import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Nút mở/thu dòng chi tiết trong bảng. Cả dòng vẫn bấm được bằng chuột;
 * nút này cho người dùng bàn phím / trình đọc màn hình cùng thao tác đó.
 */
export function RowToggle({ open, onToggle, label, className }: { open: boolean; onToggle: () => void; label: string; className?: string }) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-label={`${open ? 'Thu gọn' : 'Mở'} ${label}`}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className={cn('grid h-6 w-6 place-items-center rounded-md text-ink-3 hover:bg-subtle hover:text-ink', className)}
    >
      <ChevronDown className={cn('h-4 w-4 transition-transform', !open && '-rotate-90')} />
    </button>
  )
}
