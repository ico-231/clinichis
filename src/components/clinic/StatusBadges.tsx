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
      return <Sparkles className={cn(className, 'text-amber-500')} />
    case 'waiting':
      return <Clock3 className={cn(className, 'text-orange-500')} />
    case 'in_progress':
      return <Activity className={cn(className, 'text-blue-600')} />
    case 'done':
      return <CheckCircle2 className={cn(className, 'text-emerald-600')} />
    case 'cancelled':
      return <Ban className={cn(className, 'text-slate-400')} />
  }
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const s = PAYMENT_STATUS[status]
  return <Badge tone={s.tone}>{s.short}</Badge>
}

/** Hiển thị trạng thái thanh toán dạng vòng tròn rỗng + chữ (khớp bảng Lễ tân) */
const PAYMENT_RING: Record<PaymentStatus, string> = {
  unpaid: 'border-orange-500',
  paid: 'border-emerald-500',
  partial: 'border-amber-500',
  none: 'border-slate-400',
  cancelled: 'border-slate-400',
  refunded: 'border-violet-500',
  failed: 'border-red-500',
}

export function PaymentStatusInline({ status }: { status: PaymentStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap text-slate-800">
      <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full border-[2px]', PAYMENT_RING[status])} />
      <span>{PAYMENT_STATUS[status].label}</span>
    </span>
  )
}

export function PatientTypeTag({ type }: { type: PatientType }) {
  return (
    <span className={type === 'new' ? 'text-[12.5px] font-medium text-sky-600' : 'text-[12.5px] font-medium text-slate-600'}>
      {PATIENT_TYPE_LABEL[type]}
    </span>
  )
}
