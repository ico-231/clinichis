import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { useToast } from '@/components/ui/Toast'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import { VISIT_STATUS, VISIT_STATUS_FILTER } from '@/store/catalog'
import { formatDateVN } from '@/lib/date'
import { cn } from '@/lib/cn'
import { ReceptionToolbar } from './ReceptionToolbar'
import { ReceptionTable } from './ReceptionTable'
import { ReceptionBoard } from './ReceptionBoard'
import { ExistingPatientSpotlightModal } from './ExistingPatientSpotlightModal'
import { ReceptionIntakeView, type IntakeInit } from './ReceptionIntakeView'
import { CancelVisitModal, PaymentModal } from './PaymentModals'
import { VisitDetailDrawer } from './VisitDetailDrawer'
import { CheckInTicket } from '@/components/clinic/CheckInTicket'
import { filtersRevealingVisit, nextSort, useReceptionData } from './useReceptionData'
import type { ReceptionColumnKey, Visit, VisitStatus } from '@/store/types'
import type { VisitRow } from '@/store/selectors'

const STATUS_DOT: Record<VisitStatus, string> = {
  registered: 'var(--color-warn)',
  waiting: 'var(--color-accent)',
  in_progress: 'var(--color-info)',
  done: 'var(--color-brand)',
  cancelled: 'var(--color-ink-5)',
}

