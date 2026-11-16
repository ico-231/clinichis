import { useState } from 'react'
import { Banknote, CreditCard, Landmark, Wallet } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Checkbox, MoneyField, Segmented, TextArea, TextField } from '@/components/ui/Field'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { paidAmount, remainingAmount, useClinicActions, useClinicState } from '@/store/ClinicStore'
import { PAYMENT_METHOD_LABEL, serviceById, toOptions } from '@/store/catalog'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { PaymentMethod } from '@/store/types'

const METHOD_ICONS: Record<PaymentMethod, React.ReactNode> = {
  cash: <Banknote className="h-3.5 w-3.5" />,
  transfer: <Landmark className="h-3.5 w-3.5" />,
  card: <CreditCard className="h-3.5 w-3.5" />,
  ewallet: <Wallet className="h-3.5 w-3.5" />,
}

function useVisitWithPatient(visitId: string | null) {
  const { visits, patients } = useClinicState()
  const visit = visits.find((v) => v.id === visitId) ?? null
  const patient = visit ? (patients.find((p) => p.id === visit.patientId) ?? null) : null
  return { visit, patient }
}

/* ------------------------------------------------------------------ */
/* Thu tiền                                                            */
/* ------------------------------------------------------------------ */

export function PaymentModal({ visitId, onClose }: { visitId: string | null; onClose: () => void }) {
  if (!visitId) return null
  return <PaymentForm key={visitId} visitId={visitId} onClose={onClose} />
}

