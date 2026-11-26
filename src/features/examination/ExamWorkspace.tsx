import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, ClipboardList, ListOrdered, MoreHorizontal, Pill, Printer, Save, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDiscardModal } from '@/components/ui/ConfirmDiscardModal'
import { DropdownMenu, MenuItem } from '@/components/ui/DropdownMenu'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { remainingAmount, useClinicActions, useClinicState } from '@/store/ClinicStore'
import { GENDER_LABEL } from '@/store/catalog'
import { paidLineKeys } from '@/store/billing'
import { ageLabel } from '@/lib/date'
import { formatMoney, formatPhone } from '@/lib/format'
import { cn } from '@/lib/cn'
import { CostSummary } from '@/components/clinic/CostSummary'
import { NARROW_QUERY, useMediaQuery } from '@/lib/useMediaQuery'
import { ParaclinicalOrderModal } from '../reception/ParaclinicalOrderModal'
import { PaymentModal } from '../reception/PaymentModals'
import { VisitInfoDrawer } from '../visit/VisitInfoDrawer'
import { ResultViewer } from '../paraclinical/ResultViewer'
import { } from '../reception/UnderlineControls'
import { ClinicalSections, FollowUpSection, InfoSection, NotesSection } from './ExamSections'
import { ParaclinicalSection } from './ParaclinicalSection'
import { DiagnosisSection } from './DiagnosisSection'
import { PrescriptionSection } from './PrescriptionSection'
import { QueuePanel } from './QueuePanel'
import { OrderSheetDoc, PrescriptionDoc, PrintPreviewModal } from './PrintDocs'
import { clsTotalOf, visitConsultationFee, draftFromVisit, draftToVisitPatch, serializeDraft, type ExamDraft } from './examDraft'
import type { ParaclinicalOrderItem, Visit } from '@/store/types'

function withLiveResults(orders: ParaclinicalOrderItem[], live: ParaclinicalOrderItem[] = []) {
  const byId = new Map(live.map((o) => [o.id, o]))
  return orders.map((o) => {
    const l = byId.get(o.id)
    return l ? { ...o, performStatus: l.performStatus, result: l.result, resultStatus: l.resultStatus ?? o.resultStatus } : o
  })
}

const SECTION_TABS = [
  { id: 'sec-info', label: 'Thông tin' },
  { id: 'sec-clinical', label: 'Lâm sàng' },
  { id: 'sec-cls', label: 'Cận lâm sàng' },
  { id: 'sec-diagnosis', label: 'Chẩn đoán' },
  { id: 'sec-followup', label: 'Tái khám' },
  { id: 'sec-notes', label: 'Ghi chú' },
]

type PrintKind = 'prescription' | 'orders' | null

export function ExamWorkspace({ visitId }: { visitId: string }) {
  const { visits, patients } = useClinicState()
  const visit = visits.find((v) => v.id === visitId)
  const patient = visit ? patients.find((p) => p.id === visit.patientId) : undefined
  if (!visit || !patient) return null
  return <Workspace key={visit.id} visit={visit} patient={patient} />
}

