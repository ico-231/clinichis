import { useMemo, useState } from 'react'
import { CalendarCheck2, Search, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useClinicActions } from '@/store/ClinicStore'
import { useVisitRows, type VisitRow } from '@/store/selectors'
import { PAYMENT_STATUS, PAYMENT_STATUS_ORDER, VISIT_STATUS, VISIT_STATUS_FILTER } from '@/store/catalog'
import { DEFAULT_COLUMNS } from '@/store/seed'
import { todayISO } from '@/lib/date'
import { formatNumber, normalizeText } from '@/lib/format'
import { cn } from '@/lib/cn'
import { ReceptionTable } from '../reception/ReceptionTable'
import { CancelVisitModal, PaymentModal } from '../reception/PaymentModals'
import { VisitDetailDrawer } from '../reception/VisitDetailDrawer'
import { previousRange } from '../reports/reportData'
import { PendingProfileBanner } from './SchedulePage'
import { nextSort, sortVisitRows } from '../reception/useReceptionData'
import type { PaymentStatus, ReceptionViewState, VisitStatus } from '@/store/types'

const STATUS_PILLS: { value: 'all' | VisitStatus; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'registered', label: 'Đã đăng ký khám' },
  { value: 'waiting', label: 'Chờ khám' },
  { value: 'in_progress', label: 'Đang khám' },
  { value: 'done', label: 'Đã khám' },
  { value: 'cancelled', label: 'Huỷ khám' },
]

