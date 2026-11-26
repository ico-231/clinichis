import { useState, type ReactNode } from 'react'
import { Copy, Eye, FlaskConical, HeartPulse, Printer, ReceiptText, ScanLine, Users, X } from 'lucide-react'
import { Tabs } from '@/components/ui/Tabs'
import { useOverlayBehavior } from '@/components/ui/Modal'
import { Portal } from '@/components/ui/Portal'
import { useToast } from '@/components/ui/Toast'
import { VisitStatusIcon } from '@/components/clinic/StatusBadges'
import { useClinicState } from '@/store/ClinicStore'
import { isLinePaid, receiptsOf } from '@/store/billing'
import { CATEGORY_LABEL, GENDER_LABEL, PAYMENT_STATUS, RELATION_LABEL, VISIT_STATUS } from '@/store/catalog'
import { formatDiagnosis } from '@/store/icd10'
import { formatDateTimeVN, formatDateVN, formatTimeRange } from '@/lib/date'
import { formatMoney, formatNumber, formatPhone } from '@/lib/format'
import { cn } from '@/lib/cn'
import { PrescriptionDoc, PrintPreviewModal } from '../examination/PrintDocs'
import { draftFromVisit } from '../examination/examDraft'
import { ReceiptModal } from '../billing/ReceiptModal'
import { ResultViewer } from '../paraclinical/ResultViewer'
import type { Patient, Visit } from '@/store/types'

type Tab = 'info' | 'rx' | 'cls' | 'receipts'

/** Ngăn chi tiết lượt khám 4 tab (ảnh 028–029, 109–113) – dùng ở Khám bệnh và Người bệnh */
export function VisitInfoDrawer({ visitId, onClose }: { visitId: string | null; onClose: () => void }) {
  if (!visitId) return null
  return <Panel key={visitId} visitId={visitId} onClose={onClose} />
}

function Panel({ visitId, onClose }: { visitId: string; onClose: () => void }) {
  useOverlayBehavior(true, onClose)
  const { visits, patients } = useClinicState()
  const [tab, setTab] = useState<Tab>('info')
  const visit = visits.find((v) => v.id === visitId)
  const patient = visit ? patients.find((p) => p.id === visit.patientId) : undefined
  if (!visit || !patient) return null

  return (
    <Portal>
      <div className="fixed inset-0 z-50 animate-fade-in bg-overlay/45" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <aside role="dialog" aria-modal="true" aria-label="Chi tiết lượt khám" className="absolute top-1.5 right-1.5 bottom-1.5 flex w-[min(660px,96vw)] animate-slide-in-right flex-col overflow-hidden rounded-xl bg-surface shadow-pop">
          <div className="relative flex shrink-0 items-center justify-center border-b border-line-soft px-4 py-2">
            <Tabs
              variant="pill"
              value={tab}
              onChange={setTab}
              items={[
                { value: 'info', label: 'Thông tin lượt khám' },
                { value: 'rx', label: 'Toa thuốc' },
                { value: 'cls', label: 'Cận lâm sàng' },
                { value: 'receipts', label: 'Phiếu thu' },
              ]}
            />
            <button type="button" onClick={onClose} className="absolute right-3 rounded-md p-1 text-ink-4 hover:bg-subtle" aria-label="Đóng">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-4 py-3 text-[13px]">
            {tab === 'info' && <InfoTab visit={visit} patient={patient} />}
            {tab === 'rx' && <RxTab visit={visit} patient={patient} />}
            {tab === 'cls' && <ClsTab visit={visit} />}
            {tab === 'receipts' && <ReceiptsTab visit={visit} />}
          </div>
        </aside>
      </div>
    </Portal>
  )
}

function Field({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : undefined}>
      <p className="text-ink-4">{label}</p>
      <div className="text-ink">{children || '--'}</div>
    </div>
  )
}

function Block({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-3">
      <h3 className="mb-2.5 flex items-center gap-1.5 font-semibold text-ink">
        {icon}
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">{children}</div>
    </section>
  )
}

