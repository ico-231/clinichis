/**
 * Test luồng nghiệp vụ đầu-cuối trên store thật (reducer + thao tác), không cần trình duyệt:
 * tiếp nhận → khám → chỉ định CLS → thu tiền → làm CLS → kết thúc / huỷ / hoàn tiền.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createActions, reducer, type Action, type ClinicActions } from './storeLogic'
import { createSeedState } from './seed'
import { paidAmount, remainingAmount, unpaidLines } from './billing'
import { todayISO } from '@/lib/date'
import type { ClinicState, ParaclinicalOrderItem, PatientInput, VisitInput } from './types'

let state: ClinicState
let actions: ClinicActions

/** Giống ClinicProvider: dispatch chạy reducer đồng bộ, getState luôn trả bản mới nhất */
function makeStore(initial: ClinicState) {
  state = initial
  const dispatch = (a: Action) => {
    state = reducer(state, a)
  }
  actions = createActions(dispatch, () => state)
}

const patientInput = (patch: Partial<PatientInput> = {}): PatientInput => ({
  fullName: '  Bé Thử Nghiệm  ',
  dob: '2022-05-01',
  gender: 'female',
  phone: '0900000001',
  address: '',
  ...patch,
})

const visitInput = (patch: Partial<VisitInput> = {}): VisitInput => ({
  date: todayISO(),
  time: '08:00',
  serviceId: 's1',
  consultationFee: 150_000,
  fee: 150_000,
  doctorId: 'd1',
  roomId: 'r1',
  category: 'walk_in',
  source: 'direct',
  reason: ' Sốt ',
  note: '',
  checkInNow: true,
  payNow: false,
  payMethod: 'cash',
  ...patch,
})

const order = (id: string, price: number, patch: Partial<ParaclinicalOrderItem> = {}): ParaclinicalOrderItem => ({
  id,
  serviceId: `svc_${id}`,
  providerId: 'lab_internal',
  providerName: 'Lab nội bộ',
  providerAddress: '',
  name: `CLS ${id}`,
  groupLabel: '',
  category: 'lab',
  unitPrice: price,
  quantity: 1,
  instruction: '',
  ...patch,
})

const visitOf = (id: string) => state.visits.find((v) => v.id === id)!

beforeEach(() => makeStore(createSeedState()))

describe('Tiếp nhận', () => {
  it('tạo hồ sơ + lượt khám: mã BN tăng dần, tên đã cắt khoảng trắng, chờ khám, chưa thu', () => {
    const before = state.patients.length
    const { patient, visit } = actions.registerNewPatient(patientInput(), visitInput())
    expect(state.patients).toHaveLength(before + 1)
    expect(patient.fullName).toBe('Bé Thử Nghiệm')
    expect(patient.code).toMatch(/^BN\d{6}$/)
    const maxOld = Math.max(...state.patients.filter((p) => p.id !== patient.id).map((p) => Number(p.code.slice(2))))
    expect(Number(patient.code.slice(2))).toBe(maxOld + 1)
    expect(visit.status).toBe('waiting')
    expect(visit.checkedInAt).toBeTruthy()
    expect(visit.paymentStatus).toBe('unpaid')
    expect(visit.reason).toBe('Sốt')
    expect(visit.patientType).toBe('new')
  })

  it('số thứ tự trong ngày tăng liên tiếp và mã khám không trùng', () => {
    const a = actions.registerNewPatient(patientInput(), visitInput()).visit
    const b = actions.registerNewPatient(patientInput({ fullName: 'Bé B', phone: '0900000002' }), visitInput()).visit
    expect(b.queueNumber).toBe(a.queueNumber + 1)
    expect(b.code).not.toBe(a.code)
  })

  it('thu đủ ngay khi tiếp nhận: phiếu có dòng công khám + CLS, trạng thái Đã thu', () => {
    const orders = [order('x', 100_000)]
    const { visit } = actions.registerNewPatient(patientInput(), visitInput({ paraclinicalOrders: orders, fee: 250_000, payNow: true }))
    expect(visit.fee).toBe(250_000)
    expect(visit.paymentStatus).toBe('paid')
    expect(visit.payments).toHaveLength(1)
    expect(visit.payments[0].code).toBeTruthy()
    expect(visit.payments[0].lines?.map((l) => l.kind)).toEqual(['consultation', 'paraclinical'])
    expect(unpaidLines(visitOf(visit.id))).toHaveLength(0)
  })

  it('thu một phần khi tiếp nhận => Thu một phần, còn nợ đúng số', () => {
    const { visit } = actions.registerNewPatient(patientInput(), visitInput({ payNow: true, paidAmountNow: 50_000 }))
    expect(visit.paymentStatus).toBe('partial')
    expect(remainingAmount(visit)).toBe(100_000)
  })

  it('lượt 0đ không thu => Không thanh toán, không sinh dòng công khám 0đ', () => {
    const { visit } = actions.registerNewPatient(patientInput(), visitInput({ serviceId: 's0', consultationFee: 0, fee: 0 }))
    expect(visit.paymentStatus).toBe('none')
    expect(unpaidLines(visit)).toHaveLength(0)
  })

  it('đặt lịch (không tiếp nhận ngay) => Đã đăng ký, chưa có giờ check-in', () => {
    const { visit } = actions.registerNewPatient(patientInput(), visitInput({ checkInNow: false }))
    expect(visit.status).toBe('registered')
    expect(visit.checkedInAt).toBeUndefined()
  })

  it('thêm lượt cho bệnh cũ: patientType returning và cập nhật thông tin hồ sơ', () => {
    const p = state.patients[0]
    const v = actions.registerVisit(p.id, visitInput(), { phone: '0911111111' })
    expect(v.patientType).toBe('returning')
    expect(state.patients.find((x) => x.id === p.id)!.phone).toBe('0911111111')
  })
})

