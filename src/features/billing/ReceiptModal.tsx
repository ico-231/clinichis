import { useState } from 'react'
import { Info, Printer, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useOverlayBehavior } from '@/components/ui/Modal'
import { Portal } from '@/components/ui/Portal'
import { Tabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import { lineNet } from '@/store/billing'
import { CLINIC, GENDER_LABEL, PAYMENT_METHOD_LABEL } from '@/store/catalog'
import { ageLabel, formatDateTimeVN } from '@/lib/date'
import { formatNumber, formatPhone } from '@/lib/format'
import { cn } from '@/lib/cn'
import { PrintPreviewModal } from '../examination/PrintDocs'
import { InvoiceInfoModal, emptyInvoice } from './InvoiceInfoModal'
import type { PaymentRecord, Patient, ReceiptLine, Visit } from '@/store/types'

/** Dòng hiển thị của phiếu: phiếu cũ không có dòng => một dòng tổng */
export function receiptLines(p: PaymentRecord): ReceiptLine[] {
  if (p.lines?.length) return p.lines
  return [{ kind: 'consultation', refId: 'ck', name: 'Thanh toán lượt khám', unit: 'Lần', quantity: 1, unitPrice: p.amount + (p.discount ?? 0), discount: 0 }]
}

/** "HH:mm - dd/mm/yyyy" như ảnh tham chiếu */
const fmtTime = (iso: string) => formatDateTimeVN(iso).replace(' ', ' - ')

/** Phiếu thu / hoá đơn sau thanh toán (ảnh 042, 064) */
export function ReceiptModal({ visitId, paymentId, onClose }: { visitId: string; paymentId: string; onClose: () => void }) {
  const { visits, patients } = useClinicState()
  const { updateReceiptInvoice } = useClinicActions()
  const toast = useToast()
  const [tab, setTab] = useState<'service' | 'drug'>('service')
  const [printOpen, setPrintOpen] = useState(false)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  useOverlayBehavior(true, onClose)

  const visit = visits.find((v) => v.id === visitId)
  const patient = visit ? patients.find((p) => p.id === visit.patientId) : undefined
  const receipt = visit?.payments.find((p) => p.id === paymentId)


  if (!visit || !patient || !receipt) return null
  const lines = receiptLines(receipt)
  const gross = lines.reduce((s, l) => s + lineNet(l), 0)
  const refunded = visit.paymentStatus === 'refunded'
  const issued = receipt.invoice?.status === 'issued'

  const issue = () => {
    if (!receipt.invoice) return setInvoiceOpen(true)
    updateReceiptInvoice(visit.id, receipt.id, { ...receipt.invoice, status: 'issued', issuedAt: new Date().toISOString() })
    toast({ title: 'Đã phát hành hoá đơn điện tử (mô phỏng)', description: `Gửi tới ${receipt.invoice.email || formatPhone(receipt.invoice.phone)}`, tone: 'success' })
  }

  const groups = [
    { title: 'Công khám', items: lines.filter((l) => l.kind === 'consultation') },
    { title: 'Cận lâm sàng', items: lines.filter((l) => l.kind === 'paraclinical') },
  ].filter((g) => g.items.length)
  let idx = 0

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex animate-fade-in items-start justify-center overflow-y-auto bg-slate-900/45 p-4 pt-[8vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div role="dialog" aria-modal="true" aria-label="Phiếu thu" className="w-full max-w-[880px] animate-pop-in rounded-xl bg-white shadow-2xl">
          <div className="relative flex items-center justify-center border-b border-slate-100 px-5 py-2.5">
            <Tabs
              variant="pill"
              value={tab}
              onChange={setTab}
              items={[
                { value: 'service', label: 'Dịch vụ' },
                { value: 'drug', label: 'Thuốc' },
              ]}
            />
            <button type="button" onClick={onClose} className="absolute right-4 rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Đóng">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[1.55fr_1fr]">
            <div className="overflow-hidden rounded-lg border border-slate-200 self-start">
              {tab === 'drug' ? (
                <p className="px-4 py-10 text-center text-[13px] text-slate-500">Phiếu này không có thuốc (phòng khám chỉ kê đơn, không bán thuốc).</p>
              ) : (
                <table className="w-full text-[13px]">
                  <thead className="bg-slate-50 text-[12.5px] text-slate-600">
                    <tr>
                      <th className="w-8 py-2 pl-3 text-left font-medium">#</th>
                      <th className="py-2 text-left font-medium">Tên dịch vụ</th>
                      <th className="w-16 py-2 text-center font-medium">Số lượng</th>
                      <th className="w-12 py-2 text-center font-medium">ĐVT</th>
                      <th className="w-20 py-2 text-right font-medium">Đơn giá</th>
                      <th className="w-16 py-2 text-right font-medium">Giảm giá</th>
                      <th className="w-24 py-2 pr-3 text-right font-medium">Thanh toán</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g) => (
                      <GroupBlock key={g.title} title={g.title}>
                        {g.items.map((l) => {
                          idx += 1
                          return (
                            <tr key={`${l.kind}:${l.refId}`} className="border-t border-slate-100">
                              <td className="py-2 pl-3">{idx}</td>
                              <td className="py-2">
                                {l.name}
                                {l.kind === 'consultation' && <span className="block text-xs text-slate-500">{visit.code}</span>}
                              </td>
                              <td className="py-2 text-center tabular-nums">{l.quantity}</td>
                              <td className="py-2 text-center">{l.unit}</td>
                              <td className="py-2 text-right tabular-nums">{formatNumber(l.unitPrice)}</td>
                              <td className="py-2 text-right tabular-nums">{formatNumber(l.discount)}</td>
                              <td className="py-2 pr-3 text-right tabular-nums">{formatNumber(lineNet(l))}</td>
                            </tr>
                          )
                        })}
                      </GroupBlock>
                    ))}
                    <tr className="border-t border-slate-200">
                      <td colSpan={6} className="py-2.5 pr-2 text-right font-semibold">
                        Tổng tiền
                      </td>
                      <td className="py-2.5 pr-3 text-right font-semibold tabular-nums">{formatNumber(gross)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 p-3.5 text-[13px]">
              <p className="mb-2.5 text-[14px] font-semibold text-slate-900">Thông tin thanh toán</p>
              <dl className="space-y-2.5">
                <Info2 label="Mã phiếu" value={<b>{receipt.code ?? receipt.id.toUpperCase()}</b>} />
                <Info2 label="Trạng thái" value={<Chip tone={refunded ? 'violet' : 'green'}>{refunded ? 'Đã hoàn tiền' : 'Hoàn thành'}</Chip>} />
                <Info2 label="Trạng thái phát hành hoá đơn" value={<Chip tone={issued ? 'green' : 'gray'}>{issued ? 'Đã phát hành' : 'Chưa phát hành'}</Chip>} />
                <Info2 label="Khách hàng" value={<span className="font-medium uppercase">{patient.fullName}</span>} />
                <Info2 label="Ngày bán" value={fmtTime(receipt.at)} />
                <Info2 label="Phương thức thanh toán" value={PAYMENT_METHOD_LABEL[receipt.method]} />
                <Info2 label="Người bán" value={receipt.cashier ?? '--'} />
                <Info2 label="Ghi chú" value={receipt.note || '--'} />
              </dl>
              <div className="my-3 border-t border-dashed border-slate-200" />
              <dl className="space-y-2.5">
                <Info2 label="Tổng tiền hàng" value={formatNumber(gross)} />
                <Info2
                  label={
                    <span className="flex items-center gap-1">
                      Giảm giá dịch vụ <Info className="h-3 w-3 text-slate-400" aria-label="Giảm giá trên toàn phiếu" />
                    </span>
                  }
                  value={formatNumber(receipt.discount ?? 0)}
                />
                <Info2 label={<b className="text-slate-900">Tổng tiền</b>} value={<b>{formatNumber(receipt.amount)}</b>} />
                {receipt.customerPaid !== undefined && receipt.customerPaid > receipt.amount && (
                  <Info2 label="Tiền thừa trả khách" value={formatNumber(receipt.customerPaid - receipt.amount)} />
                )}
              </dl>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
            <Button variant="soft" onClick={issue} disabled={issued || refunded} className="min-w-36">
              {issued ? 'Đã phát hành hoá đơn' : 'Phát hành hoá đơn'}
            </Button>
            <Button leftIcon={<Printer className="h-4 w-4" />} onClick={() => setPrintOpen(true)}>
              In phiếu bán hàng
            </Button>
          </div>
        </div>
      </div>

      <PrintPreviewModal open={printOpen} title="Phiếu bán hàng" onClose={() => setPrintOpen(false)}>
        <SalesReceiptDoc visit={visit} patient={patient} receipt={receipt} />
      </PrintPreviewModal>

      {invoiceOpen && (
        <InvoiceInfoModal
          initial={emptyInvoice(patient)}
          onClose={() => setInvoiceOpen(false)}
          onSave={(inv) => {
            updateReceiptInvoice(visit.id, receipt.id, { ...inv, status: 'issued', issuedAt: new Date().toISOString() })
            setInvoiceOpen(false)
            toast({ title: 'Đã phát hành hoá đơn điện tử (mô phỏng)', tone: 'success' })
          }}
        />
      )}
    </Portal>
  )
}

function GroupBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <tr className="border-t border-slate-100 bg-slate-50/70">
        <td colSpan={7} className="px-3 py-1.5 font-semibold text-slate-800">
          {title}
        </td>
      </tr>
      {children}
    </>
  )
}