function InfoTab({ visit, patient }: { visit: Visit; patient: Patient }) {
  const v = visit.vitals ?? {}
  const exam = visit.exam
  const rel = patient.relative
  const dash = (x?: string) => x || '--'
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
        <Field label="Mã KB">{visit.code}</Field>
        <Field label="STT">{visit.queueNumber}</Field>
        <Field label="Giờ khám">
          {formatTimeRange(visit.time, visit.endTime).replace(' - ', '-')} {formatDateVN(visit.date)}
        </Field>
        <Field label="Trạng thái">
          <span className="inline-flex items-center gap-1">
            <VisitStatusIcon status={visit.status} />
            {VISIT_STATUS[visit.status].label}
          </span>
        </Field>
        <Field label="Lý do khám">{visit.reason}</Field>
        <Field label="Triệu chứng">{visit.symptoms}</Field>
        <Field label="Ghi chú" full>
          {visit.note}
        </Field>
        <Field label="Chẩn đoán" full>
          {exam?.diagnoses.length ? exam.diagnoses.map(formatDiagnosis).join('; ') : ''}
        </Field>
        <Field label="Ngày tái khám">{exam?.followUpEnabled && exam.followUpDate ? formatDateVN(exam.followUpDate) : ''}</Field>
        <Field label="Loại hình">{visit.visitKind ?? 'Lịch khám'}</Field>
        <Field label="Phân loại">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-violet-500" />
            {CATEGORY_LABEL[visit.category]}
          </span>
        </Field>
        <Field label="Thanh toán">
          <span className="inline-flex items-center gap-1">
            <span className={cn('h-2 w-2 rounded-full', visit.paymentStatus === 'paid' ? 'bg-brand' : 'bg-accent')} />
            {PAYMENT_STATUS[visit.paymentStatus].label}
          </span>
        </Field>
        <Field label="Phí">{formatMoney(visit.fee)}</Field>
      </div>

      <Block icon={<HeartPulse className="h-4 w-4" />} title="Chỉ số sinh hiệu">
        <Field label="Chiều cao (cm)">{dash(v.heightCm)}</Field>
        <Field label="Cân nặng (kg)">{dash(v.weightKg)}</Field>
        <Field label="Nhiệt độ (°C)">{dash(v.temperatureC)}</Field>
        <Field label="Huyết áp (mmHg)">{`${v.bpSystolic || '--'}/${v.bpDiastolic || '--'}`}</Field>
        <Field label="Mạch (lần/phút)">{dash(v.pulse)}</Field>
        <Field label="Nhịp thở (lần/phút)">{dash(v.respiratoryRate)}</Field>
        <Field label="SpO2 (%)">{dash(v.spo2)}</Field>
        <Field label="BMI (kg/m²)">{dash(v.bmi)}</Field>
      </Block>

      <Block icon={<Users className="h-4 w-4" />} title="Người thân">
        <Field label="Họ và tên">{(rel?.fullName || patient.guardianName || '').toUpperCase()}</Field>
        <Field label="Điện thoại">{rel?.phone ? formatPhone(rel.phone) : ''}</Field>
        <Field label="Giới tính">{rel ? GENDER_LABEL[rel.gender] : ''}</Field>
        <Field label="Ngày sinh">{rel?.dob ? formatDateVN(rel.dob) : ''}</Field>
        <Field label="Mối quan hệ">{rel ? RELATION_LABEL[rel.relation] : patient.guardianRelation ? RELATION_LABEL[patient.guardianRelation] : ''}</Field>
        <Field label="Địa chỉ" full>
          {rel?.address}
        </Field>
      </Block>
    </div>
  )
}

function RxTab({ visit, patient }: { visit: Visit; patient: Patient }) {
  const toast = useToast()
  const [printOpen, setPrintOpen] = useState(false)
  const draft = draftFromVisit(visit)
  if (!draft.prescription.length) return <Empty icon={<ReceiptText className="h-6 w-6" />} text="Lượt khám này không có toa thuốc." />
  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(draft.prescription.map((i) => `${i.name} – ${i.quantity} ${i.quantityUnit}`).join('\n')).catch(() => {})
            toast({ title: 'Đã sao chép danh sách thuốc', tone: 'success' })
          }}
          className="flex items-center gap-1.5 rounded-md bg-brand-tint px-2.5 py-1 text-[12.5px] font-medium text-brand-ink hover:bg-brand-soft"
        >
          <Copy className="h-3.5 w-3.5" /> Sao chép toa
        </button>
        <button type="button" onClick={() => setPrintOpen(true)} className="rounded-md p-1.5 text-ink-3 hover:bg-subtle" aria-label="In đơn thuốc" title="In đơn thuốc">
          <Printer className="h-4 w-4" />
        </button>
      </div>
      <div className="paper rounded-md border border-line bg-surface px-6 py-5 font-doc text-[12.5px] leading-6 text-black">
        <PrescriptionDoc visit={visit} patient={patient} draft={draft} />
      </div>
      <PrintPreviewModal open={printOpen} title="Đơn thuốc" onClose={() => setPrintOpen(false)}>
        <PrescriptionDoc visit={visit} patient={patient} draft={draft} />
      </PrintPreviewModal>
    </>
  )
}

