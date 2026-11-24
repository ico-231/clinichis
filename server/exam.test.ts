import { afterEach, describe, expect, it } from 'vitest'
import type { Patient, Visit } from '../src/store/types'
import { createMemoryRepos } from './memoryRepo'
import { visitService } from './visits'
import { paymentService } from './payments'
import { examService } from './exam'
import { setReposForTest } from './http'
import * as examApi from '../api/visits/[id]/exam'
import * as finishApi from '../api/visits/[id]/finish'
import * as ordersApi from '../api/visits/[id]/orders'
import * as sendApi from '../api/visits/[id]/orders/send'
import * as orderApi from '../api/visits/[id]/orders/[orderId]'
import * as worklist from '../api/orders/index'

const clock = () => new Date('2026-11-24T02:00:00.000Z')
const NOW = clock().toISOString()
const patient: Patient = { id: 'p1', code: 'BN000001', fullName: 'Lê Minh Đức', dob: '2019-08-12', gender: 'male', phone: '0707400979', address: '', guardianName: 'Lê Văn Bố', createdAt: 'x' }

async function setup() {
  const repos = createMemoryRepos({ patients: [patient] })
  const { visit } = await visitService(repos, { clock }).register({
    patientId: 'p1',
    visit: { date: '2026-11-24', time: '09:00', serviceId: 's1', fee: 150000, doctorId: 'd1', roomId: 'r1', category: 'walk_in', source: 'direct', reason: 'Sốt', note: '', checkInNow: true, payNow: false, payMethod: 'cash' },
  })
  return { repos, visit, svc: examService(repos, { clock, doctor: 'BS. Hà' }) }
}

describe('examService — khám bệnh', () => {
  it('lưu khám: tính BMI, số lượng thuốc, tự chuyển Đang khám; giữ phần không gửi lên', async () => {
    const { svc, visit } = await setup()
    const v = await svc.saveExam(visit.id, {
      vitals: { heightCm: '120', weightKg: '24,5', temperatureC: '38,5' },
      exam: {
        medicalHistory: 'Sốt 2 ngày', diagnoses: [{ code: 'j06.9', name: 'Viêm đường hô hấp trên cấp' }],
        prescription: [{ name: 'Paracetamol 250mg', days: 3, morning: 1, evening: 1, doseUnit: 'Gói' }], advice: 'Uống nhiều nước',
      },
    })
    expect(v).toMatchObject({ status: 'in_progress', startedAt: NOW })
    expect(v.vitals).toMatchObject({ heightCm: '120', weightKg: '24,5', bmi: '17.0' })
    expect(v.exam?.diagnoses[0].code).toBe('J06.9')
    expect(v.exam?.prescription[0]).toMatchObject({ quantity: 6, quantityUnit: 'Gói' })

    const v2 = await svc.saveExam(visit.id, { exam: { advice: 'Tái khám nếu sốt cao' } })
    expect(v2.exam).toMatchObject({ advice: 'Tái khám nếu sốt cao', medicalHistory: 'Sốt 2 ngày' })
    expect(v2.exam?.prescription).toHaveLength(1)
  })

  it('kiểm tra dữ liệu khám: sinh hiệu là số, liều thuốc, ngày tái khám sau ngày khám', async () => {
    const { svc, visit } = await setup()
    await expect(svc.saveExam(visit.id, {
      vitals: { heightCm: 'cao' },
      exam: { prescription: [{ name: 'X', days: 0, morning: 0 }], followUpEnabled: true, followUpDate: '2026-11-20', diagnoses: [{}] },
    })).rejects.toMatchObject({
      status: 422,
      fields: { 'vitals.heightCm': 'Phải là số', 'prescription.0.days': expect.any(String), 'prescription.0.dose': expect.any(String), 'exam.followUpDate': expect.any(String), 'diagnoses.0': expect.any(String) },
    })
  })

  it('hoàn thành: bắt buộc chiều cao/cân nặng, hỏi lại khi chưa có chẩn đoán, gửi luôn chỉ định chưa gửi', async () => {
    const { svc, visit } = await setup()
    await expect(svc.finish(visit.id, {})).rejects.toMatchObject({ status: 422, fields: { 'vitals.heightCm': expect.any(String), 'vitals.weightKg': expect.any(String) } })
    await svc.saveExam(visit.id, { vitals: { heightCm: '120', weightKg: '24' } })
    await svc.setOrders(visit.id, { orders: [{ serviceId: 'cls_m3' }] })
    await expect(svc.finish(visit.id, {})).rejects.toMatchObject({ status: 409, fields: { diagnoses: expect.any(String) } })
    const done = await svc.finish(visit.id, { confirmNoDiagnosis: true })
    expect(done).toMatchObject({ status: 'done', finishedAt: NOW })
    expect(done.paraclinicalOrders?.[0]).toMatchObject({ sentAt: NOW, resultStatus: 'waiting' })
    await expect(svc.finish(visit.id, { confirmNoDiagnosis: true })).rejects.toMatchObject({ status: 409 })
  })

  it('không sửa được lượt đã huỷ', async () => {
    const { svc, visit, repos } = await setup()
    await visitService(repos, { clock }).cancel(visit.id, { reason: 'Bỏ về' })
    await expect(svc.saveExam(visit.id, { exam: { advice: 'x' } })).rejects.toMatchObject({ status: 409 })
  })
})

