import { useEffect, useMemo, useState } from 'react'
import { ChevronUp, Pencil } from 'lucide-react'
import { Button, Kbd } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import { lineNet, receiptsOf, unpaidLines } from '@/store/billing'
import { PAYMENT_METHOD_LABEL } from '@/store/catalog'
import { formatDateTimeVN } from '@/lib/date'
import { formatMoney, formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'
import { InvoiceInfoModal, emptyInvoice } from './InvoiceInfoModal'
import { ReceiptModal } from './ReceiptModal'
import type { InvoiceInfo, PaymentMethod, ReceiptLine } from '@/store/types'

type DiscountMode = 'vnd' | 'pct'
interface Draftline extends ReceiptLine {
  selected: boolean
  mode: DiscountMode
  /** Giá trị nhập (VNĐ hoặc %) */
  input: number
}

const METHOD_OPTIONS = (['ewallet', 'transfer', 'cash', 'card'] as PaymentMethod[]).map((m) => ({ value: m, label: PAYMENT_METHOD_LABEL[m] }))

const toVnd = (base: number, mode: DiscountMode, input: number) => Math.min(base, Math.max(0, mode === 'pct' ? Math.round((base * Math.min(input, 100)) / 100) : input))

/** Thu tiền theo từng dòng dịch vụ (ảnh 031, 041). Sau khi thu sẽ mở phiếu thu (042). */
export function CheckoutModal({ visitId, onClose }: { visitId: string | null; onClose: () => void }) {
  if (!visitId) return null
  return <Checkout key={visitId} visitId={visitId} onClose={onClose} />
}

function Checkout({ visitId, onClose }: { visitId: string; onClose: () => void }) {
  const { visits, patients } = useClinicState()
  const { checkout } = useClinicActions()
  const toast = useToast()
  const visit = visits.find((v) => v.id === visitId)
  const patient = visit ? patients.find((p) => p.id === visit.patientId) : undefined

  // Lượt đã huỷ không thu thêm (chỉ hoàn tiền khi huỷ)
  const [lines, setLines] = useState<Draftline[]>(() => (visit && visit.status !== 'cancelled' ? unpaidLines(visit).map((l) => ({ ...l, selected: true, mode: 'vnd', input: 0 })) : []))
  const [discountMode, setDiscountMode] = useState<DiscountMode>('vnd')
  const [discountInput, setDiscountInput] = useState(0)
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [issueInvoice, setIssueInvoice] = useState(false)
  const [invoice, setInvoice] = useState<InvoiceInfo | null>(null)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [receiptId, setReceiptId] = useState<string | null>(null)

  const chosen = lines.filter((l) => l.selected)
  const lineTotals = chosen.map((l) => ({ ...l, discount: toVnd(l.unitPrice * l.quantity, l.mode, l.input) }))
  const serviceTotal = lineTotals.reduce((s, l) => s + lineNet(l), 0)
  const overallDiscount = toVnd(serviceTotal, discountMode, discountInput)
  const due = serviceTotal - overallDiscount
  const [customerPaid, setCustomerPaid] = useState<number | null>(null)
  // Chỉ tiền mặt mới có tiền thừa; chuyển khoản / thẻ / ví thu đúng số khách cần trả
  const paidInput = method === 'cash' ? (customerPaid ?? due) : due
  const change = paidInput - due

  const error = !chosen.length ? 'Chọn ít nhất một dịch vụ để thu' : paidInput < due ? 'Khách thanh toán chưa đủ số tiền cần trả' : issueInvoice && !invoice ? 'Nhập thông tin hoá đơn trước khi thanh toán' : null

  const pay = () => {
    if (error || !visit || !patient) return
    const record = checkout(visit.id, {
      lines: lineTotals.map(({ selected: _s, mode: _m, input: _i, ...l }) => l),
      discount: overallDiscount,
      customerPaid: paidInput,
      method,
      invoice: issueInvoice && invoice ? invoice : undefined,
    })
    if (!record) return
    toast({ title: `Đã thu ${formatMoney(record.amount)}`, description: `${patient.fullName} · Phiếu ${record.code} · ${PAYMENT_METHOD_LABEL[method]}`, tone: 'success' })
    setReceiptId(record.id)
  }

  useEffect(() => {
    if (receiptId || invoiceOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault()
        e.stopImmediatePropagation()
        pay()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  const groups = useMemo(
    () => [
      { title: 'Công khám', items: lines.filter((l) => l.kind === 'consultation') },
      { title: 'Cận lâm sàng', items: lines.filter((l) => l.kind === 'paraclinical') },
    ],
    [lines],
  )

  if (!visit || !patient) return null
  if (receiptId) return <ReceiptModal visitId={visit.id} paymentId={receiptId} onClose={onClose} />

  const patch = (key: string, p: Partial<Draftline>) => setLines((ls) => ls.map((l) => (`${l.kind}:${l.refId}` === key ? { ...l, ...p } : l)))
  const allSelected = lines.length > 0 && lines.every((l) => l.selected)
  const receipts = receiptsOf(visit)

  return (
    <>
      <Modal
        open
        onClose={onClose}
        size="xl"
        title="Thu tiền"
        description={`${patient.fullName} · ${visit.code} · STT ${visit.queueNumber}`}
        footer={
          <>
            {error && lines.length > 0 && <span className="mr-auto text-[12.5px] text-red-600">{error}</span>}
            <Button variant="outline" onClick={onClose} rightIcon={<Kbd>ESC</Kbd>} className="min-w-32">
              Đóng
            </Button>
            {lines.length > 0 && (
              <Button onClick={pay} disabled={!!error} rightIcon={<Kbd tone="blue">F9</Kbd>} className="min-w-40">
                Thanh toán
              </Button>
            )}
          </>
        }
      >
        {lines.length === 0 ? (
          <div className="space-y-3">
            <p className={cn('rounded-md px-3 py-2 text-[13px]', visit.status === 'cancelled' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-700')}>
              {visit.status === 'cancelled' ? 'Lượt khám đã huỷ – không thu thêm tiền.' : 'Lượt khám đã thanh toán đủ. Không còn dịch vụ nào cần thu.'}
            </p>
            {receipts.length > 0 && (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-[13px]">
                {receipts.map((r) => (
                  <li key={r.id} className="flex items-center justify-between px-3 py-2">
                    <span>
                      <b>{r.code ?? 'Phiếu thu'}</b> · {formatDateTimeVN(r.at)} · {PAYMENT_METHOD_LABEL[r.method]}
                    </span>
                    <span className="flex items-center gap-3">
                      <b className="tabular-nums">{formatMoney(r.amount)}</b>
                      <Button size="sm" variant="outline" onClick={() => setReceiptId(r.id)}>
                        Xem phiếu
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.45fr_1fr]">
            {/* Bảng dịch vụ */}
            <div className="rounded-lg border border-slate-200">
              <button type="button" onClick={() => setCollapsed((c) => !c)} className="flex w-full items-center justify-between px-3 py-2.5">
                <span className="text-[15px] font-semibold text-slate-900">Dịch vụ</span>
                <ChevronUp className={cn('h-4 w-4 text-slate-500 transition-transform', collapsed && 'rotate-180')} />
              </button>
              {!collapsed && (
                <table className="w-full text-[13px]">
                  <thead className="bg-slate-50 text-[12.5px] text-slate-600">
                    <tr>
                      <th className="w-8 py-2 pl-3 text-left">
                        <CheckBox checked={allSelected} onChange={(v) => setLines((ls) => ls.map((l) => ({ ...l, selected: v })))} label="Chọn tất cả" />
                      </th>
                      <th className="py-2 text-left font-medium">Tên dịch vụ</th>
                      <th className="w-9 py-2 text-center font-medium">SL</th>
                      <th className="w-12 py-2 text-center font-medium">ĐVT</th>
                      <th className="w-20 py-2 text-right font-medium">Đơn giá</th>
                      <th className="w-[150px] py-2 text-right font-medium">Giảm giá</th>
                      <th className="w-24 py-2 pr-3 text-right font-medium">Thanh toán</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map(
                      (g) =>
                        g.items.length > 0 && (
                          <GroupRows key={g.title} title={g.title}>
                            {g.items.map((l) => {
                              const key = `${l.kind}:${l.refId}`
                              const base = l.unitPrice * l.quantity
                              const disc = toVnd(base, l.mode, l.input)
                              return (
                                <tr key={key} className={cn('border-t border-slate-100', !l.selected && 'text-slate-400')}>
                                  <td className="py-2 pl-3">
                                    <CheckBox checked={l.selected} onChange={(selected) => patch(key, { selected })} label={l.name} />
                                  </td>
                                  <td className="py-2 pr-2">{l.name}</td>
                                  <td className="py-2 text-center tabular-nums">{l.quantity}</td>
                                  <td className="py-2 text-center">{l.unit}</td>
                                  <td className="py-2 text-right tabular-nums">{formatNumber(l.unitPrice)}</td>
                                  <td className="py-1.5 pl-2">
                                    <DiscountInput mode={l.mode} value={l.input} disabled={!l.selected} onMode={(mode) => patch(key, { mode, input: 0 })} onValue={(input) => patch(key, { input })} />
                                  </td>
                                  <td className="py-2 pr-3 text-right font-medium tabular-nums">{formatNumber(l.selected ? base - disc : 0)}</td>
                                </tr>
                              )
                            })}
                          </GroupRows>
                        ),
                    )}
                    <tr className="border-t border-slate-200">
                      <td colSpan={6} className="py-2.5 pr-2 text-right font-semibold">
                        Tổng tiền dịch vụ
                      </td>
                      <td className="py-2.5 pr-3 text-right font-semibold tabular-nums">{formatNumber(serviceTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* Tổng hợp */}
            <div className="space-y-3">
              <div className="space-y-3 rounded-lg border border-slate-200 p-3.5 text-[13.5px]">
                <Row label={<b className="text-slate-900">Tổng tiền dịch vụ</b>} value={<b className="text-[15px]">{formatNumber(serviceTotal)}</b>} />
                <Row
                  label="Giảm giá dịch vụ"
                  value={<DiscountInput mode={discountMode} value={discountInput} onMode={(m) => (setDiscountMode(m), setDiscountInput(0))} onValue={setDiscountInput} wide />}
                />
                <div className="border-t border-slate-100" />
                <Row label={<b className="text-slate-900">Khách cần trả</b>} value={<b className="text-[15px] text-emerald-600">{formatNumber(due)}</b>} />
                <Row
                  label="Khách thanh toán"
                  value={
                    <input
                      value={formatNumber(paidInput)}
                      inputMode="numeric"
                      onChange={(e) => setCustomerPaid(Number(e.target.value.replace(/\D/g, '')) || 0)}
                      onFocus={(e) => e.target.select()}
                      disabled={method !== 'cash'}
                      title={method !== 'cash' ? 'Thanh toán không dùng tiền mặt: thu đúng số khách cần trả' : undefined}
                      className="h-9 w-[130px] rounded-md border border-slate-200 px-2.5 text-right tabular-nums outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:bg-slate-50 disabled:text-slate-600"
                      aria-label="Khách thanh toán"
                    />
                  }
                />
                <Row label="Tiền thừa trả khách" value={<span className="tabular-nums">{change > 0 ? formatNumber(change) : '--'}</span>} />
                <Row label="Phương thức thanh toán" value={<Select value={method} options={METHOD_OPTIONS} onChange={setMethod} className="w-[150px]" />} />
              </div>

              <div className="rounded-lg border border-slate-200 p-3.5 text-[13px]">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <Toggle checked={issueInvoice} onChange={(v) => (setIssueInvoice(v), v && !invoice && setInvoiceOpen(true))} />
                  <span className="text-slate-800">
                    Phát hành hoá đơn cho <b>dịch vụ</b>
                  </span>
                </label>
                <button type="button" onClick={() => setInvoiceOpen(true)} className="mt-1.5 ml-11 flex items-center gap-1.5 text-blue-600 hover:underline">
                  Thông tin hoá đơn <Pencil className="h-3.5 w-3.5" />
                </button>
                {invoice && (
                  <p className="mt-1 ml-11 text-xs text-slate-500">
                    {invoice.type === 'company' ? 'Doanh nghiệp' : 'Cá nhân'}: {invoice.name}
                    {invoice.taxCode && ` · MST ${invoice.taxCode}`}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {invoiceOpen && (
        <InvoiceInfoModal
          initial={invoice ?? emptyInvoice(patient)}
          onClose={() => {
            setInvoiceOpen(false)
            if (!invoice) setIssueInvoice(false)
          }}
          onSave={(inv) => {
            setInvoice(inv)
            setIssueInvoice(true)
            setInvoiceOpen(false)
          }}
        />
      )}
    </>
  )
}

function GroupRows({ title, children }: { title: string; children: React.ReactNode }) {
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

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-700">{label}</span>
      {value}
    </div>
  )
}

function DiscountInput({
  mode,
  value,
  onMode,
  onValue,
  disabled,
  wide,
}: {
  mode: DiscountMode
  value: number
  onMode: (m: DiscountMode) => void
  onValue: (v: number) => void
  disabled?: boolean
  wide?: boolean
}) {
  return (
    <div className={cn('flex items-center gap-1', disabled && 'pointer-events-none opacity-50')}>
      <span className="inline-flex shrink-0 rounded-md bg-slate-100 p-0.5 text-[11.5px] font-medium">
        {(['vnd', 'pct'] as const).map((m) => (
          <button key={m} type="button" onClick={() => onMode(m)} className={cn('rounded px-1.5 py-0.5', mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>
            {m === 'vnd' ? 'VNĐ' : '%'}
          </button>
        ))}
      </span>
      <input
        value={value ? formatNumber(value) : ''}
        placeholder="0"
        inputMode="numeric"
        onChange={(e) => onValue(Number(e.target.value.replace(/\D/g, '')) || 0)}
        className={cn('h-8 rounded-md border border-slate-200 px-2 text-right tabular-nums outline-none focus:border-blue-500', wide ? 'w-[96px]' : 'w-[70px]')}
        aria-label="Giảm giá"
      />
    </div>
  )
}

function CheckBox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} className="h-4 w-4 cursor-pointer accent-blue-600" />
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn('relative h-5 w-9 shrink-0 rounded-full transition', checked ? 'bg-blue-600' : 'bg-slate-300')}
    >
      <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
    </button>
  )
}
