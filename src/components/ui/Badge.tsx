import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone = 'gray' | 'blue' | 'green' | 'amber' | 'orange' | 'red' | 'violet' | 'sky' | 'yellow' | 'rose'

const tones: Record<BadgeTone, { box: string; dot: string }> = {
  gray: { box: 'bg-subtle text-ink-3 ring-line', dot: 'bg-ink-3' },
  blue: { box: 'bg-info-soft text-info-strong ring-info-line', dot: 'bg-info' },
  green: { box: 'bg-brand-soft text-brand-ink ring-brand-line', dot: 'bg-brand' },
  amber: { box: 'bg-warn-soft text-warn-strong ring-warn-line', dot: 'bg-warn' },
  orange: { box: 'bg-accent-soft text-accent-strong ring-accent-line', dot: 'bg-accent' },
  red: { box: 'bg-danger-soft text-danger-ink ring-danger-line', dot: 'bg-danger' },
  violet: { box: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-500' },
  sky: { box: 'bg-brand-soft text-brand-ink ring-brand-line', dot: 'bg-brand' },
  yellow: { box: 'bg-yellow-50 text-yellow-800 ring-yellow-200', dot: 'bg-yellow-500' },
  rose: { box: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
}

export function Badge({ tone = 'gray', dot, children, className }: { tone?: BadgeTone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-[2px] text-[11.5px] font-medium whitespace-nowrap ring-1 ring-inset', tones[tone].box, className)}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', tones[tone].dot)} />}
      {children}
    </span>
  )
}

export const dotColor = (tone: BadgeTone) => tones[tone].dot