describe('examService — chỉ định & kết quả CLS', () => {
  it('thêm chỉ định: giá/tên lấy từ danh mục, cộng vào tổng phí; bỏ được chỉ định chưa thu', async () => {
    const { svc, visit } = await setup()
    const v = await svc.setOrders(visit.id, { orders: [{ serviceId: 'cls_m3', instruction: 'Lấy máu sáng', unitPrice: 1 }, { serviceId: 'cls_m2', quantity: 2 }] })
    expect(v.paraclinicalOrders?.map((o) => [o.serviceId, o.unitPrice, o.quantity])).toEqual([['cls_m3', 600000, 1], ['cls_m2', 210000, 2]])
    expect(v.fee).toBe(150000 + 600000 + 420000)
    const v2 = await svc.setOrders(visit.id, { orders: [{ serviceId: 'cls_m3' }] })
    expect(v2.paraclinicalOrders).toHaveLength(1)
    expect(v2.paraclinicalOrders?.[0].instruction).toBe('Lấy máu sáng')
    expect(v2.fee).toBe(750000)
    await expect(svc.setOrders(visit.id, { orders: [{ serviceId: 'khong-co' }, { serviceId: 'cls_m3', quantity: 0 }] })).rejects.toMatchObject({ status: 422 })
  })

  it('khoá chỉ định đã thu tiền hoặc đã có kết quả', async () => {
    const { svc, visit, repos } = await setup()
    const v = await svc.setOrders(visit.id, { orders: [{ serviceId: 'cls_m3' }, { serviceId: 'cls_m2' }] })
    const [m3, m2] = v.paraclinicalOrders!
    await paymentService(repos, { clock }).checkout(visit.id, { items: [{ kind: 'paraclinical', refId: m3.id }], method: 'cash' })
    await expect(svc.setOrders(visit.id, { orders: [{ serviceId: 'cls_m2' }] })).rejects.toMatchObject({ fields: { 'orders.cls_m3': expect.stringContaining('Đã thu tiền') } })
    await expect(svc.setOrders(visit.id, { orders: [{ serviceId: 'cls_m3', quantity: 3 }, { serviceId: 'cls_m2' }] })).rejects.toMatchObject({ fields: { 'orders.0.quantity': expect.any(String) } })

    await svc.sendOrders(visit.id)
    await svc.updateOrder(visit.id, m2.id, { result: { conclusion: 'Bình thường' } })
    await expect(svc.setOrders(visit.id, { orders: [{ serviceId: 'cls_m3' }] })).rejects.toMatchObject({ fields: { 'orders.cls_m2': expect.stringContaining('Đã có kết quả') } })
  })

  it('phòng CLS: danh sách việc, cập nhật trạng thái, trả kết quả; không đến thì bỏ tiền', async () => {
    const { svc, visit } = await setup()
    const v = await svc.setOrders(visit.id, { orders: [{ serviceId: 'cls_m3' }, { serviceId: 'cls_m2' }] })
    const [m3, m2] = v.paraclinicalOrders!
    await expect(svc.updateOrder(visit.id, m3.id, { performStatus: 'in_progress' })).rejects.toMatchObject({ status: 409 })
    expect((await svc.listOrders({})).total).toBe(0)

    await svc.sendOrders(visit.id)
    const list = await svc.listOrders({ category: 'lab' })
    expect(list.total).toBe(2)
    expect(list.items[0].patient?.fullName).toBe('Lê Minh Đức')

    expect(await svc.updateOrder(visit.id, m3.id, { performStatus: 'in_progress' })).toMatchObject({ performStatus: 'in_progress' })
    const withResult = await svc.updateOrder(visit.id, m3.id, { result: { description: 'NT-proBNP 85 pg/mL', conclusion: 'Trong giới hạn', files: [{ name: 'kq.pdf', type: 'application/pdf', dataUrl: 'data:application/pdf;base64,AAAA' }] } })
    expect(withResult).toMatchObject({ resultStatus: 'has_result', performStatus: 'done', result: { by: 'BS. Hà', conclusion: 'Trong giới hạn' } })
    await expect(svc.updateOrder(visit.id, m3.id, { performStatus: 'pending' })).rejects.toMatchObject({ status: 422 })

    await svc.updateOrder(visit.id, m2.id, { performStatus: 'no_show' })
    // Không đến ⇒ chỉ định không tính tiền nữa: tổng phí còn công khám + chỉ định đã có kết quả
    expect((await svc.listOrders({ performStatus: 'done' })).total).toBe(1)
    expect((await svc.listOrders({ performStatus: 'no_show' })).total).toBe(1)
  })
})