export function ReceptionPage() {
  const { ui, system } = useClinicState()
  const { setReceptionView, setVisitStatus, setUI, openExam } = useClinicActions()
  const toast = useToast()
  const view = ui.reception
  const data = useReceptionData()

  const [recMode, setRecMode] = useState<'list' | 'board'>('list')
  const [spotlightOpen, setSpotlightOpen] = useState(false)
  const [intake, setIntake] = useState<IntakeInit | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [payId, setPayId] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [ticketId, setTicketId] = useState<string | null>(null)

  const openIntake = useCallback((nextIntake: IntakeInit) => {
    setSpotlightOpen(false)
    setIntake(nextIntake)
  }, [])

  const closeIntake = useCallback(() => {
    setIntake(null)
  }, [])

  // Được chuyển tới từ màn khác với yêu cầu Thêm bệnh cũ / mới
  useEffect(() => {
    if (!ui.receptionAction) return
    if (ui.receptionAction === 'existing') setSpotlightOpen(true)
    else openIntake({ mode: 'new' })
    setUI({ receptionAction: null })
  }, [ui.receptionAction, openIntake, setUI])

  // Đưa dòng vừa tạo vào vùng nhìn thấy
  useEffect(() => {
    if (!highlightId) return
    const idx = data.sorted.findIndex((r) => r.visit.id === highlightId)
    if (idx >= 0) {
      const targetPage = Math.floor(idx / view.pageSize) + 1
      if (targetPage !== data.page) setReceptionView({ page: targetPage })
    }
    const t = setTimeout(() => setHighlightId(null), 3500)
    return () => clearTimeout(t)
  }, [highlightId]) // eslint-disable-line react-hooks/exhaustive-deps

  const onCreated = useCallback(
    (visit: Visit) => {
      closeIntake()
      const nextFilters = filtersRevealingVisit(view.filters, visit)
      if (nextFilters) {
        setReceptionView({ filters: nextFilters, searchInput: '', page: 1 })
      }
      setHighlightId(visit.id)
    },
    [view, setReceptionView, closeIntake],
  )

  const onSort = (key: ReceptionColumnKey) => {
    setReceptionView({ sort: nextSort(view.sort, key), page: 1 })
  }

  const onChangeStatus = (row: VisitRow, to: VisitStatus) => {
    if (to === 'cancelled') {
      setCancelId(row.visit.id)
      return
    }
    setVisitStatus(row.visit.id, to)
    toast({
      title: `${row.patient.fullName} → ${VISIT_STATUS[to].label}`,
      description: `${row.visit.code} · STT ${row.visit.queueNumber}`,
    })
  }

  // Nếu đang mở màn hình Tiếp nhận toàn trang (Thêm bệnh mới hoặc chọn từ Thêm bệnh cũ)
  if (intake) {
    return (
      <ReceptionIntakeView
        key={`${intake.mode}-${intake.patientId ?? 'new'}-${intake.prefillQuery ?? ''}`}
        init={intake}
        onCancel={closeIntake}
        onSaved={(visit, status, opts) => {
          if (status === 'in_progress') {
            closeIntake()
            openExam(visit.id)
          } else {
            onCreated(visit)
            if (opts?.print || (status === 'registered' && system?.general.printTicketOnCheckIn)) setTicketId(visit.id)
          }
        }}
      />
    )
  }

  const subtitle =
    view.filters.dateFrom === view.filters.dateTo
      ? formatDateVN(view.filters.dateFrom)
      : `${formatDateVN(view.filters.dateFrom)} – ${formatDateVN(view.filters.dateTo)}`

  const selectStatus = (status: VisitStatus | 'all') => setReceptionView({ filters: { ...view.filters, status }, page: 1 })

  return (
    <div className="flex h-full flex-col bg-canvas">
      <PageHeader
        title="Lễ tân"
        subtitle={subtitle}
        actions={
          <>
            <Button variant="outline" onClick={() => setSpotlightOpen(true)}>
              Thêm bệnh cũ
            </Button>
            <Button onClick={() => openIntake({ mode: 'new' })}>
              Thêm bệnh mới
            </Button>
          </>
        }
      />

      <div className="mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col px-4 pb-4 sm:px-6">
        {/* Thanh trạng thái dạng pill + nút chuyển Danh sách / Bảng điều phối */}
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          {recMode === 'board' && (
            <p className="flex h-[33px] items-center text-[13px] text-ink-3">
              Mỗi cột là một trạng thái. Bấm thẻ để xem chi tiết, bấm nút trên thẻ để chuyển bước.
            </p>
          )}
          {recMode === 'list' && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => selectStatus('all')}
                className={cn(
                  'inline-flex h-[33px] items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition',
                  view.filters.status === 'all'
                    ? 'border-inverse bg-inverse text-on-inverse'
                    : 'border-line-strong bg-surface text-ink-2 hover:bg-subtle',
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', view.filters.status === 'all' ? 'bg-on-inverse' : 'bg-inverse')} />
                <span>Tất cả</span>
                <b className="tabular-nums">({data.scopedTotal})</b>
              </button>
              {VISIT_STATUS_FILTER.map((s) => {
                const active = view.filters.status === s.value
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => selectStatus(s.value)}
                    className={cn(
                      'inline-flex h-[33px] items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition',
                      active
                        ? 'border-inverse bg-inverse text-on-inverse'
                        : 'border-line-strong bg-surface text-ink-2 hover:bg-subtle',
                    )}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: STATUS_DOT[s.value] }} />
                    <span>{s.label}</span>
                    <b className="tabular-nums">({data.statusCounts[s.value]})</b>
                  </button>
                )
              })}
            </div>
          )}

          <div role="tablist" aria-label="Kiểu hiển thị lễ tân" className="ml-auto inline-flex rounded-[10px] border border-line-strong bg-surface p-[3px]">
            <button
              type="button"
              role="tab"
              aria-selected={recMode === 'list'}
              onClick={() => setRecMode('list')}
              className={cn(
                'rounded-[7px] px-3 py-1 text-[13px] font-semibold transition',
                recMode === 'list' ? 'bg-brand text-white' : 'text-ink-2 hover:text-ink',
              )}
            >
              Danh sách
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={recMode === 'board'}
              onClick={() => setRecMode('board')}
              className={cn(
                'rounded-[7px] px-3 py-1 text-[13px] font-semibold transition',
                recMode === 'board' ? 'bg-brand text-white' : 'text-ink-2 hover:text-ink',
              )}
            >
              Bảng điều phối
            </button>
          </div>
        </div>

        <ReceptionToolbar mode={recMode} />

        {recMode === 'list' ? (
          <>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px] border border-line bg-surface">
              <div className="min-h-0 flex-1">
              <ReceptionTable
                rows={data.pageRows}
                visibleColumns={view.visibleColumns}
                singleDay={view.filters.dateFrom === view.filters.dateTo}
                sort={view.sort}
                onSort={onSort}
                highlightId={highlightId}
                onOpen={setDetailId}
                onChangeStatus={onChangeStatus}
                onPay={setPayId}
                emptyAction={
                  <Button size="sm" variant="soft" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => openIntake({ mode: 'new' })}>
                    Thêm bệnh mới
                  </Button>
                }
              />
              </div>
              <div className="border-t border-line px-4">
                <Pagination
                  page={data.page}
                  pageCount={data.pageCount}
                  pageSize={view.pageSize}
                  total={data.sorted.length}
                  onPageChange={(page) => setReceptionView({ page })}
                  onPageSizeChange={(pageSize) => setReceptionView({ pageSize, page: 1 })}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="thin-scroll min-h-0 flex-1 overflow-y-auto pb-3">
            <ReceptionBoard rows={data.scopedSorted} onOpen={setDetailId} onChangeStatus={onChangeStatus} onPay={setPayId} onOpenExam={openExam} />
          </div>
        )}
      </div>

      <ExistingPatientSpotlightModal
        open={spotlightOpen}
        onClose={() => setSpotlightOpen(false)}
        onSelectPatient={(patient) => openIntake({ mode: 'existing', patientId: patient.id })}
        onCreateNew={(prefillQuery) => openIntake({ mode: 'new', prefillQuery })}
      />
      <VisitDetailDrawer visitId={detailId} onClose={() => setDetailId(null)} onOpenVisit={setDetailId} onPay={setPayId} onCancel={setCancelId} />
      <PaymentModal visitId={payId} onClose={() => setPayId(null)} />
      <CancelVisitModal visitId={cancelId} onClose={() => setCancelId(null)} />
      <CheckInTicket visitId={ticketId} onClose={() => setTicketId(null)} />
    </div>
  )
}
