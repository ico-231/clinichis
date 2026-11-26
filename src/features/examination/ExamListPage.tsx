import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { Select } from '@/components/ui/Select'
import { Pagination } from '@/components/ui/Pagination'
import { useToast } from '@/components/ui/Toast'
import { useClinicActions } from '@/store/ClinicStore'
import { useVisitRows, type VisitRow } from '@/store/selectors'
import { PAYMENT_STATUS, PAYMENT_STATUS_ORDER, VISIT_STATUS } from '@/store/catalog'
import { normalizeText } from '@/lib/format'
import { todayISO } from '@/lib/date'
import { cn } from '@/lib/cn'
import { RECEPTION_COLUMNS } from '../reception/columns'
import { ReceptionTable } from '../reception/ReceptionTable'
import { CancelVisitModal, PaymentModal } from '../reception/PaymentModals'
import type { PaymentStatus, ReceptionColumnKey, ReceptionViewState, VisitStatus } from '@/store/types'

/** Các trạng thái thuộc phạm vi bác sĩ (đã tiếp nhận trở đi) */
const EXAM_STATUSES: ('waiting' | 'in_progress' | 'done')[] = ['waiting', 'in_progress', 'done']

const STATUS_DOT: Record<'waiting' | 'in_progress' | 'done', string> = {
  waiting: 'var(--color-accent)',
  in_progress: 'var(--color-info)',
  done: 'var(--color-brand)',
}

const COLUMNS: ReceptionColumnKey[] = ['stt', 'fullName', 'dob', 'gender', 'phone', 'visitDate', 'visitTime', 'fee', 'payment', 'note', 'patientType']