describe('Khám → chỉ định → thu tiền', () => {
  it('bác sĩ thêm CLS sau khi đã thu công khám: phí tăng, trạng thái về Thu một phần, chỉ còn dòng CLS', () => {
    const { visit } = actions.registerNewPatient(patientInput(), visitInput({ payNow: true }))
    expect(visit.paymentStatus).toBe('paid')
    actions.saveExam(visit.id, { paraclinicalOrders: [order('a', 200_000)] })
    const v = visitOf(visit.id)
    expect(v.fee).toBe(350_000)
    expect(v.paymentStatus).toBe('partial')
    expect(unpaidLines(v).map((l) => l.refId)).toEqual(['a'])
  })

  it('checkout theo dòng có giảm giá dòng + giảm tổng: số tiền phiếu đúng, mã phiếu tăng', () => {
    const { visit } = actions.registerNewPatient(patientInput(), visitInput({ paraclinicalOrders: [order('a', 200_000)], fee: 350_000 }))
    const lines = unpaidLines(visitOf(visit.id)).map((l) => (l.refId === 'a' ? { ...l, discount: 20_000 } : l))
    const r1 = actions.checkout(visit.id, { lines, discount: 30_000, customerPaid: 300_000, method: 'cash' })!
    expect(r1.amount).toBe(350_000 - 20_000 - 30_000)
    const v = visitOf(visit.id)
    // giảm giá được tính là đã thanh toán đủ
    expect(v.paymentStatus).toBe('paid')
    expect(unpaidLines(v)).toHaveLength(0)
    const other = actions.registerNewPatient(patientInput({ fullName: 'Bé C', phone: '0900000003' }), visitInput()).visit
    const r2 = actions.checkout(other.id, { lines: unpaidLines(visitOf(other.id)), discount: 0, customerPaid: 150_000, method: 'transfer' })!
    expect(r2.code).not.toBe(r1.code)
  })

  it('hai lần thu liên tiếp trong cùng một sự kiện đọc state mới nhất (không mất phiếu)', () => {
    const { visit } = actions.registerNewPatient(patientInput(), visitInput({ consultationFee: 100_000, fee: 100_000 }))
    actions.collectPayment(visit.id, 40_000, 'cash')
    actions.collectPayment(visit.id, 60_000, 'cash')
    const v = visitOf(visit.id)
    expect(v.payments).toHaveLength(2)
    expect(paidAmount(v)).toBe(100_000)
    expect(v.paymentStatus).toBe('paid')
  })

  it('collectPayment từ chối số âm và 0đ khi còn phí', () => {
    const { visit } = actions.registerNewPatient(patientInput(), visitInput())
    actions.collectPayment(visit.id, -1, 'cash')
    actions.collectPayment(visit.id, 0, 'cash')
    expect(visitOf(visit.id).payments).toHaveLength(0)
  })

  it('checkout không có dòng => null, không ghi phiếu', () => {
    const { visit } = actions.registerNewPatient(patientInput(), visitInput())
    expect(actions.checkout(visit.id, { lines: [], discount: 0, customerPaid: 0, method: 'cash' })).toBeNull()
    expect(visitOf(visit.id).payments).toHaveLength(0)
  })

  it('CLS chưa thu bị huỷ => bỏ khỏi số phải thu; đã thu rồi thì vẫn tính', () => {
    const { visit } = actions.registerNewPatient(patientInput(), visitInput({ paraclinicalOrders: [order('a', 200_000), order('b', 100_000)], fee: 450_000 }))
    // thu công khám + CLS a
    const lines = unpaidLines(visitOf(visit.id)).filter((l) => l.refId !== 'b')
    actions.checkout(visit.id, { lines, discount: 0, customerPaid: 350_000, method: 'cash' })
    actions.updateOrder(visit.id, 'b', { performStatus: 'cancelled' })
    let v = visitOf(visit.id)
    expect(v.fee).toBe(350_000)
    expect(v.paymentStatus).toBe('paid')
    actions.updateOrder(visit.id, 'a', { performStatus: 'no_show' })
    v = visitOf(visit.id)
    expect(v.fee).toBe(350_000)
  })

  it('KTV trả kết quả rồi bác sĩ kết thúc khám: có giờ kết thúc', () => {
    const { visit } = actions.registerNewPatient(patientInput(), visitInput({ paraclinicalOrders: [order('a', 200_000)], fee: 350_000 }))
    actions.setVisitStatus(visit.id, 'in_progress')
    actions.updateOrder(visit.id, 'a', { performStatus: 'done', resultStatus: 'has_result' })
    actions.setVisitStatus(visit.id, 'done')
    const v = visitOf(visit.id)
    expect(v.startedAt).toBeTruthy()
    expect(v.finishedAt).toBeTruthy()
    expect(v.paraclinicalOrders![0].resultStatus).toBe('has_result')
  })
})