function PaymentForm({ visitId, onClose }: { visitId: string; onClose: () => void }) {
  const { visit, patient } = useVisitWithPatient(visitId)
  const { collectPayment } = useClinicActions()
  const toast = useToast()
  const remaining = visit ? remainingAmount(visit) : 0
  const isZeroUnpaid = visit ? visit.fee === 0 && visit.paymentStatus !== 'paid' : false
  const [amount, setAmount] = useState(remaining)
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [note, setNote] = useState('')
  if (!visit || !patient) return null

  const error = isZeroUnpaid
    ? undefined
    : amount <= 0
      ? 'Số tiền phải lớn hơn 0'
      : amount > remaining
        ? `Không vượt quá số còn lại (${formatMoney(remaining)})`
        : undefined

  const confirm = () => {
    if (error) return
    collectPayment(visit.id, isZeroUnpaid ? 0 : amount, method, note.trim() || undefined)
    toast({
      title: isZeroUnpaid ? 'Đã xác nhận thanh toán (0đ)' : `Đã thu ${formatMoney(amount)}`,
      description: `${patient.fullName} · ${visit.code} · ${PAYMENT_METHOD_LABEL[method]}`,
    })
    onClose()
  }

  const rows = [
    { label: 'Dịch vụ', value: serviceById(visit.serviceId)?.name },
    { label: 'Tổng phí (CK + CLS)', value: formatMoney(visit.fee) },
    { label: 'Đã thanh toán', value: formatMoney(paidAmount(visit)) },
  ]

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Thu tiền khám"
      description={`${patient.fullName} · ${visit.code} · STT ${visit.queueNumber}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="success" onClick={confirm} disabled={!!error || (remaining === 0 && !isZeroUnpaid)}>
            Xác nhận thu
          </Button>
        </>
      }
    >
      <dl className="rounded-lg border border-slate-200 text-[13px]">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between border-b border-slate-100 px-3 py-2">
            <dt className="text-slate-500">{r.label}</dt>
            <dd className="font-medium text-slate-800 tabular-nums">{r.value}</dd>
          </div>
        ))}
        <div className="flex justify-between bg-slate-50 px-3 py-2.5">
          <dt className="font-medium text-slate-700">Còn phải thu</dt>
          <dd className="text-[15px] font-semibold text-orange-600 tabular-nums">{formatMoney(remaining)}</dd>
        </div>
      </dl>

      {remaining === 0 && !isZeroUnpaid ? (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-[13px] text-emerald-700">Lượt khám đã được thanh toán đủ.</p>
      ) : isZeroUnpaid ? (
        <p className="mt-4 rounded-md bg-blue-50 px-3 py-2 text-[13px] text-blue-700">
          Lượt khám có tổng phí 0đ. Bấm “Xác nhận thu” để hoàn tất trạng thái thanh toán.
        </p>
      ) : (
        <div className="mt-5 space-y-[18px]">
          <MoneyField label="Số tiền thu" value={amount} onChange={setAmount} error={error} />
          <div className="flex gap-1.5">
            {[remaining, Math.round(remaining / 2 / 10_000) * 10_000].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map((v) => (
              <button key={v} type="button" onClick={() => setAmount(v)} className={cn('rounded-full border px-2.5 py-0.5 text-[12px]', amount === v ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                {v === remaining ? 'Thu đủ' : 'Thu 50%'} · {formatMoney(v)}
              </button>
            ))}
          </div>
          <Segmented
            label="Hình thức"
            value={method}
            onChange={setMethod}
            options={(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => ({
              value: m,
              label: m === 'card' ? 'Thẻ' : m === 'ewallet' ? 'Ví' : PAYMENT_METHOD_LABEL[m],
              icon: METHOD_ICONS[m],
            }))}
          />
          <TextField label="Ghi chú" placeholder="VD: Mã giao dịch, người nộp tiền..." value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      )}
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Hủy lượt khám                                                       */
/* ------------------------------------------------------------------ */

const CANCEL_REASONS = ['Người nhà báo bận', 'Bé đã hết triệu chứng', 'Đổi sang ngày khác', 'Đăng ký nhầm', 'Chờ quá lâu']

export function CancelVisitModal({ visitId, onClose }: { visitId: string | null; onClose: () => void }) {
  if (!visitId) return null
  return <CancelForm key={visitId} visitId={visitId} onClose={onClose} />
}

function CancelForm({ visitId, onClose }: { visitId: string; onClose: () => void }) {
  const { visit, patient } = useVisitWithPatient(visitId)
  const { cancelVisit } = useClinicActions()
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [refund, setRefund] = useState(true)
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [touched, setTouched] = useState(false)
  if (!visit || !patient) return null
  const paid = paidAmount(visit)

  const confirm = () => {
    setTouched(true)
    if (!reason.trim()) return
    cancelVisit(visit.id, reason.trim(), refund, method)
    toast({
      title: 'Đã hủy lượt khám',
      description: `${patient.fullName} · ${visit.code}${refund && paid > 0 ? ` · hoàn ${formatMoney(paid)}` : ''}`,
      tone: 'warning',
    })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Hủy lượt khám"
      description={`${patient.fullName} · ${visit.code} · ${visit.time}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Quay lại
          </Button>
          <Button variant="danger" onClick={confirm}>
            Xác nhận hủy
          </Button>
        </>
      }
    >
      <p className="mb-2 text-[12.5px] font-medium text-slate-700">Lý do hủy</p>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {CANCEL_REASONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setReason(r)}
            className={cn('rounded-full border px-2.5 py-1 text-[12px] transition', reason === r ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}
          >
            {r}
          </button>
        ))}
      </div>
      <TextArea
        label="Chi tiết"
        required
        rows={3}
        placeholder="Nhập hoặc chọn lý do ở trên"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        error={touched && !reason.trim() ? 'Vui lòng nhập lý do hủy' : undefined}
      />
      {paid > 0 && (
        <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <Checkbox checked={refund} onChange={setRefund} label={`Hoàn tiền ${formatMoney(paid)} cho người bệnh`} description="Trạng thái thanh toán sẽ chuyển sang “Đã hoàn tiền”" />
          {refund && <Select label="Hình thức hoàn" value={method} options={toOptions(PAYMENT_METHOD_LABEL)} onChange={setMethod} triggerClassName="bg-white" />}
        </div>
      )}
    </Modal>
  )
}