describe('API khám bệnh & CLS', () => {
  afterEach(() => setReposForTest(null))

  it('PUT exam → PUT orders → POST send → PATCH kết quả → POST finish; GET /api/orders', async () => {
    const { repos, visit } = await setup()
    setReposForTest(repos)
    const put = (mod: { PUT: (r: Request) => Promise<Response> }, url: string, body: unknown) => mod.PUT(new Request(url, { method: 'PUT', body: JSON.stringify(body) }))
    expect((await put(examApi, `http://x/api/visits/${visit.id}/exam`, { vitals: { heightCm: '118', weightKg: '22' }, exam: { diagnoses: [{ code: 'J06.9', name: 'Viêm họng' }] } })).status).toBe(200)
    const o = (await (await put(ordersApi, `http://x/api/visits/${visit.id}/orders`, { orders: [{ serviceId: 'cls_m3' }] })).json()) as Visit
    await sendApi.POST(new Request(`http://x/api/visits/${visit.id}/orders/send`, { method: 'POST' }))
    const wl = await worklist.GET(new Request('http://x/api/orders?dateFrom=2026-11-24&category=lab'))
    expect(((await wl.json()) as { total: number }).total).toBe(1)
    const res = await orderApi.PATCH(new Request(`http://x/api/visits/${visit.id}/orders/${o.paraclinicalOrders![0].id}`, { method: 'PATCH', body: JSON.stringify({ result: { conclusion: 'Bình thường' } }) }))
    expect(((await res.json()) as { resultStatus: string }).resultStatus).toBe('has_result')
    const fin = await finishApi.POST(new Request(`http://x/api/visits/${visit.id}/finish`, { method: 'POST', body: '{}' }))
    expect(((await fin.json()) as Visit).status).toBe('done')
  })
})