function Workspace({ visit, patient }: { visit: Visit; patient: NonNullable<ReturnType<typeof useClinicState>['patients'][number]> }) {
  const { saveExam, openExam, forceNavigate, setNavigationGuard, startReception } = useClinicActions()
  const narrow = useMediaQuery(NARROW_QUERY)
  const [queueOpen, setQueueOpen] = useState(false)
  const toast = useToast()

  const [draft, setDraft] = useState<ExamDraft>(() => draftFromVisit(visit, patient.allergies))
  const [savedSnapshot, setSavedSnapshot] = useState(() => serializeDraft(draftFromVisit(visit, patient.allergies)))
  const dirty = serializeDraft(draft) !== savedSnapshot
  /** Lượt đã huỷ: chỉ xem, không lưu / hoàn thành / thu tiền */
  const readOnly = visit.status === 'cancelled'
  const update = useCallback((patch: Partial<ExamDraft>) => setDraft((d) => ({ ...d, ...patch })), [])

  const [vitalErrors, setVitalErrors] = useState<Set<string>>(new Set())
  const [clsOpen, setClsOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [viewResultId, setViewResultId] = useState<string | null>(null)
  const [printKind, setPrintKind] = useState<PrintKind>(null)
  const [sendRxOpen, setSendRxOpen] = useState(false)
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null)
  const [activeSection, setActiveSection] = useState(SECTION_TABS[0].id)
  const scrollerRef = useRef<HTMLDivElement>(null)
  /** Cuộn trong vùng nội dung (không dùng scrollIntoView để khỏi cuộn cả khung ngoài) */
  const scrollToSection = useCallback((id: string) => {
    const box = scrollerRef.current
    const el = document.getElementById(id)
    if (box && el) box.scrollTo({ top: el.offsetTop - 4, behavior: 'smooth' })
  }, [])

  /** Chỉ định hiển thị: bản nháp + kết quả mới nhất từ phòng CLS */
  const liveDraft = useMemo(() => ({ ...draft, orders: withLiveResults(draft.orders, visit.paraclinicalOrders) }), [draft, visit.paraclinicalOrders])

  /* ------------------------- Tổng tiền ------------------------- */
  const ck = visitConsultationFee(draft.serviceId, visit)
  const cls = clsTotalOf(draft.orders, visit.payments)
  const th = 0 // Phạm vi chỉ kê đơn, không bán thuốc
  const tt = ck + cls + th
  const paidKeys = useMemo(() => paidLineKeys(visit), [visit])
  const fullyPaid = remainingAmount({ payments: visit.payments, fee: tt }) === 0 && (tt > 0 || visit.paymentStatus === 'paid')
  // Lượt 0đ chưa có phiếu thu: không có gì để thu (trạng thái "Không thanh toán")
  const free = tt === 0 && !visit.payments.some((p) => p.kind === 'payment')

  /** Chỉ định không được xoá / sửa số lượng nữa: tiền đã thu hoặc phòng CLS đã làm */
  const lockedOrders = useMemo(() => {
    const m = new Map<string, string>()
    for (const o of liveDraft.orders) {
      if (paidKeys.has(`paraclinical:${o.id}`)) m.set(o.id, 'Đã thu tiền – cần hoàn tiền trước khi bỏ')
      else if (o.resultStatus === 'has_result') m.set(o.id, 'Đã có kết quả')
      else if (o.performStatus === 'in_progress' || o.performStatus === 'done') m.set(o.id, 'Phòng CLS đang / đã thực hiện')
    }
    return m
  }, [liveDraft.orders, paidKeys])

  /* ------------------------- Lưu ------------------------- */
  const persist = useCallback(
    (nextDraft: ExamDraft, extra: Partial<Visit> = {}) => {
      // Kết quả / trạng thái thực hiện do phòng CLS cập nhật => luôn lấy bản mới nhất từ store
      const next = { ...nextDraft, orders: withLiveResults(nextDraft.orders, visit.paraclinicalOrders) }
      const patch: Partial<Visit> = { ...draftToVisitPatch(next, visit), ...extra }
      if (extra.exam) patch.exam = { ...draftToVisitPatch(next, visit).exam!, ...extra.exam }
      // Bác sĩ bắt đầu ghi nhận => lượt chuyển sang Đang khám (kể cả khi lễ tân chưa bấm Tiếp nhận)
      if ((visit.status === 'waiting' || visit.status === 'registered') && !extra.status) {
        const at = new Date().toISOString()
        patch.status = 'in_progress'
        patch.startedAt = at
        if (!visit.checkedInAt) patch.checkedInAt = at
      }
      saveExam(visit.id, patch)
      setSavedSnapshot(serializeDraft(nextDraft))
    },
    [saveExam, visit],
  )

  const save = useCallback(() => {
    if (readOnly || (!dirty && visit.status !== 'waiting')) return
    persist(draft)
    toast({ title: 'Đã lưu thông tin khám', description: `${visit.code} · ${patient.fullName}`, tone: 'success' })
  }, [dirty, draft, persist, toast, visit, patient, readOnly])

  const [confirmNoDx, setConfirmNoDx] = useState(false)
  const finish = useCallback((force = false) => {
    if (readOnly) return
    const missing = new Set<string>()
    if (!draft.vitals.heightCm) missing.add('heightCm')
    if (!draft.vitals.weightKg) missing.add('weightKg')
    setVitalErrors(missing)
    if (missing.size) {
      scrollToSection('sec-clinical')
      toast({ title: 'Vui lòng nhập chiều cao và cân nặng', description: 'Chỉ số bắt buộc trước khi hoàn thành khám', tone: 'warning' })
      return
    }
    // Chưa có chẩn đoán: hỏi lại trước khi đóng lượt khám (thay vì chỉ báo sau khi đã xong)
    if (!force && !draft.diagnoses.length) {
      setConfirmNoDx(true)
      return
    }
    const now = new Date().toISOString()
    // Chỉ định chưa gửi được gửi luôn khi hoàn thành – cùng trạng thái "chờ kết quả" như khi bấm Gửi
    const orders = draft.orders.map((o) => (o.sentAt ? o : { ...o, sentAt: now, resultStatus: 'waiting' as const }))
    const next = { ...draft, orders }
    setDraft(next)
    persist(next, { status: 'done', finishedAt: now, startedAt: visit.startedAt ?? now, checkedInAt: visit.checkedInAt ?? now })
    toast({
      title: `Đã hoàn thành khám: ${patient.fullName}`,
      description: draft.diagnoses.length ? `Chẩn đoán: ${draft.diagnoses.map((d) => d.code || d.name).join(', ')}` : 'Chưa nhập chẩn đoán',
      tone: 'success',
    })
  }, [draft, persist, toast, visit.startedAt, visit.checkedInAt, patient.fullName, scrollToSection, readOnly])

  const sendOrders = useCallback(() => {
    if (readOnly || !draft.orders.length) return
    const now = new Date().toISOString()
    const fresh = draft.orders.filter((o) => !o.sentAt).length
    const next = { ...draft, orders: draft.orders.map((o) => (o.sentAt ? o : { ...o, sentAt: now, resultStatus: 'waiting' as const })) }
    setDraft(next)
    persist(next)
    toast({
      title: fresh ? `Đã gửi ${fresh} chỉ định tới nơi thực hiện` : 'Đã cập nhật chỉ định',
      description: [...new Set(next.orders.map((o) => o.providerName))].join(', '),
      tone: 'success',
    })
  }, [draft, persist, toast, readOnly])

  const openPay = useCallback(() => {
    if (readOnly) return
    if (free) {
      toast({ title: 'Lượt khám miễn phí', description: 'Chưa có dịch vụ tính phí nên không cần thu tiền', tone: 'info' })
      return
    }
    if (dirty) persist(draft) // phí cần khớp với chỉ định/công khám mới nhất
    setPayOpen(true)
  }, [dirty, draft, persist, free, toast, readOnly])

  const confirmSendRx = () => {
    const now = new Date().toISOString()
    persist(draft, { exam: { prescriptionSentAt: now } as Visit['exam'] })
    setSendRxOpen(false)
    toast({ title: 'Đã gửi đơn thuốc cho người bệnh', description: `Gửi tới ${formatPhone(patient.phone)} (mô phỏng)`, tone: 'success' })
  }

  const mergeOrders = (next: ParaclinicalOrderItem[]) => {
    // giữ trạng thái gửi / kết quả của chỉ định đã có
    const prev = new Map(draft.orders.map((o) => [`${o.providerId}:${o.serviceId}`, o]))
    update({
      orders: next.map((o) => {
        const old = prev.get(`${o.providerId}:${o.serviceId}`)
        return old ? { ...o, id: old.id, sentAt: old.sentAt, resultStatus: old.resultStatus, performStatus: old.performStatus, result: old.result } : o
      }),
    })
    setClsOpen(false)
  }

  const copyPrescription = (from: Visit) => {
    const rx = from.exam?.prescription ?? []
    const have = new Set(draft.prescription.map((i) => i.drugId))
    const add = rx.filter((i) => !have.has(i.drugId)).map((i) => ({ ...i, id: `rx_${Date.now().toString(36)}_${i.drugId}` }))
    update({ prescription: [...draft.prescription, ...add], advice: draft.advice || from.exam?.advice || '' })
    toast({ title: `Đã sao chép ${add.length} thuốc từ lượt ${from.time} ${from.date.split('-').reverse().join('/')}`, tone: 'success' })
    scrollToSection('sec-prescription')
  }

  /* ------------------------- Rời trang ------------------------- */
  const guardLeave = useCallback((action: () => void) => (dirty ? setPendingLeave(() => action) : action()), [dirty])

  useEffect(() => {
    setNavigationGuard(
      dirty
        ? (route) => {
            setPendingLeave(() => () => forceNavigate(route))
            return false
          }
        : null,
    )
    return () => setNavigationGuard(null)
  }, [dirty, setNavigationGuard, forceNavigate])

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  /* ------------------------- Tab theo vị trí cuộn ------------------------- */
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const onScroll = () => {
      const top = el.getBoundingClientRect().top
      let current = SECTION_TABS[0].id
      for (const t of SECTION_TABS) {
        const s = document.getElementById(t.id)
        if (s && s.getBoundingClientRect().top - top <= 24) current = t.id
      }
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) current = SECTION_TABS[SECTION_TABS.length - 1].id
      setActiveSection(current)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const title = useMemo(
    () => `${visit.code} - ${patient.fullName.toUpperCase()} - ${GENDER_LABEL[patient.gender].toUpperCase()} - ${patient.dob.slice(0, 4)} (${ageLabel(patient.dob, visit.date).toUpperCase()})`,
    [visit, patient],
  )

  return (
    <div className="flex h-full bg-canvas">
      <QueuePanel
        visit={visit}
        narrow={narrow}
        open={queueOpen}
        onClose={() => setQueueOpen(false)}
        onSelect={(id) => {
          setQueueOpen(false)
          guardLeave(() => openExam(id))
        }}
        onBack={() => guardLeave(() => openExam(null))}
        onOpenDetail={setDetailId}
        onCopyPrescription={copyPrescription}
        onAddPatient={() => guardLeave(() => startReception('new'))}
      />

      <div className="flex min-w-0 flex-1 flex-col bg-canvas">
        <header className="shrink-0 border-b border-line bg-surface px-5 py-2.5">
          <div className="flex items-center gap-3">
            {narrow && (
              <Button size="sm" variant="outline" onClick={() => setQueueOpen(true)} leftIcon={<ListOrdered className="h-3.5 w-3.5" />}>
                Hàng chờ
              </Button>
            )}
            <h1 className="min-w-0 flex-1 truncate text-[14.5px] font-bold text-ink">{title}</h1>
            {visit.status === 'done' && <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand-ink">Đã khám</span>}
            {readOnly && <span className="rounded-full bg-subtle px-2.5 py-0.5 text-xs font-semibold text-ink-3">Đã huỷ</span>}
            {dirty && <span className="text-xs font-semibold text-accent-ink">● Chưa lưu</span>}
            <DropdownMenu
              align="end"
              renderTrigger={({ ref, toggle }) => (
                <Button ref={ref} size="icon-sm" variant="ghost" onClick={toggle} aria-label="Thao tác khác">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              )}
            >
              <MenuItem icon={<ClipboardList className="h-3.5 w-3.5" />} onSelect={() => guardLeave(() => openExam(null))}>
                Về danh sách lịch khám
              </MenuItem>
              <MenuItem icon={<Printer className="h-3.5 w-3.5" />} disabled={!draft.orders.length} onSelect={() => setPrintKind('orders')}>
                In phiếu chỉ định
              </MenuItem>
              <MenuItem icon={<Pill className="h-3.5 w-3.5" />} disabled={!draft.prescription.length} onSelect={() => setPrintKind('prescription')}>
                In đơn thuốc
              </MenuItem>
            </DropdownMenu>
          </div>
          <nav className="thin-scroll mt-2 inline-flex max-w-full overflow-x-auto rounded-[10px] border border-line-strong bg-canvas p-[3px]" aria-label="Các phần khám">
            {SECTION_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => scrollToSection(t.id)}
                className={cn(
                  'shrink-0 rounded-[7px] px-3 py-1 text-[13px] whitespace-nowrap transition',
                  activeSection === t.id ? 'bg-brand font-semibold text-white' : 'font-medium text-ink-2 hover:text-ink',
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </header>

        {readOnly && (
          <p className="shrink-0 border-b border-warn-line bg-warn-soft px-5 py-2 text-[13px] font-medium text-warn-strong" role="status">
            Lượt khám đã huỷ{visit.cancelReason ? ` (${visit.cancelReason})` : ''} – chỉ xem, không chỉnh sửa được.
          </p>
        )}
        <div ref={scrollerRef} className="thin-scroll relative min-h-0 flex-1 overflow-y-auto px-5 py-3.5">
          <div className="mx-auto max-w-[1400px] space-y-3">
            {/* Lượt đã huỷ: khoá mọi ô nhập / nút bên trong */}
            <fieldset disabled={readOnly} className="contents">
              <InfoSection draft={draft} update={update} patient={patient} />
              <ClinicalSections draft={draft} update={update} vitalErrors={vitalErrors} />
              <ParaclinicalSection
                draft={liveDraft}
                update={update}
                savedOrders={visit.paraclinicalOrders ?? []}
                isPaid={(id) => paidKeys.has(`paraclinical:${id}`)}
                onAdd={() => setClsOpen(true)}
                onViewResult={setViewResultId}
                onSend={sendOrders}
                onPrint={() => setPrintKind('orders')}
              />
              <DiagnosisSection draft={draft} update={update} />
              <PrescriptionSection
                draft={draft}
                update={update}
                sentAt={visit.exam?.prescriptionSentAt}
                onPrint={() => setPrintKind('prescription')}
                onSend={() => setSendRxOpen(true)}
              />
              <FollowUpSection draft={draft} update={update} />
              <NotesSection draft={draft} update={update} />
            </fieldset>
          </div>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line bg-surface px-5 py-2.5">
          <div className="flex flex-wrap items-center gap-4">
            <CostSummary medication={th} cls={cls} consultation={ck} total={tt} />
            <button
              type="button"
              onClick={openPay}
              disabled={free || readOnly}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-[10px] border px-3.5 text-[13px] font-semibold transition',
                free
                  ? 'cursor-default border-line bg-subtle text-ink-3'
                  : fullyPaid
                    ? 'border-brand-line bg-brand-soft text-brand-ink'
                    : 'border-brand-line bg-surface text-brand-ink hover:bg-brand-tint',
              )}
              title={free ? 'Lượt khám miễn phí – không cần thu tiền' : fullyPaid ? 'Đã thu đủ' : `Còn lại ${formatMoney(remainingAmount({ payments: visit.payments, fee: tt }))}`}
            >
              {free ? 'Miễn phí' : fullyPaid ? 'Đã thu đủ' : 'Thu tiền'}
            </button>
          </div>
          <div className={cn('flex items-center gap-2', readOnly && 'hidden')}>
            <Button variant="outline" disabled={!dirty && visit.status !== 'waiting'} onClick={save} leftIcon={<Save className="h-4 w-4" />}>
              Lưu
            </Button>
            <Button onClick={() => finish()} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
              Hoàn thành
            </Button>
          </div>
        </footer>
      </div>

      <ParaclinicalOrderModal open={clsOpen} initialOrders={draft.orders} locked={lockedOrders} onClose={() => setClsOpen(false)} onConfirm={mergeOrders} />
      {payOpen && <PaymentModal visitId={visit.id} onClose={() => setPayOpen(false)} />}
      <VisitInfoDrawer visitId={detailId} onClose={() => setDetailId(null)} />
      <ResultViewer visitId={visit.id} orderId={viewResultId} onClose={() => setViewResultId(null)} />

      <PrintPreviewModal open={printKind !== null} title={printKind === 'orders' ? 'Phiếu chỉ định' : 'Đơn thuốc'} onClose={() => setPrintKind(null)}>
        {printKind === 'orders' ? <OrderSheetDoc visit={visit} patient={patient} draft={draft} /> : <PrescriptionDoc visit={visit} patient={patient} draft={draft} />}
      </PrintPreviewModal>

      <Modal
        open={sendRxOpen}
        onClose={() => setSendRxOpen(false)}
        size="sm"
        title="Xác nhận thông tin trước khi gửi"
        footer={
          <>
            <Button variant="outline" onClick={() => setSendRxOpen(false)}>
              Đóng
            </Button>
            <Button leftIcon={<Send className="h-3.5 w-3.5" />} onClick={confirmSendRx}>
              Gửi ngay
            </Button>
          </>
        }
      >
        <p className="text-[13px] text-ink-2">Gửi {draft.prescription.length} thuốc đến:</p>
        <div className="mt-2 flex items-start justify-between rounded-[12px] border border-line bg-canvas px-3 py-2.5 text-[13px]">
          <span className="text-ink-3">Người bệnh</span>
          <span className="text-right text-ink">
            <b className="uppercase">{patient.fullName}</b> ({formatPhone(patient.phone)})
            <span className="block text-xs text-ink-3">Gửi qua tin nhắn SMS / Zalo (mô phỏng, chưa kết nối thật)</span>
          </span>
        </div>
      </Modal>

      <ConfirmDiscardModal
        open={confirmNoDx}
        title="Hoàn thành khi chưa có chẩn đoán?"
        description="Lượt khám chưa có chẩn đoán. Bạn có thể quay lại nhập chẩn đoán (ICD-10) hoặc vẫn hoàn thành khám."
        cancelLabel="Nhập chẩn đoán"
        confirmLabel="Vẫn hoàn thành"
        onCancel={() => {
          setConfirmNoDx(false)
          scrollToSection('sec-diagnosis')
        }}
        onConfirm={() => {
          setConfirmNoDx(false)
          finish(true)
        }}
      />
      <ConfirmDiscardModal
        open={pendingLeave !== null}
        onCancel={() => setPendingLeave(null)}
        onConfirm={() => {
          const action = pendingLeave
          setPendingLeave(null)
          setSavedSnapshot(serializeDraft(draft)) // bỏ cờ "chưa lưu" để không chặn lần điều hướng này
          setNavigationGuard(null)
          action?.()
        }}
      />
    </div>
  )
}
