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
import { normalizeText } from '@/lib/format'
import { ReceptionTable } from '../reception/ReceptionTable'
import { CancelVisitModal, PaymentModal } from '../reception/PaymentModals'
import { VisitDetailDrawer } from '../reception/VisitDetailDrawer'
import { previousRange } from '../reports/reportData'
import { PendingProfileBanner } from './SchedulePage'
import type { PaymentStatus, VisitStatus } from '@/store/types'

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
  const [pageSize, setPageSize] = useState(20)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [payId, setPayId] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)

  const booked = useMemo(() => rows.filter((r) => r.visit.category === 'booked'), [rows])
  const filtered = useMemo(() => {
    const q = normalizeText(query)
    const digits = q.replace(/\D/g, '')
    return booked
      .filter(({ visit: v, patient: p }) => {
        if (v.date < from || v.date > to) return false
        if (status !== 'all' && v.status !== status) return false
        if (payment !== 'all' && v.paymentStatus !== payment) return false
        if (q && !normalizeText(`${p.fullName} ${p.code} ${v.code}`).includes(q) && !(digits.length >= 3 && p.phone.includes(digits))) return false
        return true
      })
      .sort((a, b) => b.visit.date.localeCompare(a.visit.date) || a.visit.time.localeCompare(b.visit.time))
  }, [booked, query, from, to, status, payment])
  const prev = previousRange(from, to)
  const prevCount = booked.filter((r) => r.visit.date >= prev.from && r.visit.date <= prev.to).length
  const pageCount = Math.ceil(filtered.length / pageSize)
  const safePage = Math.min(Math.max(page, 1), Math.max(pageCount, 1))

  const onChangeStatus = (row: VisitRow, to2: VisitStatus) => {
    if (to2 === 'cancelled') return setCancelId(row.visit.id)
    setVisitStatus(row.visit.id, to2)
    toast({ title: `${row.patient.fullName} → ${VISIT_STATUS[to2].label}` })
  }

  const cards = [
    { label: 'Danh sách lịch hẹn', value: filtered.length, prev: prevCount, icon: <CalendarCheck2 className="h-4 w-4" /> },
  ]

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Lịch hẹn" />
      <PendingProfileBanner />
      <div className="grid grid-cols-1 gap-3 px-3 pt-3 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="flex items-start justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <div>
              <p className="text-[12.5px] font-semibold text-slate-800">{c.label}</p>
              <p className="text-[19px] font-semibold text-blue-600">{c.value}</p>
              <p className="text-[11.5px] text-slate-500">Kỳ trước: {c.prev}</p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">{c.icon}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-2 px-3 pt-3 pb-3">
        <div className="relative w-[220px]">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (setQuery(input), setPage(1))}
            placeholder="Tìm theo tên, số điện thoại..."
            className="h-9 w-full rounded-md bg-slate-100 pr-7 pl-8 text-[13px] outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
          />
          {input && (
            <button type="button" onClick={() => (setInput(''), setQuery(''))} className="absolute top-1/2 right-2 -translate-y-1/2 text-slate-400" aria-label="Xoá tìm kiếm">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <DatePicker label="Từ" value={from} max={to} onChange={(v) => (setFrom(v), setPage(1))} className="w-[150px]" />
        <DatePicker label="Đến" value={to} min={from} onChange={(v) => (setTo(v), setPage(1))} className="w-[150px]" />
        <Select label="Trạng thái" value={status} options={[{ value: 'all', label: 'Tất cả' }, ...VISIT_STATUS_FILTER]} onChange={(v) => (setStatus(v), setPage(1))} className="w-[150px]" />
        <Select
          label="Thanh toán"
          value={payment}
          options={[{ value: 'all', label: 'Tất cả' }, ...PAYMENT_STATUS_ORDER.map((p) => ({ value: p, label: PAYMENT_STATUS[p].label }))]}
          onChange={(v) => (setPayment(v), setPage(1))}
          className="w-[150px]"
        />
        <Button onClick={() => (setQuery(input), setPage(1))} className="w-[72px]">
          Tìm
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-3">
        <div className="h-full overflow-hidden rounded-lg border border-slate-200 bg-white">
          <ReceptionTable
            rows={filtered.slice((safePage - 1) * pageSize, safePage * pageSize)}
            visibleColumns={DEFAULT_COLUMNS}
            sort={null}
            onSort={() => {}}
            highlightId={null}
            onOpen={setDetailId}
            onChangeStatus={onChangeStatus}
            onPay={setPayId}
          />
        </div>
      </div>
      <div className="px-3">
        <Pagination page={safePage} pageCount={pageCount} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={(n) => (setPageSize(n), setPage(1))} />
      </div>
      <VisitDetailDrawer visitId={detailId} onClose={() => setDetailId(null)} onOpenVisit={setDetailId} onPay={setPayId} onCancel={setCancelId} />
      <PaymentModal visitId={payId} onClose={() => setPayId(null)} />
      <CancelVisitModal visitId={cancelId} onClose={() => setCancelId(null)} />
    </div>
  )
}
