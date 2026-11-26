import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { useControlLabel } from '@/lib/useControlLabel'
import { formatNumber } from '@/lib/format'

export const inputBase =
  'h-9 w-full rounded-[10px] border border-line-strong bg-surface px-3 text-[13.5px] text-ink placeholder:text-ink-4 outline-none transition hover:border-ink-5 focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:bg-subtle disabled:text-ink-3'

export const inputError = 'border-danger hover:border-danger focus:border-danger focus:ring-danger/15'

interface FieldShellProps {
  label?: string
  required?: boolean
  error?: string
  hint?: string
  className?: string
  children: ReactNode
}

/** Khung trường nhập với nhãn nhỏ nằm trên viền (giống hệ thống gốc) */
export function FieldShell({ label, required, error, hint, className, children }: FieldShellProps) {
  const { ref, labelId, errorId } = useControlLabel<HTMLSpanElement>(error)
  return (
    <div className={cn('relative', className)}>
      {label && (
        <span
          ref={ref}
          id={labelId}
          className="pointer-events-none absolute -top-[7px] left-2 z-[1] max-w-[calc(100%-16px)] truncate bg-[linear-gradient(to_bottom,transparent_48%,var(--color-surface)_48%)] px-1 text-[11px] leading-[14px] font-medium text-ink-3"
        >
          {label}
          {required && <span className="text-danger-ink"> *</span>}
        </span>
      )}
      {children}
      {error ? (
        <p id={errorId} className="mt-1 text-[11.5px] font-medium text-danger-ink">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11.5px] text-ink-4">{hint}</p>
      ) : null}
    </div>
  )
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  wrapperClassName?: string
  leftIcon?: ReactNode
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, required, wrapperClassName, className, leftIcon, ...props },
  ref,
) {
  return (
    <FieldShell label={label} required={required} error={error} hint={hint} className={wrapperClassName}>
      <div className="relative">
        {leftIcon && <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-5">{leftIcon}</span>}
        <input ref={ref} required={required} aria-required={required || undefined} className={cn(inputBase, !!leftIcon && 'pl-9', error && inputError, className)} {...props} />
      </div>
    </FieldShell>
  )
})

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  wrapperClassName?: string
}

export function TextArea({ label, error, required, wrapperClassName, className, ...props }: TextAreaProps) {
  return (
    <FieldShell label={label} required={required} error={error} className={wrapperClassName}>
      <textarea required={required} aria-required={required || undefined} className={cn(inputBase, 'h-auto min-h-[64px] resize-none py-2 leading-5', error && inputError, className)} {...props} />
    </FieldShell>
  )
}

interface MoneyFieldProps {
  label?: string
  value: number
  onChange: (value: number) => void
  error?: string
  hint?: string
  className?: string
  disabled?: boolean
}

export function MoneyField({ label, value, onChange, error, hint, className, disabled }: MoneyFieldProps) {
  return (
    <FieldShell label={label} error={error} hint={hint} className={className}>
      <div className="relative">
        <input
          inputMode="numeric"
          disabled={disabled}
          className={cn(inputBase, 'pr-8 text-right tabular-nums', error && inputError)}
          value={value ? formatNumber(value) : '0'}
          onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)}
          onFocus={(e) => e.target.select()}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-ink-5">đ</span>
      </div>
    </FieldShell>
  )
}

interface SegmentedProps<T extends string> {
  label?: string
  required?: boolean
  value: T | ''
  options: { value: T; label: string; icon?: ReactNode }[]
  onChange: (value: T) => void
  error?: string
  className?: string
}

export function Segmented<T extends string>({ label, required, value, options, onChange, error, className }: SegmentedProps<T>) {
  return (
    <FieldShell label={label} required={required} error={error} className={className}>
      <div role="radiogroup" aria-label={label} aria-required={required || undefined} className={cn('flex h-9 rounded-[10px] border border-line-strong bg-subtle p-0.5', error && 'border-danger')}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-[7px] text-[13px] font-semibold transition',
              value === o.value ? 'bg-surface text-brand-ink shadow-sm ring-1 ring-line' : 'text-ink-3 hover:text-ink',
            )}
          >
            {o.icon}
            {o.label}
          </button>
        ))}
      </div>
    </FieldShell>
  )
}

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  description?: ReactNode
  className?: string
}

export function Checkbox({ checked, onChange, label, description, className }: CheckboxProps) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-2.5 select-none', className)}>
      {/* Ô thật đứng trước để ô vẽ (peer) hiện viền khi focus bằng bàn phím */}
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-surface',
          checked ? 'border-brand bg-brand' : 'border-control bg-surface',
        )}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M2.5 6.2 5 8.5l4.5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="text-[13px] leading-5">
        <span className="font-medium text-ink">{label}</span>
        {description && <span className="block text-xs text-ink-3">{description}</span>}
      </span>
    </label>
  )
}