/** Danh sách "Lịch khám" của bác sĩ – bấm vào dòng để mở màn khám */
export function ExamListPage() {
  const rows = useVisitRows()
  const { openExam, setVisitStatus, startReception } = useClinicActions()

  const toast = useToast()

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState(todayISO)
  const [dateTo, setDateTo] = useState(todayISO)
  const [status, setStatus] = useState<VisitStatus | 'all'>('all')
  const [payment, setPayment] = useState<PaymentStatus | 'all'>('all')
  const [sort, setSort] = useState<ReceptionViewState['sort']>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [payId, setPayId] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)

  const { scoped, filtered, statusCounts } = useMemo(() => {
    const q = normalizeText(search)
    const digits = q.replace(/\D/g, '')
    const base = rows.filter(({ visit: v, patient: p }) => {
      if (!EXAM_STATUSES.includes(v.status as 'waiting' | 'in_progress' | 'done')) return false
      if (v.date < dateFrom || v.date > dateTo) return false
      if (payment !== 'all' && v.paymentStatus !== payment) return false
      if (q) {
        const hay = normalizeText(`${p.fullName} ${p.code} ${v.code}`)
        if (!hay.includes(q) && !(digits.length >= 3 && p.phone.includes(digits))) return false
      }
      return true
    })

    const counts: Record<'waiting' | 'in_progress' | 'done', number> = { waiting: 0, in_progress: 0, done: 0 }
    for (const r of base) {
      if (r.visit.status === 'waiting' || r.visit.status === 'in_progress' || r.visit.status === 'done') {
        counts[r.visit.status] += 1
      }
    }

    const list = status === 'all' ? base : base.filter(({ visit: v }) => v.status === status)
    const col = sort ? RECEPTION_COLUMNS.find((c) => c.key === sort.key) : null
    const sorted = [...list].sort((a, b) => {
      if (col?.sortValue) {
        const av = col.sortValue(a)
        const bv = col.sortValue(b)
        const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), 'vi')
        if (cmp !== 0) return sort!.direction === 'asc' ? cmp : -cmp
      }
      return b.visit.date.localeCompare(a.visit.date) || a.visit.queueNumber - b.visit.queueNumber
    })

    return { scoped: base, filtered: sorted, statusCounts: counts }
  }, [rows, search, dateFrom, dateTo, status, payment, sort])

  const pageCount = Math.ceil(filtered.length / pageSize)
  const safePage = Math.min(Math.max(page, 1), Math.max(pageCount, 1))
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const onSort = (key: ReceptionColumnKey) => {
    const next = !sort || sort.key !== key ? { key, direction: 'asc' as const } : sort.direction === 'asc' ? { key, direction: 'desc' as const } : null
    setSort(next)
    setPage(1)
  }

  const onChangeStatus = (row: VisitRow, to: VisitStatus) => {
    if (to === 'cancelled') return setCancelId(row.visit.id)
    setVisitStatus(row.visit.id, to)
    toast({ title: `${row.patient.fullName} → ${VISIT_STATUS[to].label}`, description: `${row.visit.code} · STT ${row.visit.queueNumber}` })
  }

  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v)
    setPage(1)
  }

  return (
    <div className="flex h-full flex-col bg-canvas">
      <PageHeader
        title="Khám bệnh"
        subtitle="Bấm vào dòng để mở phiếu khám"
        actions={
          <>
            <Button variant="outline" onClick={() => startReception('existing')}>
              Thêm bệnh cũ
            </Button>
            <Button onClick={() => startReception('new')}>
              Thêm bệnh mới
            </Button>
          </>
        }
      />

      <div className="mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col px-4 pb-4 sm:px-6">
        {/* Thanh trạng thái dạng pill 6C */}
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => resetPage(setStatus)('all')}
            className={cn(
              'inline-flex h-[33px] items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition',
              status === 'all' ? 'border-inverse bg-inverse text-on-inverse' : 'border-line-strong bg-surface text-ink-2 hover:bg-subtle',
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', status === 'all' ? 'bg-on-inverse' : 'bg-inverse')} />
            <span>Tất cả</span>
            <b className="tabular-nums">({scoped.length})</b>
          </button>
          {EXAM_STATUSES.map((s) => {
            const active = status === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => resetPage(setStatus)(s)}
                className={cn(
                  'inline-flex h-[33px] items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition',
                  active ? 'border-inverse bg-inverse text-on-inverse' : 'border-line-strong bg-surface text-ink-2 hover:bg-subtle',
                )}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: STATUS_DOT[s] }} />
                <span>{VISIT_STATUS[s].label}</span>
                <b className="tabular-nums">({statusCounts[s]})</b>
              </button>
            )
          })}
        </div>

        {/* Bộ lọc tìm kiếm */}
        <div className="flex flex-wrap items-center gap-2 pb-2.5">
          <div className="relative w-full sm:w-[300px]">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-4" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setSearch(searchInput), setPage(1))}
              placeholder="Tìm tên, số điện thoại, mã KB"
              aria-label="Tìm theo tên, số điện thoại"
              className="h-9 w-full rounded-[10px] border border-line-strong bg-surface pr-8 pl-9 text-[13.5px] text-ink outline-none transition placeholder:text-ink-4 hover:border-ink-5 focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => (setSearchInput(''), setSearch(''), setPage(1))}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-ink-3 hover:text-ink"
                aria-label="Xóa tìm kiếm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <DatePicker label="Từ" value={dateFrom} max={dateTo} onChange={resetPage(setDateFrom)} className="w-[155px]" />
          <DatePicker label="Đến" value={dateTo} min={dateFrom} onChange={resetPage(setDateTo)} className="w-[155px]" />
          <Select
            label="Thanh toán"
            value={payment}
            options={[{ value: 'all', label: 'Tất cả' }, ...PAYMENT_STATUS_ORDER.map((p) => ({ value: p, label: PAYMENT_STATUS[p].label }))]}
            onChange={resetPage(setPayment)}
            className="w-[165px]"
          />
          <Button onClick={() => (setSearch(searchInput), setPage(1))} className="w-[74px]">
            Tìm
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px] border border-line bg-surface">
          <div className="min-h-0 flex-1">
            <ReceptionTable
              rows={pageRows}
              visibleColumns={COLUMNS}
              singleDay={dateFrom === dateTo}
              sort={sort}
              onSort={onSort}
              highlightId={null}
              onOpen={(id) => openExam(id)}
              onChangeStatus={onChangeStatus}
              onPay={setPayId}
            />
          </div>
          <div className="border-t border-line px-4">
            <Pagination
              page={safePage}
              pageCount={pageCount}
              pageSize={pageSize}
              total={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={(n) => (setPageSize(n), setPage(1))}
            />
          </div>
        </div>
      </div>

      <PaymentModal visitId={payId} onClose={() => setPayId(null)} />
      <CancelVisitModal visitId={cancelId} onClose={() => setCancelId(null)} />
    </div>
  )
}