function Info2({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-600">{label}</dt>
      <dd className="text-right text-slate-900">{value}</dd>
    </div>
  )
}

function Chip({ tone, children }: { tone: 'green' | 'gray' | 'violet'; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium',
        tone === 'green' ? 'bg-emerald-50 text-emerald-700' : tone === 'violet' ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-600',
      )}
    >
      {children}
    </span>
  )
}

/** Bản in "Phiếu bán hàng" (ảnh 043) */
export function SalesReceiptDoc({ visit, patient, receipt }: { visit: Visit; patient: Patient; receipt: PaymentRecord }) {
  const lines = receiptLines(receipt)
  const groups = [
    { title: 'Công khám', items: lines.filter((l) => l.kind === 'consultation') },
    { title: 'Dịch vụ', items: lines.filter((l) => l.kind === 'paraclinical') },
  ].filter((g) => g.items.length)
  const cell = 'border border-black px-1.5 py-1'
  return (
    <>
      <p className="font-bold uppercase">{CLINIC.name}</p>
      <p className="text-[12.5px]">{CLINIC.address}</p>
      <p className="text-[12.5px]">Điện thoại: {CLINIC.hotline}</p>
      <h1 className="my-5 text-center text-xl font-bold uppercase">Phiếu bán hàng</h1>
      <div className="grid grid-cols-2 gap-x-4 text-[13px]">
        <p>
          Khách hàng: <b className="uppercase">{patient.fullName}</b>
        </p>
        <p className="text-right">Giới tính: {GENDER_LABEL[patient.gender]}</p>
        <p>
          Năm sinh: {patient.dob.slice(0, 4)} ({ageLabel(patient.dob)})
        </p>
        <p className="text-right">Điện thoại: {formatPhone(patient.phone)}</p>
        <p className="col-span-2">Địa chỉ: {patient.address || '—'}</p>
        <p className="col-span-2">
          Mã phiếu: {receipt.code ?? receipt.id} · Mã khám: {visit.code}
        </p>
      </div>
      <table className="mt-4 w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {['#', 'Tên hàng hoá', 'SL', 'ĐVT', 'Giá', 'Giảm', 'T.Tiền'].map((h) => (
              <th key={h} className={cell}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <GroupPrint key={g.title} title={g.title} cell={cell}>
              {g.items.map((l, i) => (
                <tr key={`${l.kind}:${l.refId}`}>
                  <td className={cn(cell, 'text-center')}>{i + 1}</td>
                  <td className={cell}>{l.name}</td>
                  <td className={cn(cell, 'text-center')}>{l.quantity}</td>
                  <td className={cn(cell, 'text-center')}>{l.unit}</td>
                  <td className={cn(cell, 'text-right')}>{formatNumber(l.unitPrice)}</td>
                  <td className={cn(cell, 'text-right')}>{l.discount ? formatNumber(l.discount) : ''}</td>
                  <td className={cn(cell, 'text-right')}>{formatNumber(lineNet(l))}</td>
                </tr>
              ))}
            </GroupPrint>
          ))}
          {(receipt.discount ?? 0) > 0 && (
            <tr>
              <td colSpan={6} className={cn(cell, 'text-right')}>
                Giảm giá dịch vụ
              </td>
              <td className={cn(cell, 'text-right')}>-{formatNumber(receipt.discount ?? 0)}</td>
            </tr>
          )}
          <tr>
            <td colSpan={6} className={cn(cell, 'text-right font-bold')}>
              Thanh toán
            </td>
            <td className={cn(cell, 'text-right font-bold')}>{formatNumber(receipt.amount)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-[13px]">Phương thức: {PAYMENT_METHOD_LABEL[receipt.method]}</p>
      <div className="mt-6 flex justify-end">
        <div className="w-64 text-center">
          <p className="italic">Ngày in {formatDateTimeVN(new Date().toISOString())}</p>
          <p className="font-bold">Người bán</p>
          <p className="mt-14 font-bold">{receipt.cashier ?? ''}</p>
        </div>
      </div>
    </>
  )
}

function GroupPrint({ title, cell, children }: { title: string; cell: string; children: React.ReactNode }) {
  return (
    <>
      <tr>
        <td colSpan={7} className={cn(cell, 'font-bold')}>
          • {title}
        </td>
      </tr>
      {children}
    </>
  )
}
