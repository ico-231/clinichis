import { serviceById } from './catalog'
import { PARACLINICAL_SERVICES } from './paraclinicalCatalog'
import type { ParaclinicalOrderItem, PaymentRecord, PaymentStatus, ReceiptLine, Visit } from './types'

import { RUNTIME } from './runtime'

const lineKey = (l: Pick<ReceiptLine, 'kind' | 'refId'>) => `${l.kind}:${l.refId}`

/** Giá trị thực của dòng sau giảm giá */
export const lineNet = (l: ReceiptLine) => Math.max(l.unitPrice * l.quantity - l.discount, 0)

/** Tổng tiền đã thu (trừ phần đã hoàn) */
export function paidAmount(visit: Pick<Visit, 'payments'>) {
  return visit.payments.reduce((sum, p) => sum + (p.kind === 'payment' ? p.amount : -p.amount), 0)
}

/** Tổng giảm giá đã áp dụng trên các phiếu thu */
export function discountAmount(visit: Pick<Visit, 'payments'>) {
  return visit.payments
    .filter((p) => p.kind === 'payment')
    .reduce((sum, p) => sum + (p.discount ?? 0) + (p.lines ?? []).reduce((s, l) => s + l.discount, 0), 0)
}

/** Số tiền còn phải thu = tổng phí − đã thu − đã giảm */
export function remainingAmount(visit: Pick<Visit, 'payments' | 'fee'>) {
  return Math.max(visit.fee - paidAmount(visit) - discountAmount(visit), 0)
}

export function derivePaymentStatus(visit: Pick<Visit, 'payments' | 'fee'>, current: PaymentStatus): PaymentStatus {
  if (current === 'refunded' || current === 'cancelled') return current
  const paid = paidAmount(visit)
  const due = Math.max(visit.fee - discountAmount(visit), 0)
  const hasReceipt = visit.payments.some((p) => p.kind === 'payment')
  // Lượt 0đ (miễn phí) không cần thu: "Không thanh toán" – trừ khi đã xác nhận phiếu thu 0đ
  if (due === 0) return hasReceipt || current === 'paid' ? 'paid' : 'none'
  if (paid <= 0) return 'unpaid'
  return paid < due ? 'partial' : 'paid'
}

/** Chỉ định bị huỷ / người bệnh không đến */
export const isVoidOrder = (o: Pick<ParaclinicalOrderItem, 'performStatus'>) => o.performStatus === 'cancelled' || o.performStatus === 'no_show'

/**
 * Chỉ định có tính tiền không: huỷ / NB không đến thì không tính,
 * trừ khi dòng đó đã nằm trong phiếu thu (khi ấy cần hoàn tiền thủ công nên vẫn giữ).
 */
export function isOrderCharged(o: ParaclinicalOrderItem, payments: PaymentRecord[] = []) {
  if (!isVoidOrder(o)) return true
  return payments.some((p) => p.kind === 'payment' && p.lines?.some((l) => l.kind === 'paraclinical' && l.refId === o.id))
}

/** Tổng tiền CLS tính phí của một lượt khám */
export const clsCharge = (orders: ParaclinicalOrderItem[] = [], payments: PaymentRecord[] = []) =>
  orders.filter((o) => isOrderCharged(o, payments)).reduce((s, o) => s + o.unitPrice * o.quantity, 0)

/** Đơn vị tính của dịch vụ CLS theo danh mục (Thiết lập › Đơn vị) để phiếu thu khớp danh mục */
export const clsUnit = (serviceId: string) => PARACLINICAL_SERVICES.find((s) => s.id === serviceId)?.unit || 'Lượt'

