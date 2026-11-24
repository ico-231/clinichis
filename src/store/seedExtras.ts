import { PARACLINICAL_PROVIDERS } from './paraclinicalCatalog.js'
import type { FixedSlot, ParaclinicalOrderItem, ParaclinicalServiceItem, PaymentRecord, ReceiptLine, ResultFile, Schedules, StaffMember, Visit } from './types.js'
import { SERVICES } from './catalog.js'

/** Danh mục CLS của lab nội bộ (ảnh 123) – dữ liệu mẫu */
export const INTERNAL_CLS_SEED: ParaclinicalServiceItem[] = [
  { id: 'cls_i1', providerId: 'lab_internal', name: 'Công thức máu (tổng phân tích tế bào máu)', groupLabel: 'HUYẾT HỌC (lần)', category: 'lab', price: 90_000, unit: 'Lần', classification: 'Huyết học', room: 'Mặc định', returnsResult: true, printLayout: 'portrait' },
  { id: 'cls_i2', providerId: 'lab_internal', name: 'CRP định lượng', groupLabel: 'MIỄN DỊCH (lần)', category: 'lab', price: 120_000, unit: 'Lần', classification: 'Miễn dịch', room: 'Mặc định', returnsResult: true, printLayout: 'portrait' },
  { id: 'cls_i3', providerId: 'lab_internal', name: 'Tổng phân tích nước tiểu', groupLabel: 'SINH HOÁ (lần)', category: 'lab', price: 60_000, unit: 'Lần', classification: 'Sinh hoá', room: 'Mặc định', returnsResult: true, printLayout: 'portrait' },
  { id: 'cls_i4', providerId: 'lab_internal', name: 'Test nhanh cúm A/B', groupLabel: 'VI SINH (lần)', category: 'lab', price: 150_000, unit: 'Lần', classification: 'Vi sinh', room: 'Mặc định', returnsResult: true, printLayout: 'portrait' },
  { id: 'cls_i5', providerId: 'lab_internal', name: 'Siêu âm bụng tổng quát', groupLabel: 'SIÊU ÂM (lượt)', category: 'imaging', price: 150_000, unit: 'Lượt', classification: 'Siêu âm', room: 'Mặc định', returnsResult: true, printLayout: 'portrait' },
  { id: 'cls_i6', providerId: 'lab_internal', name: 'X-quang ngực thẳng', groupLabel: 'X-QUANG (lượt)', category: 'imaging', price: 120_000, unit: 'Lượt', classification: 'X-quang', room: 'Mặc định', returnsResult: true, printLayout: 'portrait' },
  { id: 'cls_i7', providerId: 'lab_internal', name: 'Đo điện tim', groupLabel: 'THĂM DÒ CHỨC NĂNG (lượt)', category: 'imaging', price: 40_000, unit: 'Lượt', classification: 'Thăm dò chức năng', room: 'Mặc định', returnsResult: false, printLayout: 'landscape' },
]

const LAB_RESULTS: Record<string, [string, string, string][]> = {
  cls_i1: [
    ['WBC', '9,2', '4,0 – 10,0 G/L'],
    ['NEU %', '62', '40 – 74 %'],
    ['HGB', '121', '110 – 150 g/L'],
    ['PLT', '286', '150 – 400 G/L'],
  ],
  cls_i2: [['CRP', '12,4', '< 5 mg/L']],
  cls_i3: [
    ['Bạch cầu', 'Âm tính', 'Âm tính'],
    ['Nitrit', 'Âm tính', 'Âm tính'],
    ['Protein', 'Âm tính', '< 0,15 g/L'],
  ],
  cls_i4: [
    ['Cúm A', 'Âm tính', 'Âm tính'],
    ['Cúm B', 'Âm tính', 'Âm tính'],
  ],
}

