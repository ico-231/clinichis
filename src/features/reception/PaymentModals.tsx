import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Checkbox, TextArea } from '@/components/ui/Field'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { paidAmount, useClinicActions, useClinicState } from '@/store/ClinicStore'
import { PAYMENT_METHOD_LABEL, toOptions } from '@/store/catalog'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { PaymentMethod } from '@/store/types'

function useVisitWithPatient(visitId: string | null) {
  const { visits, patients } = useClinicState()
  const visit = visits.find((v) => v.id === visitId) ?? null
  const patient = visit ? (patients.find((p) => p.id === visit.patientId) ?? null) : null
  return { visit, patient }
}

/** Thu tiền: dùng modal thu theo dòng dịch vụ (features/billing) */
export { CheckoutModal as PaymentModal } from '../billing/CheckoutModal'

/* ------------------------------------------------------------------ */
/* Huỷ lượt khám                                                       */
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
      title: 'Đã huỷ lượt khám',
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
      title="Huỷ lượt khám"
      description={`${patient.fullName} · ${visit.code} · ${visit.time}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Quay lại
          </Button>
          <Button variant="danger" onClick={confirm}>
            Xác nhận huỷ
          </Button>
        </>
      }
    >
      <p className="mb-2 text-[12.5px] font-medium text-slate-700">Lý do huỷ</p>
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
        error={touched && !reason.trim() ? 'Vui lòng nhập lý do huỷ' : undefined}
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