/** Mọi dòng có thể thu của lượt khám: công khám + từng chỉ định CLS (bỏ chỉ định huỷ chưa thu) */
export function billableLines(visit: Visit): ReceiptLine[] {
  const ck = visit.consultationFee ?? 0
  const lines: ReceiptLine[] = [
    {
      kind: 'consultation',
      refId: 'ck',
      name: serviceById(visit.serviceId)?.name ?? 'Công khám',
      unit: 'Lần',
      quantity: 1,
      unitPrice: ck,
      discount: 0,
    },
  ]
  for (const o of visit.paraclinicalOrders ?? []) {
    if (!isOrderCharged(o, visit.payments)) continue
    lines.push({ kind: 'paraclinical', refId: o.id, name: o.name, unit: clsUnit(o.serviceId), quantity: o.quantity, unitPrice: o.unitPrice, discount: 0 })
  }
  return lines
}

/**
 * Tập khoá các dòng đã thu. Phiếu thu mới ghi rõ dòng; dữ liệu cũ (không có dòng)
 * được phân bổ lần lượt từ công khám tới CLS theo số tiền đã thu.
 */
export function paidLineKeys(visit: Visit): Set<string> {
  const keys = new Set<string>()
  if (visit.paymentStatus === 'refunded') return keys
  let legacy = 0
  for (const p of visit.payments) {
    if (p.kind !== 'payment') continue
    if (p.lines?.length) p.lines.forEach((l) => keys.add(lineKey(l)))
    else legacy += p.amount
  }
  if (legacy > 0) {
    for (const l of billableLines(visit)) {
      if (keys.has(lineKey(l))) continue
      const cost = l.unitPrice * l.quantity
      if (legacy >= cost) {
        keys.add(lineKey(l))
        legacy -= cost
      } else break
    }
  }
  // Công khám 0đ được xem như đã thu khi lượt khám đã "Đã thanh toán"
  if (visit.paymentStatus === 'paid' && (visit.consultationFee ?? 0) === 0) keys.add('consultation:ck')
  return keys
}

export const isLinePaid = (visit: Visit, line: Pick<ReceiptLine, 'kind' | 'refId'>) => paidLineKeys(visit).has(lineKey(line))

export function unpaidLines(visit: Visit) {
  const paid = paidLineKeys(visit)
  return billableLines(visit).filter((l) => !paid.has(lineKey(l)))
}

/** Mã phiếu thu theo ngày: YMD + yyyymmdd + số thứ tự 7 chữ số */
export function nextReceiptCode(visits: Visit[], dateIso: string) {
  const prefix = `${RUNTIME.codePrefix}${dateIso.replace(/-/g, '')}`
  const max = visits
    .flatMap((v) => v.payments)
    .map((p) => (p.code?.startsWith(prefix) ? Number(p.code.slice(prefix.length)) : 0))
    .reduce((m, n) => Math.max(m, n), 0)
  return `${prefix}${String(max + 1).padStart(RUNTIME.seqDigits, '0')}`
}

/** Phiếu thu hiển thị được (có mã); phiếu cũ được gán mã hiển thị từ id */
export const receiptsOf = (visit: Visit): PaymentRecord[] => visit.payments.filter((p) => p.kind === 'payment')

/**
 * Lý do không được xoá hồ sơ người bệnh (null = được xoá).
 * Bệnh án và chứng từ thu tiền phải lưu trữ, nên chỉ xoá được hồ sơ chưa khám và chưa thu tiền
 * (vd. tạo nhầm, đăng ký rồi huỷ).
 */
export function patientDeleteBlock(visits: Pick<Visit, 'status' | 'payments'>[]): string | null {
  const examined = visits.filter((v) => v.status === 'done' || v.status === 'in_progress').length
  const receipts = visits.reduce((n, v) => n + v.payments.filter((p) => p.kind === 'payment').length, 0)
  if (!examined && !receipts) return null
  const parts = [examined && `${examined} lượt đã khám`, receipts && `${receipts} phiếu thu`].filter(Boolean).join(' và ')
  return `Người bệnh đã có ${parts}. Bệnh án và chứng từ thu tiền cần được lưu trữ nên không thể xoá hồ sơ.`
}
