import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'

export const inputBase =
  'h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:bg-slate-50 disabled:text-slate-500'

export const inputError = 'border-red-400 hover:border-red-400 focus:border-red-500 focus:ring-red-500/15'

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
  return (
    <div className={cn('relative', className)}>
      {label && (
        <span className="pointer-events-none absolute -top-[7px] left-2 z-[1] bg-white px-1 text-[11px] leading-[14px] text-slate-600">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </span>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-[11px] text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
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
        {leftIcon && <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">{leftIcon}</span>}
        <input ref={ref} className={cn(inputBase, !!leftIcon && 'pl-9', error && inputError, className)} {...props} />
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
      <textarea className={cn(inputBase, 'h-auto min-h-[64px] resize-none py-2 leading-5', error && inputError, className)} {...props} />
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
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-slate-400">đ</span>
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
      <div className={cn('flex h-9 rounded-md border border-slate-200 bg-slate-50 p-0.5', error && 'border-red-400')}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-[5px] text-[13px] font-medium transition',
              value === o.value ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800',
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
      <span
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition',
          checked ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white',
        )}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M2.5 6.2 5 8.5l4.5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-[13px] leading-5">
        <span className="font-medium text-slate-800">{label}</span>
        {description && <span className="block text-xs text-slate-500">{description}</span>}
      </span>
    </label>
  )
}