function ClsTab({ visit }: { visit: Visit }) {
  const [viewing, setViewing] = useState<string | null>(null)
  const orders = visit.paraclinicalOrders ?? []
  if (!orders.length) return <Empty icon={<FlaskConical className="h-6 w-6" />} text="Lượt khám này không có chỉ định cận lâm sàng." />
  const groups = new Map<string, typeof orders>()
  orders.forEach((o) => groups.set(o.providerName, [...(groups.get(o.providerName) ?? []), o]))
  const firstSent = orders.map((o) => o.sentAt).filter(Boolean).sort()[0]
  return (
    <>
      <div className="grid grid-cols-[1fr_130px_110px] border-b border-line pb-2 text-[12.5px] font-medium text-ink-4">
        <span>Tên chỉ định</span>
        <span>Trạng thái</span>
        <span className="text-right">Thao tác</span>
      </div>
      {firstSent && <p className="bg-brand-tint/60 px-2 py-1.5 text-[12.5px] text-brand-ink">Ngày chỉ định {formatDateTimeVN(firstSent)}</p>}
      {[...groups.entries()].map(([name, items]) => {
        const done = items.filter((o) => o.resultStatus === 'has_result').length
        return (
          <div key={name} className="border-b border-line-soft py-1">
            <div className="flex items-center justify-between py-1.5">
              <b>{name}</b>
              <span className="flex items-center gap-2 text-xs text-ink-4">
                <span className="h-1.5 w-20 overflow-hidden rounded-full bg-line">
                  <span className="block h-full bg-brand" style={{ width: `${(done / items.length) * 100}%` }} />
                </span>
                {done}/{items.length} hoàn thành · Tạm tính: {formatMoney(items.reduce((s, o) => s + o.unitPrice * o.quantity, 0))}
              </span>
            </div>
            {items.map((o) => {
              const paid = isLinePaid(visit, { kind: 'paraclinical', refId: o.id })
              const has = o.resultStatus === 'has_result'
              return (
                <div key={o.id} className="grid grid-cols-[1fr_130px_110px] items-center py-1.5">
                  <span className="flex items-center gap-2">
                    <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', o.category === 'imaging' ? 'bg-violet-50 text-violet-600' : 'bg-accent-tint text-accent-ink')}>
                      {o.category === 'imaging' ? <ScanLine className="h-3.5 w-3.5" /> : <FlaskConical className="h-3.5 w-3.5" />}
                    </span>
                    <span>
                      {o.name}
                      <span className="block text-xs text-brand-ink">{formatMoney(o.unitPrice * o.quantity)}</span>
                    </span>
                  </span>
                  <span className="flex flex-col items-start gap-1 text-[11.5px] font-medium">
                    <span className={cn('rounded-full px-2 py-0.5', paid ? 'bg-brand-soft text-brand-ink' : 'bg-accent-tint text-accent-ink')}>{paid ? 'Đã thanh toán' : 'Chưa thanh toán'}</span>
                    <span className={cn('rounded-full px-2 py-0.5', has ? 'bg-brand-soft text-brand-ink' : 'bg-accent-tint text-accent-ink')}>{has ? 'Có kết quả' : 'Chờ kết quả'}</span>
                  </span>
                  <span className="text-right">
                    <button
                      type="button"
                      disabled={!has}
                      onClick={() => setViewing(o.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[12px] text-ink-2 hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Eye className="h-3.5 w-3.5" /> Xem kết quả
                    </button>
                  </span>
                </div>
              )
            })}
          </div>
        )
      })}
      <ResultViewer visitId={visit.id} orderId={viewing} onClose={() => setViewing(null)} />
    </>
  )
}

export function ReceiptsTab({ visit }: { visit: Visit }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const receipts = receiptsOf(visit)
  if (!receipts.length) return <Empty icon={<ReceiptText className="h-6 w-6" />} text="Chưa có phiếu thu cho lượt khám này." />
  return (
    <>
      <table className="w-full">
        <thead className="text-[12.5px] text-ink-4">
          <tr className="border-b border-line">
            <th className="w-6 py-2 text-left font-medium">#</th>
            <th className="py-2 text-left font-medium">Tên phiếu thu</th>
            <th className="py-2 text-left font-medium">Số phiếu</th>
            <th className="py-2 text-left font-medium">Ngày thu</th>
            <th className="py-2 text-left font-medium">Người thu</th>
            <th className="py-2 text-right font-medium">Tổng tiền</th>
          </tr>
        </thead>
        <tbody>
          {receipts.map((r, i) => (
            <tr key={r.id} className="border-b border-line-soft">
              <td className="py-2">{i + 1}</td>
              <td className="py-2">{r.lines?.some((l) => l.kind === 'paraclinical') ? 'Công khám và dịch vụ' : 'Công khám'}</td>
              <td className="py-2">
                <button type="button" onClick={() => setOpenId(r.id)} className="text-brand-ink hover:underline">
                  {r.code ?? r.id.toUpperCase()}
                </button>
              </td>
              <td className="py-2">{formatDateTimeVN(r.at)}</td>
              <td className="py-2">{r.cashier ?? '--'}</td>
              <td className="py-2 text-right tabular-nums">{formatNumber(r.amount)}đ</td>
            </tr>
          ))}
        </tbody>
      </table>
      {openId && <ReceiptModal visitId={visit.id} paymentId={openId} onClose={() => setOpenId(null)} />}
    </>
  )
}

function Empty({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center text-ink-4">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-subtle text-ink-5">{icon}</span>
      {text}
    </div>
  )
}
