import { Activity, Ban, CheckCircle2, Clock3, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { PATIENT_TYPE_LABEL, PAYMENT_STATUS, VISIT_STATUS } from '@/store/catalog'
import { cn } from '@/lib/cn'
import type { PatientType, PaymentStatus, VisitStatus } from '@/store/types'

export function VisitStatusBadge({ status }: { status: VisitStatus }) {
  const s = VISIT_STATUS[status]
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  )
}

export function VisitStatusIcon({ status, className = 'h-3.5 w-3.5' }: { status: VisitStatus; className?: string }) {
  switch (status) {
    case 'registered':
      return <Sparkles className={cn(className, 'text-warn-ink')} />
    case 'waiting':
      return <Clock3 className={cn(className, 'text-accent-ink')} />
    case 'in_progress':
      return <Activity className={cn(className, 'text-info-ink')} />
    case 'done':
      return <CheckCircle2 className={cn(className, 'text-brand-ink')} />
    case 'cancelled':
      return <Ban className={cn(className, 'text-ink-3')} />
  }
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const s = PAYMENT_STATUS[status]
  return <Badge tone={s.tone}>{s.short}</Badge>
}

/** Trạng thái thanh toán trong bảng: chấm màu + chữ cùng tông (khớp bảng Lễ tân) */
const PAYMENT_TONE: Record<PaymentStatus, { dot: string; text: string }> = {
  unpaid: { dot: 'bg-accent', text: 'text-accent-ink' },
  paid: { dot: 'bg-brand', text: 'text-brand-ink' },
  partial: { dot: 'bg-warn', text: 'text-warn-ink' },
  none: { dot: 'bg-ink-5', text: 'text-ink-3' },
  cancelled: { dot: 'bg-ink-5', text: 'text-ink-4' },
  refunded: { dot: 'bg-violet-500', text: 'text-violet-700' },
  failed: { dot: 'bg-danger', text: 'text-danger-ink' },
}

export function PaymentStatusInline({ status }: { status: PaymentStatus }) {
  const tone = PAYMENT_TONE[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap', tone.text)}>
      <span className={cn('h-2 w-2 shrink-0 rounded-full', tone.dot)} />
      <span>{PAYMENT_STATUS[status].label}</span>
    </span>
  )
}

export function PatientTypeTag({ type }: { type: PatientType }) {
  return (
    <span className={type === 'new' ? 'text-[12.5px] font-semibold text-brand-ink' : 'text-[12.5px] font-medium text-ink-3'}>
      {PATIENT_TYPE_LABEL[type]}
    </span>
  )
}
