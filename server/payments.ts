import { billableLines, derivePaymentStatus, discountAmount, isLinePaid, lineNet, paidAmount, remainingAmount, unpaidLines } from '../src/store/billing.js'
import { RUNTIME } from '../src/store/runtime.js'
import type { InvoiceInfo, PaymentMethod, PaymentRecord, ReceiptLine, Visit } from '../src/store/types.js'
import { nextReceiptCode } from './codes.js'
import { ApiError } from './errors.js'
import type { Repos } from './repo.js'
import { todayVN } from './time.js'

const METHODS: PaymentMethod[] = ['cash', 'transfer', 'card', 'ewallet']
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isMoney = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0
const uid = () => `pay_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
const key = (l: Pick<ReceiptLine, 'kind' | 'refId'>) => `${l.kind}:${l.refId}`

/** Kiểm tra thông tin xuất hoá đơn điện tử (giống form trong modal Thu tiền của 1.0) */
function parseInvoice(raw: unknown): InvoiceInfo {
  if (!isObject(raw)) throw new ApiError('validation', 'Thông tin hoá đơn không hợp lệ', { invoice: 'Phải là đối tượng' })
  const str = (k: string) => (typeof raw[k] === 'string' ? (raw[k] as string).trim() : '')
  const e: Record<string, string> = {}
  const type = raw.type === 'company' ? 'company' : raw.type === 'personal' ? 'personal' : null
  if (!type) e.type = 'personal | company'
  if (!str('name')) e.name = type === 'company' ? 'Nhập tên công ty' : 'Nhập họ tên'
  if (type === 'company' && !/^\d{10}(-\d{3})?$/.test(str('taxCode'))) e.taxCode = 'Mã số thuế gồm 10 hoặc 13 chữ số'
  if (str('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str('email'))) e.email = 'Email không hợp lệ'
  const status = raw.status === 'issued' ? 'issued' : 'not_issued'
  if (Object.keys(e).length) throw new ApiError('validation', 'Thông tin hoá đơn chưa hợp lệ', Object.fromEntries(Object.entries(e).map(([k, v]) => [`invoice.${k}`, v])))
  return {
    type: type!, name: str('name'), taxCode: str('taxCode'), email: str('email'), phone: str('phone').replace(/\D/g, ''), address: str('address'), status,
    ...(status === 'issued' ? { issuedAt: typeof raw.issuedAt === 'string' ? raw.issuedAt : new Date().toISOString() } : {}),
  }
}

/** Tổng hợp tiền của một lượt khám: các dòng thu được, đã thu, đã giảm, còn lại, các phiếu */
export function billingSummary(visit: Visit) {
  return {
    visitId: visit.id,
    fee: visit.fee,
    paid: paidAmount(visit),
    discount: discountAmount(visit),
    remaining: visit.status === 'cancelled' ? 0 : remainingAmount(visit),
    paymentStatus: visit.paymentStatus,
    lines: billableLines(visit).map((l) => ({ ...l, paid: isLinePaid(visit, l) })),
    payments: visit.payments,
  }
}

export function paymentService(repos: Repos, opts: { cashier?: string; clock?: () => Date } = {}) {
  const clock = opts.clock ?? (() => new Date())
  const cashier = opts.cashier ?? RUNTIME.userName

  const mustGet = async (id: string) => {
    const v = await repos.visits.get(id)
    if (!v) throw new ApiError('not_found', 'Không tìm thấy lượt khám')
    return v
  }

  return {
    async summary(visitId: string) {
      return billingSummary(await mustGet(visitId))
    },

    /**
     * Thu tiền theo dòng — như checkout của 1.0, nhưng giá lấy từ dữ liệu máy chủ (không tin giá client gửi):
     * { items: [{ kind, refId, discount? }], discount?, customerPaid?, method, invoice?, note? }
     */
    async checkout(visitId: string, body: unknown) {
      if (!isObject(body)) throw new ApiError('bad_request', 'Dữ liệu gửi lên phải là một đối tượng JSON')
      const visit = await mustGet(visitId)
      if (visit.status === 'cancelled') throw new ApiError('conflict', 'Lượt khám đã huỷ, không thu tiền được')

      const e: Record<string, string> = {}
      const method = body.method as PaymentMethod
      if (!METHODS.includes(method)) e.method = METHODS.join(' | ')
      const items = Array.isArray(body.items) ? body.items : []
      if (items.length === 0) e.items = 'Chọn ít nhất một dòng cần thu'
      const discount = body.discount ?? 0
      if (!isMoney(discount)) e.discount = 'Giảm giá phải là số nguyên không âm (VNĐ)'
      if (body.customerPaid !== undefined && !isMoney(body.customerPaid)) e.customerPaid = 'Tiền khách đưa phải là số nguyên không âm'
      if (Object.keys(e).length) throw new ApiError('validation', 'Dữ liệu thu tiền chưa hợp lệ', e)

      const open = new Map(unpaidLines(visit).map((l) => [key(l), l]))
      const seen = new Set<string>()
      const lines: ReceiptLine[] = []
      items.forEach((raw, i) => {
        const it = isObject(raw) ? raw : {}
        const k = `${String(it.kind)}:${String(it.refId)}`
        const base = open.get(k)
        if (!base || seen.has(k)) {
          e[`items.${i}`] = isLinePaid(visit, { kind: it.kind as ReceiptLine['kind'], refId: String(it.refId) }) ? 'Dòng này đã thu' : 'Không có dòng này để thu'
          return
        }
        seen.add(k)
        const lineDiscount = it.discount ?? 0
        if (!isMoney(lineDiscount) || lineDiscount > base.unitPrice * base.quantity) {
          e[`items.${i}.discount`] = 'Giảm giá dòng phải từ 0 tới thành tiền của dòng'
          return
        }
        lines.push({ ...base, discount: lineDiscount })
      })
      const gross = lines.reduce((s, l) => s + lineNet(l), 0)
      if (!e.discount && (discount as number) > gross) e.discount = 'Giảm giá tổng không được lớn hơn số tiền của các dòng'
      const amount = Math.max(gross - (discount as number), 0)
      if (body.customerPaid !== undefined && method === 'cash' && (body.customerPaid as number) < amount) e.customerPaid = 'Tiền khách đưa ít hơn số phải thu'
      if (Object.keys(e).length) throw new ApiError('validation', 'Dữ liệu thu tiền chưa hợp lệ', e)

      const receipt: PaymentRecord = {
        id: uid(),
        kind: 'payment',
        amount,
        method,
        at: clock().toISOString(),
        note: typeof body.note === 'string' && body.note.trim() ? body.note.trim() : undefined,
        code: await nextReceiptCode(repos, todayVN(clock())),
        lines,
        discount: discount as number,
        customerPaid: (body.customerPaid as number | undefined) ?? amount,
        cashier,
        invoice: body.invoice !== undefined ? parseInvoice(body.invoice) : undefined,
      }
      const payments = [...visit.payments, receipt]
      const updated = (await repos.visits.update(visitId, { payments, paymentStatus: derivePaymentStatus({ payments, fee: visit.fee }, visit.paymentStatus) }))!
      return { receipt, change: Math.max((receipt.customerPaid ?? amount) - amount, 0), billing: billingSummary(updated) }
    },

    /** Cập nhật thông tin / trạng thái hoá đơn điện tử của một phiếu thu */
    async setInvoice(visitId: string, paymentId: string, body: unknown) {
      const visit = await mustGet(visitId)
      const target = visit.payments.find((p) => p.id === paymentId && p.kind === 'payment')
      if (!target) throw new ApiError('not_found', 'Không tìm thấy phiếu thu')
      if (target.invoice?.status === 'issued') throw new ApiError('conflict', 'Hoá đơn đã xuất, không sửa được')
      const invoice = parseInvoice(isObject(body) && 'invoice' in body ? body.invoice : body)
      const updated = (await repos.visits.update(visitId, { payments: visit.payments.map((p) => (p.id === paymentId ? { ...p, invoice } : p)) }))!
      return updated.payments.find((p) => p.id === paymentId)!
    },
  }
}
