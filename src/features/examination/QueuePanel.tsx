import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Copy, Plus, RefreshCw, Search } from 'lucide-react'
import { Tabs } from '@/components/ui/Tabs'
import { useVisitRows, usePatientVisits } from '@/store/selectors'
import { formatDiagnosis } from '@/store/icd10'
import { ageLabel, formatDateVN } from '@/lib/date'
import { formatPhone, normalizeText } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { Visit, VisitStatus } from '@/store/types'

type QueueTab = 'waiting' | 'in_progress' | 'done'

interface Props {
  visit: Visit
  onSelect: (visitId: string) => void
  onBack: () => void
  onOpenDetail: (visitId: string) => void
  onCopyPrescription: (from: Visit) => void
  onAddPatient: () => void
  /** Màn hẹp: cột hàng chờ là ngăn kéo phủ lên vùng khám */
  narrow?: boolean
  open?: boolean
  onClose?: () => void
}

const tabOf = (s: VisitStatus): QueueTab => (s === 'done' ? 'done' : s === 'in_progress' ? 'in_progress' : 'waiting')

/** Cột trái màn khám: hàng chờ trong ngày + lịch sử bệnh của người bệnh đang khám */
export function QueuePanel({ visit, onSelect, onBack, onOpenDetail, onCopyPrescription, onAddPatient, narrow = false, open = false, onClose }: Props) {
  const rows = useVisitRows()
  // Lịch sử bệnh: chỉ các lượt đã diễn ra trước lượt đang khám (bỏ lượt huỷ, lịch hẹn tương lai / chưa đến)
  const history = usePatientVisits(visit.patientId).filter(
    (v) => v.id !== visit.id && v.status !== 'cancelled' && v.status !== 'registered' && `${v.date} ${v.time}` < `${visit.date} ${visit.time}`,
  )
  const [tab, setTab] = useState<QueueTab>(() => tabOf(visit.status))
  const [query, setQuery] = useState('')
  // Lượt đang mở đổi trạng thái (Chờ khám → Đang khám → Đã khám) thì tab đi theo
  useEffect(() => setTab(tabOf(visit.status)), [visit.status])

  const dayRows = useMemo(() => rows.filter((r) => r.visit.date === visit.date), [rows, visit.date])
  const counts = useMemo(() => {
    const c = { waiting: 0, in_progress: 0, done: 0 }
    for (const r of dayRows) if (r.visit.status !== 'registered' && r.visit.status !== 'cancelled') c[tabOf(r.visit.status)]++
    return c
  }, [dayRows])

  const list = useMemo(() => {
    const q = normalizeText(query)
    const digits = q.replace(/\D/g, '')
    return dayRows
      .filter((r) => r.visit.status !== 'registered' && r.visit.status !== 'cancelled' && tabOf(r.visit.status) === tab)
      .filter((r) => !q || normalizeText(r.patient.fullName).includes(q) || (digits.length >= 3 && r.patient.phone.includes(digits)))
      .sort((a, b) => a.visit.queueNumber - b.visit.queueNumber)
  }, [dayRows, tab, query])

  return (
    <>
      {narrow && open && <div className="fixed inset-0 z-30 animate-fade-in bg-overlay/35" onClick={onClose} aria-hidden="true" />}
      <aside
        aria-label="Hàng chờ khám"
        inert={narrow && !open ? true : undefined}
        className={cn(
          'flex w-[284px] shrink-0 flex-col border-r border-line bg-surface',
          narrow && cn('fixed inset-y-0 left-0 z-40 w-[288px] max-w-[85vw] shadow-pop transition-transform duration-200', open ? 'translate-x-0' : '-translate-x-full'),
        )}
      >
        <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-line px-3.5">
          <h1 className="flex-1 text-[15px] font-bold text-ink">Khám bệnh</h1>
          <button
            type="button"
            onClick={onAddPatient}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-strong"
            aria-label="Tiếp nhận người bệnh mới"
            title="Tiếp nhận người bệnh mới (chuyển sang Lễ tân)"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 rounded-[8px] px-2 py-1 text-[12.5px] font-semibold text-ink-2 transition-colors hover:bg-subtle hover:text-ink"
            title="Về danh sách lịch khám"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Danh sách
          </button>
        </div>

        <div className="space-y-2 px-3 pt-2.5 pb-2">
          <p className="text-[13px] font-semibold text-ink-2">Ngày khám: {formatDateVN(visit.date)}</p>
          <Tabs
            variant="pill"
            className="flex w-full [&>button]:flex-1 [&>button]:px-1"
            value={tab}
            onChange={setTab}
            items={[
              { value: 'waiting', label: `Chờ (${counts.waiting})` },
              { value: 'in_progress', label: `Đang (${counts.in_progress})` },
              { value: 'done', label: `Xong (${counts.done})` },
            ]}
          />
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-4" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm theo tên, số điện thoại..."
                aria-label="Tìm theo tên, số điện thoại"
                className="h-8 w-full rounded-[10px] border border-line-strong bg-surface pr-2 pl-8 text-[12.5px] text-ink outline-none placeholder:text-ink-3/60 focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
            </div>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded-[10px] border border-line-strong bg-surface px-2 text-ink-3 hover:bg-subtle hover:text-ink"
              aria-label="Làm mới"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="mx-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-line">
          <div className="grid grid-cols-[44px_1fr] border-b border-line bg-subtle text-[12px] font-bold text-ink-3">
            <span className="px-2 py-1.5 text-center">STT</span>
            <span className="border-l border-line px-2.5 py-1.5">Người bệnh</span>
          </div>
          <ul className="thin-scroll flex-1 overflow-y-auto">
            {list.length === 0 && <li className="px-3 py-6 text-center text-[12.5px] text-ink-3">Không có người bệnh</li>}
            {list.map(({ visit: v, patient: p }) => {
              const active = v.id === visit.id
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => !active && onSelect(v.id)}
                    className={cn(
                      'grid w-full grid-cols-[44px_1fr] border-b border-line text-left text-[12.5px] transition-colors hover:bg-brand-wash',
                      active && 'bg-brand-soft/75 hover:bg-brand-soft/75',
                    )}
                  >
                    <span className="flex items-center justify-center gap-0.5 font-bold text-accent-ink tabular-nums">
                      {active && <span className="text-brand-ink">▸</span>}
                      {v.queueNumber}
                    </span>
                    <span className="border-l border-line px-2.5 py-1.5 leading-[18px]">
                      <span className={cn('block truncate font-bold uppercase', active ? 'text-brand-ink' : 'text-ink')}>{p.fullName}</span>
                      <span className="block text-ink-2">
                        {formatDateVN(p.dob)} · {ageLabel(p.dob)}
                      </span>
                      <span className="block text-ink-3 tabular-nums">{formatPhone(p.phone)}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="flex h-[42%] min-h-[180px] flex-col px-3 pt-3 pb-2.5">
          <p className="mb-1.5 text-[12.5px] font-bold text-ink">Lịch sử bệnh</p>
          <ul className="thin-scroll flex-1 space-y-1.5 overflow-y-auto pr-1">
            {history.length === 0 && (
              <li className="rounded-[12px] border border-dashed border-line-strong bg-canvas px-3 py-4 text-center text-[12.5px] text-ink-3">
                Chưa có lượt khám trước
              </li>
            )}
            {history.map((h, i) => (
              <li key={h.id} className="rounded-[12px] border border-line bg-canvas px-2.5 py-2 text-[12.5px]">
                <button type="button" onClick={() => onOpenDetail(h.id)} className="font-semibold text-brand-ink hover:underline">
                  {i + 1}. {h.time} - {formatDateVN(h.date)}
                </button>
                {h.exam?.diagnoses?.[0] && <p className="mt-0.5 line-clamp-2 text-ink-2">{formatDiagnosis(h.exam.diagnoses[0])}</p>}
                <p className="mt-0.5 flex justify-between text-ink-3">
                  Ngày tái khám:
                  <span>{h.exam?.followUpEnabled && h.exam.followUpDate ? formatDateVN(h.exam.followUpDate) : '--'}</span>
                </p>
                <div className="mt-1.5 flex items-center justify-between text-[12px] font-semibold">
                  <button
                    type="button"
                    disabled={!h.exam?.prescription?.length}
                    onClick={() => onCopyPrescription(h)}
                    className="flex items-center gap-1 text-ink-2 hover:text-brand-ink disabled:cursor-not-allowed disabled:text-ink-5"
                    title={h.exam?.prescription?.length ? 'Sao chép toa thuốc vào đơn hiện tại' : 'Lượt khám không có toa thuốc'}
                  >
                    <Copy className="h-3 w-3" />
                    Sao chép toa
                  </button>
                  <button type="button" onClick={() => onOpenDetail(h.id)} className="text-ink hover:text-brand-ink">
                    Chi tiết
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </>
  )
}
