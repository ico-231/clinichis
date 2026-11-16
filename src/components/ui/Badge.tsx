import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone = 'gray' | 'blue' | 'green' | 'amber' | 'orange' | 'red' | 'violet' | 'sky' | 'yellow' | 'rose'

const tones: Record<BadgeTone, { box: string; dot: string }> = {
  gray: { box: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
  blue: { box: 'bg-blue-50 text-blue-700 ring-blue-200', dot: 'bg-blue-500' },
  green: { box: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  amber: { box: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  orange: { box: 'bg-orange-50 text-orange-700 ring-orange-200', dot: 'bg-orange-500' },
  red: { box: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' },
  violet: { box: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-500' },
  sky: { box: 'bg-sky-50 text-sky-700 ring-sky-200', dot: 'bg-sky-500' },
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