describe('Huỷ lượt khám', () => {
  it('huỷ có hoàn tiền: phiếu hoàn = số đã thu, trạng thái Đã hoàn, CLS chưa làm bị huỷ theo', () => {
    const { visit } = actions.registerNewPatient(
      patientInput(),
      visitInput({ paraclinicalOrders: [order('a', 200_000), order('b', 100_000, { performStatus: 'done', resultStatus: 'has_result' })], fee: 450_000, payNow: true }),
    )
    actions.cancelVisit(visit.id, 'Người nhà đổi ý', true, 'transfer')
    const v = visitOf(visit.id)
    expect(v.status).toBe('cancelled')
    expect(v.paymentStatus).toBe('refunded')
    const refund = v.payments.find((p) => p.kind === 'refund')!
    expect(refund.amount).toBe(450_000)
    expect(refund.method).toBe('transfer')
    expect(paidAmount(v)).toBe(0)
    expect(v.paraclinicalOrders!.find((o) => o.id === 'a')!.performStatus).toBe('cancelled')
    expect(v.paraclinicalOrders!.find((o) => o.id === 'b')!.performStatus).toBe('done')
  })

  it('huỷ lượt chưa thu => Đã huỷ, không sinh phiếu hoàn', () => {
    const { visit } = actions.registerNewPatient(patientInput(), visitInput())
    actions.cancelVisit(visit.id, 'Không đến', true)
    const v = visitOf(visit.id)
    expect(v.paymentStatus).toBe('cancelled')
    expect(v.payments).toHaveLength(0)
  })

  it('lưu khám trên lượt đã huỷ không làm đổi trạng thái thanh toán', () => {
    const { visit } = actions.registerNewPatient(patientInput(), visitInput({ payNow: true }))
    actions.cancelVisit(visit.id, 'x', true)
    actions.saveExam(visit.id, { note: 'ghi chú' })
    expect(visitOf(visit.id).paymentStatus).toBe('refunded')
  })
})

describe('Hồ sơ người bệnh', () => {
  it('xoá được hồ sơ chỉ có lượt chưa khám, chưa thu (kèm lượt khám)', () => {
    const { patient, visit } = actions.registerNewPatient(patientInput(), visitInput({ checkInNow: false }))
    expect(actions.deletePatient(patient.id)).toBe(true)
    expect(state.patients.some((p) => p.id === patient.id)).toBe(false)
    expect(state.visits.some((v) => v.id === visit.id)).toBe(false)
  })

  it('không xoá hồ sơ đã có phiếu thu hoặc đã khám', () => {
    const paid = actions.registerNewPatient(patientInput(), visitInput({ payNow: true })).patient
    expect(actions.deletePatient(paid.id)).toBe(false)
    const examined = actions.registerNewPatient(patientInput({ fullName: 'Bé D', phone: '0900000004' }), visitInput())
    actions.setVisitStatus(examined.visit.id, 'done')
    expect(actions.deletePatient(examined.patient.id)).toBe(false)
    expect(state.patients.some((p) => p.id === paid.id)).toBe(true)
  })

  it('addPatient tạo mã mới không trùng mã cũ', () => {
    const codes = new Set(state.patients.map((p) => p.code))
    const p = actions.addPatient(patientInput())
    expect(codes.has(p.code)).toBe(false)
  })
})

describe('Điều hướng', () => {
  it('chốt chặn rời trang: từ chối thì giữ nguyên màn, forceNavigate vẫn đi', () => {
    const start = state.ui.activeRoute
    const target = start === 'patients' ? 'reception' : 'patients'
    actions.setNavigationGuard(() => false)
    actions.navigate(target)
    expect(state.ui.activeRoute).toBe(start)
    actions.forceNavigate(target)
    expect(state.ui.activeRoute).toBe(target)
    actions.setNavigationGuard(null)
  })

  it('openExam chuyển sang màn khám và nhớ lượt đang mở', () => {
    const { visit } = actions.registerNewPatient(patientInput(), visitInput())
    actions.openExam(visit.id)
    expect(state.ui.activeRoute).toBe('examination')
    expect(state.ui.examVisitId).toBe(visit.id)
  })

  it('RESET_DEMO trả về dữ liệu mẫu', () => {
    const seedCount = createSeedState().patients.length
    actions.addPatient(patientInput())
    actions.resetDemoData()
    expect(state.patients).toHaveLength(seedCount)
  })
})