/** Lịch hẹn: các lượt đặt trước qua website / ứng dụng / Zalo / tổng đài (ảnh 074) */
export function AppointmentsPage() {
  const rows = useVisitRows()
  const { setVisitStatus } = useClinicActions()
  const toast = useToast()
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState(todayISO)
  const [to, setTo] = useState(todayISO)
  const [status, setStatus] = useState<'all' | VisitStatus>('all')
  const [payment, setPayment] = useState<'all' | PaymentStatus>('all')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<ReceptionViewState['sort']>(null)
  const [pageSize, setPageSize] = useState(20)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [payId, setPayId] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)

  const booked = useMemo(() => rows.filter((r) => r.visit.category === 'booked'), [rows])
  const scopedBooked = useMemo(() => {
    const q = normalizeText(query)
    const digits = q.replace(/\D/g, '')
    return booked.filter(({ visit: v, patient: p }) => {
      if (v.date < from || v.date > to) return false
      if (payment !== 'all' && v.paymentStatus !== payment) return false
      if (q && !normalizeText(`${p.fullName} ${p.code} ${v.code}`).includes(q) && !(digits.length >= 3 && p.phone.includes(digits))) return false
      return true
    })
  }, [booked, query, from, to, payment])

  const counts = useMemo(() => {
    const c = { all: scopedBooked.length, registered: 0, waiting: 0, in_progress: 0, done: 0, cancelled: 0 }
    for (const { visit: v } of scopedBooked) {
      if (v.status === 'registered') c.registered++
      else if (v.status === 'waiting') c.waiting++
      else if (v.status === 'in_progress') c.in_progress++
      else if (v.status === 'done') c.done++
      else if (v.status === 'cancelled') c.cancelled++
    }
    return c
  }, [scopedBooked])

  const filtered = useMemo(() => {
    const list = status === 'all' ? [...scopedBooked] : scopedBooked.filter(({ visit: v }) => v.status === status)
    // Mặc định theo giờ hẹn trong ngày; bấm tiêu đề cột để sắp xếp khác
    return sort ? sortVisitRows(list, sort) : list.sort((a, b) => b.visit.date.localeCompare(a.visit.date) || a.visit.time.localeCompare(b.visit.time))
  }, [scopedBooked, status, sort])
  const prev = previousRange(from, to)
  const prevCount = booked.filter((r) => r.visit.date >= prev.from && r.visit.date <= prev.to).length
  const pageCount = Math.ceil(filtered.length / pageSize)
  const safePage = Math.min(Math.max(page, 1), Math.max(pageCount, 1))

  const onChangeStatus = (row: VisitRow, to2: VisitStatus) => {
    if (to2 === 'cancelled') return setCancelId(row.visit.id)
    setVisitStatus(row.visit.id, to2)
    toast({ title: `${row.patient.fullName} → ${VISIT_STATUS[to2].label}` })
  }

  return (
    <div className="flex h-full flex-col bg-canvas">
      <PageHeader title="Lịch hẹn" />
      <PendingProfileBanner />
      <div className="mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col gap-3 overflow-hidden px-4 sm:px-6 2xl:px-8 pt-1 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 rounded-[16px] border border-line bg-surface px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-brand-line bg-brand-tint text-brand-ink">
              <CalendarCheck2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[12px] font-medium text-ink-3">Danh sách lịch hẹn</p>
              <div className="flex items-baseline gap-2.5">
                <span className="text-[24px] leading-tight font-extrabold tracking-[-0.02em] text-ink tabular-nums">{formatNumber(filtered.length)}</span>
                <span className="text-[12px] text-ink-4 tabular-nums">Kỳ trước: {formatNumber(prevCount)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_PILLS.map((pill) => {
              const active = status === pill.value
              const n = counts[pill.value as keyof typeof counts] ?? 0
              return (
                <button
                  key={pill.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => (setStatus(pill.value), setPage(1))}
                  className={cn(
                    'inline-flex h-[33px] items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition',
                    active ? 'border-inverse bg-inverse text-on-inverse' : 'border-line-strong bg-surface text-ink-2 hover:bg-subtle',
                  )}
                >
                  <span>{pill.label}</span>
                  <b className="tabular-nums">({n})</b>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="relative w-full sm:w-[280px]">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-4" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setQuery(input), setPage(1))}
              placeholder="Tìm tên, số điện thoại"
              aria-label="Tìm theo tên, số điện thoại"
              className="h-9 w-full rounded-[10px] border border-line-strong bg-surface pr-8 pl-9 text-[13.5px] text-ink outline-none transition placeholder:text-ink-4 hover:border-ink-5 focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
            {input && (
              <button type="button" onClick={() => (setInput(''), setQuery(''))} className="absolute top-1/2 right-2 -translate-y-1/2 text-ink-4 hover:text-ink" aria-label="Xoá tìm kiếm">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <DatePicker label="Từ" value={from} max={to} onChange={(v) => (setFrom(v), setPage(1))} className="w-[150px]" />
          <DatePicker label="Đến" value={to} min={from} onChange={(v) => (setTo(v), setPage(1))} className="w-[150px]" />
          <Select label="Trạng thái" value={status} options={[{ value: 'all', label: 'Tất cả' }, ...VISIT_STATUS_FILTER]} onChange={(v) => (setStatus(v), setPage(1))} className="w-[160px]" />
          <Select
            label="Thanh toán"
            value={payment}
            options={[{ value: 'all', label: 'Tất cả' }, ...PAYMENT_STATUS_ORDER.map((p) => ({ value: p, label: PAYMENT_STATUS[p].label }))]}
            onChange={(v) => (setPayment(v), setPage(1))}
            className="w-[160px]"
          />
          <Button variant="primary" size="sm" className="h-9 px-4" onClick={() => (setQuery(input), setPage(1))}>
            Tìm
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px] border border-line bg-surface">
          <div className="min-h-0 flex-1 overflow-hidden">
            <ReceptionTable
              rows={filtered.slice((safePage - 1) * pageSize, safePage * pageSize)}
              visibleColumns={DEFAULT_COLUMNS}
              singleDay={from === to}
              sort={sort}
              onSort={(key) => (setSort((s) => nextSort(s, key)), setPage(1))}
              highlightId={null}
              onOpen={setDetailId}
              onChangeStatus={onChangeStatus}
              onPay={setPayId}
            />
          </div>
          <div className="border-t border-line px-4">
            <Pagination page={safePage} pageCount={pageCount} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={(n) => (setPageSize(n), setPage(1))} />
          </div>
        </div>
      </div>

      <VisitDetailDrawer visitId={detailId} onClose={() => setDetailId(null)} onOpenVisit={setDetailId} onPay={setPayId} onCancel={setCancelId} />
      <PaymentModal visitId={payId} onClose={() => setPayId(null)} />
      <CancelVisitModal visitId={cancelId} onClose={() => setCancelId(null)} />
    </div>
  )
}
