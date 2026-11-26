import { cn } from '@/lib/cn'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  'aria-label'?: string
  className?: string
}

/**
 * Công tắc bật/tắt dùng chung. Đặt trong <label> để chữ bên cạnh làm nhãn; đứng riêng thì truyền aria-label.
 * Núm trượt bằng transform (không animate thuộc tính left); lúc tắt dùng viền điều khiển đủ tương phản.
 */
export function Switch({ checked, onChange, disabled, className, 'aria-label': ariaLabel }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed',
        checked ? 'bg-brand' : 'bg-control',
        className,
      )}
    >
      <span className={cn('absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', checked && 'translate-x-4')} />
    </button>
  )
}