const IMAGING_RESULTS: Record<string, { description: string; conclusion: string }> = {
  cls_i5: {
    description: '<ul><li>Gan không to, nhu mô đồng nhất.</li><li>Túi mật thành mỏng, không sỏi.</li><li>Hai thận không ứ nước.</li><li>Vài hạch mạc treo kích thước &lt; 10mm.</li></ul>',
    conclusion: '<b>Hạch mạc treo phản ứng. Chưa ghi nhận bất thường khác.</b>',
  },
  cls_i6: {
    description: '<ul><li>Rốn phổi hai bên đậm.</li><li>Không thấy đám mờ khu trú.</li><li>Bóng tim không to.</li></ul>',
    conclusion: '<b>Hình ảnh viêm phế quản.</b>',
  },
}

/** Ảnh kết quả xét nghiệm dạng SVG (bảng chỉ số) – nhẹ, hiển thị được như ảnh */
function labSheet(name: string, rows: [string, string, string][], patientName: string): string {
  const h = 70 + rows.length * 24
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const body = rows
    .map(
      ([k, v, ref], i) =>
        `<text x="20" y="${78 + i * 24}" font-size="13">${esc(k)}</text><text x="210" y="${78 + i * 24}" font-size="13" font-weight="bold">${esc(v)}</text><text x="300" y="${78 + i * 24}" font-size="12" fill="#555">${esc(ref)}</text>`,
    )
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="${h}" font-family="Arial"><rect width="100%" height="100%" fill="#fff"/><text x="20" y="26" font-size="15" font-weight="bold">${esc(name)}</text><text x="20" y="46" font-size="12" fill="#333">Người bệnh: ${esc(patientName)}</text><line x1="20" x2="460" y1="56" y2="56" stroke="#999"/>${body}</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t + 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const isoAt = (date: string, time: string, plus = 0) => {
  const [h, m] = time.split(':').map(Number)
  const d = new Date(`${date}T00:00:00`)
  d.setHours(h, m + plus, 0, 0)
  return d.toISOString()
}

const order = (svc: ParaclinicalServiceItem, idx: string): ParaclinicalOrderItem => {
  const p = PARACLINICAL_PROVIDERS.find((x) => x.id === svc.providerId)!
  return {
    id: `o_${idx}`,
    serviceId: svc.id,
    providerId: p.id,
    providerName: p.name,
    providerAddress: p.address,
    name: svc.name,
    groupLabel: svc.groupLabel,
    category: svc.category,
    unitPrice: svc.price,
    quantity: 1,
    instruction: '',
  }
}

/**
 * Bổ sung dữ liệu mẫu cho các màn CLS / Thanh toán / Báo cáo:
 * - Chỉ định CLS (có kết quả với lượt đã khám, đang chờ với lượt đang khám hôm nay)
 * - Phiếu thu có mã, người thu, dòng thu
 */
export function enrichVisits(visits: Visit[], patientName: (id: string) => string, today: string): Visit[] {
  const receiptSeq = new Map<string, number>()
  return visits.map((v, i) => {
    const rand = mulberry32(i * 104729 + 7)
    let next: Visit = { ...v }
    const wantsCls = (v.status === 'done' && rand() < 0.35) || (v.status === 'in_progress' && v.date === today)
    if (wantsCls && v.serviceId !== 's7') {
      const picks = [INTERNAL_CLS_SEED[Math.floor(rand() * 4)], ...(rand() < 0.5 ? [INTERNAL_CLS_SEED[4 + Math.floor(rand() * 2)]] : [])]
      const orders = picks.map((svc, k) => {
        const o = order(svc, `${v.id}_${k}`)
        const sentAt = isoAt(v.date, v.time, 12)
        if (v.status !== 'done') return { ...o, sentAt, resultStatus: 'waiting' as const, performStatus: 'pending' as const }
        const at = isoAt(v.date, v.time, 40)
        const files: ResultFile[] = LAB_RESULTS[svc.id]
          ? [{ id: `f_${o.id}`, name: `ket-qua-${svc.id}.svg`, type: 'image/svg+xml', size: 2000, dataUrl: labSheet(svc.name, LAB_RESULTS[svc.id], patientName(v.patientId)), at }]
          : []
        const img = IMAGING_RESULTS[svc.id]
        return {
          ...o,
          sentAt,
          performStatus: 'done' as const,
          resultStatus: 'has_result' as const,
          result: { description: img?.description ?? '', conclusion: img?.conclusion ?? '', recommendation: '', images: [], files, updatedAt: at, by: 'BS.CKII Phạm Thu Hà' },
        }
      })
      const cls = orders.reduce((s, o) => s + o.unitPrice, 0)
      next = { ...next, paraclinicalOrders: orders, fee: v.fee + cls }
    }

    // Phiếu thu: bổ sung mã, người thu, dòng thu; lượt đã khám có CLS => thu đủ cả CLS
    const ck = next.consultationFee ?? 0
    const lines: ReceiptLine[] = [
      { kind: 'consultation', refId: 'ck', name: SERVICES.find((s) => s.id === v.serviceId)?.name ?? 'Công khám', unit: 'Lần', quantity: 1, unitPrice: ck, discount: 0 },
    ]
    const payments: PaymentRecord[] = next.payments.map((p) => {
      if (p.kind !== 'payment') return p
      const day = p.at.slice(0, 10).replace(/-/g, '')
      const n = (receiptSeq.get(day) ?? 0) + 1
      receiptSeq.set(day, n)
      const full = p.amount >= ck
      const allLines = next.status === 'done' && full ? [...lines, ...(next.paraclinicalOrders ?? []).map((o) => ({ kind: 'paraclinical' as const, refId: o.id, name: o.name, unit: 'Lượt', quantity: 1, unitPrice: o.unitPrice, discount: 0 }))] : full ? lines : undefined
      const amount = allLines ? allLines.reduce((s, l) => s + l.unitPrice * l.quantity, 0) : p.amount
      return { ...p, amount, code: `YMD${day}${String(n).padStart(7, '0')}`, cashier: 'Nguyễn Đắc Nghĩa', lines: allLines }
    })
    // Hoàn tiền phải khớp số đã thu
    const paid = payments.filter((p) => p.kind === 'payment').reduce((s, p) => s + p.amount, 0)
    next = { ...next, payments: payments.map((p) => (p.kind === 'refund' ? { ...p, amount: paid } : p)) }
    if (next.paymentStatus === 'paid' || next.paymentStatus === 'partial') next.paymentStatus = paid >= next.fee ? 'paid' : paid > 0 ? 'partial' : 'unpaid'
    return next
  })
}

/** Lịch làm việc mẫu: T2–T7 sáng/chiều khám tại phòng khám, T3 & T5 tối tư vấn trực tuyến */
export function seedSchedules(): Schedules {
  const fixed: FixedSlot[] = [0, 1, 2, 3, 4, 5].flatMap((wd): FixedSlot[] => [
    { id: `fx_${wd}_am`, weekday: wd, kind: 'exam' as const, start: '07:30', end: '11:30', perSlot: 2, slotMinutes: 15, enabled: true },
    ...(wd < 5 ? [{ id: `fx_${wd}_pm`, weekday: wd, kind: 'exam' as const, start: '13:30', end: '17:00', perSlot: 2, slotMinutes: 15, enabled: true }] : []),
  ])
  fixed.push(
    { id: 'fx_1_on', weekday: 1, kind: 'online' as const, start: '19:00', end: '20:30', perSlot: 1, slotMinutes: 15, enabled: true },
    { id: 'fx_3_on', weekday: 3, kind: 'online' as const, start: '19:00', end: '20:30', perSlot: 1, slotMinutes: 15, enabled: true },
  )
  return { fixed, leaves: [], flexible: [] }
}

export const SEED_STAFF: StaffMember[] = [
  { id: 'st1', lastName: 'Lê Thị', firstName: 'Hồng', email: 'hong.letan@phongkham.demo', phone: '0901234567', gender: 'female', dob: '1996-04-12', role: 'member', signProvider: 'Viettel', signUsername: '', status: 'active', createdAt: '2026-01-05T08:00:00.000Z' },
  { id: 'st2', lastName: 'Phạm Văn', firstName: 'Khoa', email: 'khoa.xetnghiem@phongkham.demo', phone: '0912345678', gender: 'male', dob: '1990-09-30', role: 'member', signProvider: 'Viettel', signUsername: '', status: 'active', createdAt: '2026-02-10T08:00:00.000Z' },
]
