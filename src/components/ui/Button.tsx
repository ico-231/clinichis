import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'success' | 'outline' | 'ghost' | 'danger' | 'soft'
type Size = 'sm' | 'md' | 'icon' | 'icon-sm'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

const variants: Record<Variant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm',
  success: 'bg-green-700 text-white hover:bg-green-800 active:bg-green-900 shadow-sm',
  outline: 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 active:bg-slate-100',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  soft: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  icon: 'h-9 w-9',
  'icon-sm': 'h-7 w-7',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', leftIcon, rightIcon, className, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md font-semibold whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  )
})

export function Kbd({ children, tone = 'light' }: { children: ReactNode; tone?: 'light' | 'green' | 'blue' }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 max-sm:hidden items-center justify-center rounded px-1 font-sans text-[10px] font-semibold',
        tone === 'green' && 'bg-green-700/60 text-white',
        tone === 'blue' && 'bg-blue-800/60 text-white',
        tone === 'light' && 'border border-slate-200 bg-slate-50 text-slate-500',
      )}
    >
      {children}
    </kbd>
  )
}
