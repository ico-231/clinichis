import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, Kbd } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { hasOpenOverlay } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import { VISIT_STATUS } from '@/store/catalog'
import { ReceptionToolbar } from './ReceptionToolbar'
import { ReceptionTable } from './ReceptionTable'
import { ExistingPatientSpotlightModal } from './ExistingPatientSpotlightModal'
import { ReceptionIntakeView, type IntakeInit } from './ReceptionIntakeView'
import { CancelVisitModal, PaymentModal } from './PaymentModals'
import { VisitDetailDrawer } from './VisitDetailDrawer'
import { CheckInTicket } from '@/components/clinic/CheckInTicket'
import { filtersRevealingVisit, nextSort, useReceptionData } from './useReceptionData'
import type { ReceptionColumnKey, Visit, VisitStatus } from '@/store/types'
import type { VisitRow } from '@/store/selectors'

export function ReceptionPage() {
  const { ui, system } = useClinicState()
  const { setReceptionView, setVisitStatus, setUI, openExam } = useClinicActions()
  const toast = useToast()
  const view = ui.reception
  const data = useReceptionData()

  const [spotlightOpen, setSpotlightOpen] = useState(false)
  const [intake, setIntake] = useState<IntakeInit | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [payId, setPayId] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [ticketId, setTicketId] = useState<string | null>(null)
  const prevSidebarCollapsedRef = useRef<boolean | null>(null)

  const openIntake = useCallback(
    (nextIntake: IntakeInit) => {
      setSpotlightOpen(false)
      if (prevSidebarCollapsedRef.current === null) {
        prevSidebarCollapsedRef.current = ui.sidebarCollapsed
      }
      if (!ui.sidebarCollapsed) {
        setUI({ sidebarCollapsed: true })
      }
      setIntake(nextIntake)
    },
    [ui.sidebarCollapsed, setUI],
  )

  const closeIntake = useCallback(() => {
    setIntake(null)
    if (prevSidebarCollapsedRef.current !== null) {
      setUI({ sidebarCollapsed: prevSidebarCollapsedRef.current })
      prevSidebarCollapsedRef.current = null
    }
  }, [setUI])

  // Được chuyển tới từ màn khác với yêu cầu Thêm bệnh cũ / mới
  useEffect(() => {
    if (!ui.receptionAction) return
    if (ui.receptionAction === 'existing') setSpotlightOpen(true)
    else openIntake({ mode: 'new' })
    setUI({ receptionAction: null })
  }, [ui.receptionAction, openIntake, setUI])

  // Phím tắt F1 / F2 như hệ thống gốc
  useEffect(() => {
    if (intake) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'F1' && e.key !== 'F2') return
      e.preventDefault()
      if (hasOpenOverlay()) return
      if (e.key === 'F1') setSpotlightOpen(true)
      else openIntake({ mode: 'new' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [intake, openIntake])

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
      // Nới bộ lọc trong MỘT lần cập nhật để lượt khám mới chắc chắn hiển thị
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

  // Nếu đang mở màn hình Tiếp nhận toàn trang (F2 hoặc chọn từ F1)
  if (intake) {
    return (
      <ReceptionIntakeView
        key={`${intake.mode}-${intake.patientId ?? 'new'}-${intake.prefillQuery ?? ''}`}
        init={intake}
        onCancel={closeIntake}
        onSaved={(visit, status, opts) => {
          // F9 "Khám bệnh": chuyển thẳng sang màn khám của lượt vừa tạo
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

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Lễ tân"
        actions={
          <>
            <Button variant="success" onClick={() => setSpotlightOpen(true)} rightIcon={<Kbd tone="green">F1</Kbd>}>
              Thêm bệnh cũ
            </Button>
            <Button onClick={() => openIntake({ mode: 'new' })} rightIcon={<Kbd tone="blue">F2</Kbd>}>
              Thêm bệnh mới
            </Button>
          </>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col px-2">
        <ReceptionToolbar />

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <ReceptionTable
            rows={data.pageRows}
            visibleColumns={view.visibleColumns}
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

        <Pagination
          page={data.page}
          pageCount={data.pageCount}
          pageSize={view.pageSize}
          total={data.sorted.length}
          onPageChange={(page) => setReceptionView({ page })}
          onPageSizeChange={(pageSize) => setReceptionView({ pageSize, page: 1 })}
        />
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
