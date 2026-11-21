import { useEffect, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, Kbd } from '@/components/ui/Button'
import { hasOpenOverlay } from '@/components/ui/Modal'
import { DatePicker } from '@/components/ui/DatePicker'
import { Select } from '@/components/ui/Select'
import { Pagination } from '@/components/ui/Pagination'
import { useToast } from '@/components/ui/Toast'
import { useClinicActions } from '@/store/ClinicStore'
import { useVisitRows, type VisitRow } from '@/store/selectors'
import { PAYMENT_STATUS, PAYMENT_STATUS_ORDER, VISIT_STATUS } from '@/store/catalog'
import { normalizeText } from '@/lib/format'
import { todayISO } from '@/lib/date'
import { RECEPTION_COLUMNS } from '../reception/columns'
import { ReceptionTable } from '../reception/ReceptionTable'
import { CancelVisitModal, PaymentModal } from '../reception/PaymentModals'
import type { PaymentStatus, ReceptionColumnKey, ReceptionViewState, VisitStatus } from '@/store/types'

/** Các trạng thái thuộc phạm vi bác sĩ (đã tiếp nhận trở đi) */
const EXAM_STATUSES: VisitStatus[] = ['waiting', 'in_progress', 'done']

const COLUMNS: ReceptionColumnKey[] = ['stt', 'fullName', 'dob', 'gender', 'phone', 'visitDate', 'visitTime', 'fee', 'payment', 'note', 'patientType']

/** Danh sách "Lịch khám" của bác sĩ – bấm vào dòng để mở màn khám */
export function ExamListPage() {
  const rows = useVisitRows()
  const { openExam, setVisitStatus, startReception } = useClinicActions()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'F1' || e.key === 'F2') && !hasOpenOverlay()) {
        e.preventDefault()
        startReception(e.key === 'F1' ? 'existing' : 'new')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [startReception])
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

  const filtered = useMemo(() => {
    const q = normalizeText(search)
    const digits = q.replace(/\D/g, '')
    const list = rows.filter(({ visit: v, patient: p }) => {
      if (!EXAM_STATUSES.includes(v.status)) return false
      if (v.date < dateFrom || v.date > dateTo) return false
      if (status !== 'all' && v.status !== status) return false
      if (payment !== 'all' && v.paymentStatus !== payment) return false
      if (q) {
        const hay = normalizeText(`${p.fullName} ${p.code} ${v.code}`)
        if (!hay.includes(q) && !(digits.length >= 3 && p.phone.includes(digits))) return false
      }
      return true
    })
    const col = sort ? RECEPTION_COLUMNS.find((c) => c.key === sort.key) : null
    return list.sort((a, b) => {
      if (col?.sortValue) {
        const av = col.sortValue(a)
        const bv = col.sortValue(b)
        const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), 'vi')
        if (cmp !== 0) return sort!.direction === 'asc' ? cmp : -cmp
      }
      return b.visit.date.localeCompare(a.visit.date) || a.visit.queueNumber - b.visit.queueNumber
    })
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
    <div className="flex h-full flex-col">
      <PageHeader
        title="Lịch khám"
        subtitle="Bấm vào dòng để khám"
        actions={
          <>
            <Button variant="success" onClick={() => startReception('existing')} rightIcon={<Kbd tone="green">F1</Kbd>}>
              Thêm bệnh cũ
            </Button>
            <Button onClick={() => startReception('new')} rightIcon={<Kbd tone="blue">F2</Kbd>}>
              Thêm bệnh mới
            </Button>
          </>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col px-2">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-3 px-2 pt-4 pb-3">
          <div className="relative w-[236px]">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setSearch(searchInput), setPage(1))}
              placeholder="Tìm theo tên, số điện thoại..."
              className="h-9 w-full rounded-md bg-slate-100 pr-8 pl-8 text-[13px] text-slate-900 outline-none placeholder:text-slate-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => (setSearchInput(''), setSearch(''), setPage(1))}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700"
                aria-label="Xóa tìm kiếm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <DatePicker label="Từ" value={dateFrom} max={dateTo} onChange={resetPage(setDateFrom)} className="w-[155px]" />
          <DatePicker label="Đến" value={dateTo} min={dateFrom} onChange={resetPage(setDateTo)} className="w-[155px]" />
          <Select
            label="Trạng thái"
            value={status}
            options={[{ value: 'all', label: 'Tất cả' }, ...EXAM_STATUSES.map((s) => ({ value: s, label: VISIT_STATUS[s].label }))]}
            onChange={resetPage(setStatus)}
            className="w-[155px]"
          />
          <Select
            label="Thanh toán"
            value={payment}
            options={[{ value: 'all', label: 'Tất cả' }, ...PAYMENT_STATUS_ORDER.map((p) => ({ value: p, label: PAYMENT_STATUS[p].label }))]}
            onChange={resetPage(setPayment)}
            className="w-[155px]"
          />
          <Button onClick={() => (setSearch(searchInput), setPage(1))} className="w-[72px]">
            Tìm
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <ReceptionTable
            rows={pageRows}
            visibleColumns={COLUMNS}
            sort={sort}
            onSort={onSort}
            highlightId={null}
            onOpen={(id) => openExam(id)}
            onChangeStatus={onChangeStatus}
            onPay={setPayId}
          />
        </div>

        <Pagination
          page={safePage}
          pageCount={pageCount}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={(n) => (setPageSize(n), setPage(1))}
        />
      </div>

      <PaymentModal visitId={payId} onClose={() => setPayId(null)} />
      <CancelVisitModal visitId={cancelId} onClose={() => setCancelId(null)} />
    </div>
  )
}
