import { doctorLabel, VISIT_STATUS } from '@/store/catalog'
import { ageLabel, formatTimeRange } from '@/lib/date'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { VisitRow } from '@/store/selectors'
import type { VisitStatus } from '@/store/types'

interface ReceptionBoardProps {
  rows: VisitRow[]
  onOpen: (visitId: string) => void
  onChangeStatus: (row: VisitRow, nextStatus: VisitStatus) => void
  onPay: (visitId: string) => void
  onOpenExam: (visitId: string) => void
}

const BOARD_COLUMNS: {
  key: 'registered' | 'waiting' | 'in_progress' | 'done'
  dot: string
  pillBg: string
  pillFg: string
  actionLabel?: string
  nextStatus?: VisitStatus
}[] = [
  { key: 'registered', dot: 'var(--color-warn)', pillBg: 'bg-warn-soft', pillFg: 'text-warn-strong', actionLabel: 'Tiếp nhận', nextStatus: 'waiting' },
  { key: 'waiting', dot: 'var(--color-accent)', pillBg: 'bg-accent-line', pillFg: 'text-accent-strong', actionLabel: 'Gọi vào khám', nextStatus: 'in_progress' },
  { key: 'in_progress', dot: 'var(--color-info)', pillBg: 'bg-info-soft', pillFg: 'text-info-strong', actionLabel: 'Mở màn khám' },
  { key: 'done', dot: 'var(--color-brand)', pillBg: 'bg-brand-soft', pillFg: 'text-brand-ink' },
]

/** Bảng điều phối 4 cột theo trạng thái khám (giao diện 6C) */
export function ReceptionBoard({ rows, onOpen, onChangeStatus, onPay, onOpenExam }: ReceptionBoardProps) {
  const cancelledRows = rows.filter((r) => r.visit.status === 'cancelled')

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-4">
        {BOARD_COLUMNS.map((col) => {
          const list = rows.filter((r) => r.visit.status === col.key)
          return (
            <section key={col.key} className="rounded-[16px] border border-line bg-subtle p-2.5">
              <header className="flex items-center justify-between px-1 pt-0.5 pb-2.5">
                <span className="inline-flex items-center gap-2 text-[14px] font-bold text-ink">
                  <span className="h-2 w-2 rounded-full" style={{ background: col.dot }} />
                  <span>{VISIT_STATUS[col.key].label}</span>
                </span>
                <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-bold tabular-nums', col.pillBg, col.pillFg)}>
                  {list.length}
                </span>
              </header>

              <div className="space-y-2">
                {list.length === 0 ? (
                  <div className="rounded-[12px] border border-dashed border-line-strong bg-surface/60 py-6 text-center text-[13px] text-ink-3">
                    Chưa có lượt nào
                  </div>
                ) : (
                  list.map((row) => {
                    const { visit, patient } = row
                    const isUnpaid = visit.paymentStatus === 'unpaid' || visit.paymentStatus === 'partial'
                    const payText = visit.paymentStatus === 'paid' ? 'Đã thanh toán' : isUnpaid ? 'Chưa thanh toán' : 'Miễn phí'
                    return (
                      <article
                        key={visit.id}
                        onClick={() => onOpen(visit.id)}
                        className="cursor-pointer rounded-[12px] border border-line bg-surface p-3 transition-colors hover:border-brand"
                      >
                        <div className="mb-1 flex items-center justify-between gap-2 text-[12.5px]">
                          <span className="font-bold text-accent-ink tabular-nums">STT {visit.queueNumber}</span>
                          <span className="text-ink-3 tabular-nums">{formatTimeRange(visit.time, visit.endTime)}</span>
                        </div>
                        <p className="truncate text-[14px] font-bold text-ink uppercase">{patient.fullName}</p>
                        <p className="mt-0.5 truncate text-[12.5px] text-ink-2">
                          {ageLabel(patient.dob, visit.date)} · {doctorLabel(visit.doctorId)}
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-2 text-[13px]">
                          <b className="text-ink tabular-nums">{formatNumber(visit.fee)} đ</b>
                          {isUnpaid ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onPay(visit.id)
                              }}
                              className="font-semibold text-accent-ink hover:underline"
                            >
                              {payText}
                            </button>
                          ) : (
                            <span className={cn('font-semibold', visit.paymentStatus === 'paid' ? 'text-brand-ink' : 'text-ink-3')}>
                              {payText}
                            </span>
                          )}
                        </div>
                        {col.actionLabel && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (col.nextStatus) onChangeStatus(row, col.nextStatus)
                              else onOpenExam(visit.id)
                            }}
                            className="mt-2.5 h-8 w-full rounded-[8px] bg-brand-soft text-[12.5px] font-bold text-brand-ink transition-colors hover:bg-brand hover:text-white"
                          >
                            {col.actionLabel}
                          </button>
                        )}
                      </article>
                    )
                  })
                )}
              </div>
            </section>
          )
        })}
      </div>

      {cancelledRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-[12px] border border-line bg-surface px-4 py-2.5 text-[13px] text-ink-3">
          <span className="font-semibold text-ink">Đã huỷ ({cancelledRows.length}):</span>
          {cancelledRows.map((r) => (
            <button
              key={r.visit.id}
              type="button"
              onClick={() => onOpen(r.visit.id)}
              className="rounded-full bg-subtle px-2.5 py-0.5 text-[12.5px] font-medium text-ink-2 hover:bg-line"
            >
              {r.patient.fullName} (STT {r.visit.queueNumber})
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
