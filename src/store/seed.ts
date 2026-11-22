import { SERVICES, DOCTORS } from './catalog'
import { INITIAL_COMBOS } from './paraclinicalCatalog'
import { INITIAL_PRESCRIPTION_TEMPLATES } from './drugCatalog'
import { ICD10 } from './icd10'
import { enrichVisits, INTERNAL_CLS_SEED, seedSchedules } from './seedExtras'
import { defaultSystem } from './systemDefaults'
import { addDays, addMinutesToTime, pad, todayISO } from '@/lib/date'
import type {
  ClinicState,
  ExamRecord,
  GuardianRelation,
  Patient,
  PaymentMethod,
  PaymentRecord,
  PaymentStatus,
  ReceptionColumnKey,
  ReceptionViewState,
  Visit,
  VisitCategory,
  VisitSource,
  VisitStatus,
} from './types'

/** v3: thêm danh mục CLS nội bộ, lịch làm việc, cấu hình hệ thống, phiếu thu có dòng (xem migrations.ts) */
export const STATE_VERSION = 5

export const DEFAULT_COLUMNS: ReceptionColumnKey[] = [
  'stt',
  'fullName',
  'dob',
  'gender',
  'phone',
  'visitDate',
  'visitTime',
  'fee',
  'payment',
  'note',
  'patientType',
]

export function defaultReceptionView(): ReceptionViewState {
  const today = todayISO()
  return {
    searchInput: '',
    filters: {
      search: '',
      dateFrom: today,
      dateTo: today,
      status: 'all',
      payment: 'all',
      category: 'all',
      source: 'all',
      doctorId: 'all',
      roomId: 'all',
      patientType: 'all',
    },
    visibleColumns: DEFAULT_COLUMNS,
    sort: null,
    page: 1,
    pageSize: 20,
  }
}

/* ------------------------------------------------------------------ */
/* Dữ liệu mẫu có tính quyết định (cùng kết quả mỗi lần tạo)           */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const CHILDREN: { name: string; gender: 'male' | 'female' }[] = [
  { name: 'Nguyễn Minh Khang', gender: 'male' },
  { name: 'Trần Ngọc Hân', gender: 'female' },
  { name: 'Lê Hoàng Phúc', gender: 'male' },
  { name: 'Phạm Thảo Vy', gender: 'female' },
  { name: 'Võ Nhật Minh', gender: 'male' },
  { name: 'Hoàng Minh Châu', gender: 'female' },
  { name: 'Đặng Quốc Huy', gender: 'male' },
  { name: 'Bùi Tường Vi', gender: 'female' },
  { name: 'Hồ Thiên Ân', gender: 'male' },
  { name: 'Ngô Phương Anh', gender: 'female' },
  { name: 'Dương Khôi Nguyên', gender: 'male' },
  { name: 'Đặng An Nhiên', gender: 'female' },
  { name: 'Phan Anh Khoa', gender: 'male' },
  { name: 'Huỳnh Kim Ngân', gender: 'female' },
  { name: 'Huỳnh Tấn Phát', gender: 'male' },
  { name: 'Đỗ Bảo Trâm', gender: 'female' },
  { name: 'Đỗ Minh Quân', gender: 'male' },
  { name: 'Vũ Hà My', gender: 'female' },
  { name: 'Vũ Hải Đăng', gender: 'male' },
  { name: 'Lý Thanh Trúc', gender: 'female' },
  { name: 'Lý Gia Huy', gender: 'male' },
  { name: 'Tô Diệp Chi', gender: 'female' },
  { name: 'Trương Đăng Khoa', gender: 'male' },
  { name: 'Lâm Uyên Nhi', gender: 'female' },
  { name: 'Mai Phúc Lâm', gender: 'male' },
  { name: 'Trần Bảo Ngọc', gender: 'female' },
  { name: 'Châu Minh Trí', gender: 'male' },
  { name: 'Lê Khánh Linh', gender: 'female' },
  { name: 'Ngô Bảo Long', gender: 'male' },
  { name: 'Võ Gia Hân', gender: 'female' },
  { name: 'Bùi Tuấn Kiệt', gender: 'male' },
  { name: 'Hồ Ngọc Diệp', gender: 'female' },
  { name: 'Trần Gia Bảo', gender: 'male' },
  { name: 'Dương Tuệ Nhi', gender: 'female' },
  { name: 'Phạm Đức Anh', gender: 'male' },
  { name: 'Phan Mai Anh', gender: 'female' },
  { name: 'Nguyễn Hoàng Nam', gender: 'male' },
  { name: 'Nguyễn Ngọc Bích', gender: 'female' },
  { name: 'Lê Minh Đức', gender: 'male' },
  { name: 'Đinh Khả Hân', gender: 'female' },
]

const MOTHER_NAMES = [
  'Nguyễn Thị Thu Hà', 'Trần Thị Mỹ Linh', 'Lê Thị Ngọc Trâm', 'Phạm Thị Hồng Nhung', 'Võ Thị Kim Oanh',
  'Huỳnh Thị Thanh Thảo', 'Đỗ Thị Lan Anh', 'Bùi Thị Phương', 'Đặng Thị Bích Ngọc', 'Hồ Thị Minh Tâm',
]
const FATHER_NAMES = [
  'Nguyễn Văn Hùng', 'Trần Quốc Bảo', 'Lê Văn Thành', 'Phạm Minh Tuấn', 'Võ Đức Trung', 'Huỳnh Văn Lộc',
]
const GRAND_NAMES = ['Nguyễn Thị Lựu', 'Trần Văn Sáu', 'Lê Thị Hai']

const ADDRESSES = [
  '12 Nguyễn Trãi, P. Bến Thành, Q. 1, TP.HCM',
  '88/5 Lê Văn Sỹ, P. 14, Q. 3, TP.HCM',
  '245 Hồng Bàng, P. 11, Q. 5, TP.HCM',
  '19 Trần Hưng Đạo, P. 6, Q. 5, TP.HCM',
  '402 Nguyễn Thị Minh Khai, P. 5, Q. 3, TP.HCM',
  '57 Lý Thường Kiệt, P. 7, Q. 10, TP.HCM',
  '130/12 Âu Cơ, P. 9, Q. Tân Bình, TP.HCM',
  '76 Phan Văn Trị, P. 10, Q. Gò Vấp, TP.HCM',
  '21 Đường số 7, P. Bình Trị Đông B, Q. Bình Tân, TP.HCM',
  'Chung cư Sunrise City, Q. 7, TP.HCM',
  '15 Võ Văn Ngân, TP. Thủ Đức, TP.HCM',
  '302 Kinh Dương Vương, P. An Lạc, Q. Bình Tân, TP.HCM',
  '9 Hùng Vương, TP. Biên Hòa, Đồng Nai',
  '44 Đại lộ Bình Dương, TP. Thủ Dầu Một, Bình Dương',
  '118 Nguyễn Văn Linh, Q. 7, TP.HCM',
]

const PHONE_PREFIXES = ['090', '091', '093', '097', '098', '086', '035', '038', '070', '079', '081', '089']

const ALLERGIES = ['', '', '', '', '', 'Amoxicillin', 'Hải sản', 'Đạm sữa bò', 'Paracetamol (nổi mề đay)', 'Bụi nhà']

const REASONS_BY_SERVICE: Record<string, string[]> = {
  s1: ['Sốt cao 2 ngày, quấy khóc', 'Tiêu chảy 3 lần/ngày', 'Nôn ói sau ăn', 'Phát ban đỏ toàn thân', 'Đau bụng quanh rốn', 'Sổ mũi, nghẹt mũi về đêm', 'Đau tai trái, sốt nhẹ'],
  s2: ['Sốt kéo dài 5 ngày chưa rõ nguyên nhân', 'Co giật do sốt (tiền sử)', 'Nổi hạch cổ, sốt về chiều'],
  s3: ['Tái khám viêm phổi', 'Tái khám viêm tai giữa', 'Tái khám sau điều trị tiêu chảy', 'Tái khám hen phế quản'],
  s4: ['Ho khan kéo dài 1 tuần', 'Khò khè, thở nhanh', 'Ho đờm, sốt nhẹ', 'Viêm họng, ho về đêm'],
  s5: ['Biếng ăn, chậm tăng cân', 'Khám dinh dưỡng định kỳ', 'Tư vấn ăn dặm 6 tháng', 'Thừa cân, tư vấn chế độ ăn'],
  s6: ['Sốt cao về đêm', 'Nôn nhiều, mệt lả', 'Ho nhiều, khó ngủ'],
  s7: ['Tư vấn tiêm 6 trong 1', 'Tư vấn tiêm phế cầu', 'Tư vấn tiêm cúm mùa', 'Tư vấn tiêm sởi - quai bị - rubella'],
}

const NOTES = [
  '', '', '', '', '', '', '',
  'Mẹ đi cùng',
  'Ưu tiên – trẻ dưới 6 tháng',
  'Đã gọi xác nhận lịch',
  'Dị ứng Amoxicillin',
  'Cần xuất hoá đơn công ty',
  'Bé sợ tiêm, cần dỗ',
  'Mang theo kết quả XN cũ',
  'Chuyển tuyến từ TYT phường',
]

function makePhone(rand: () => number) {
  const prefix = PHONE_PREFIXES[Math.floor(rand() * PHONE_PREFIXES.length)]
  let rest = ''
  for (let i = 0; i < 7; i++) rest += Math.floor(rand() * 10)
  return prefix + rest
}

function pick<T>(rand: () => number, list: T[]) {
  return list[Math.floor(rand() * list.length)]
}

function isoAt(date: string, time: string, plusMinutes = 0) {
  const [h, m] = time.split(':').map(Number)
  const d = new Date(`${date}T00:00:00`)
  d.setHours(h, m + plusMinutes, 0, 0)
  return d.toISOString()
}

export function formatVisitCode(date: string, seq: number) {
  return `YMD${date.replace(/-/g, '')}${String(seq).padStart(7, '0')}`
}

/** Bệnh án mẫu cho lượt đã khám (dùng bộ sinh số riêng để không đổi dữ liệu lượt khám) */
function makeSeedExam(seq: number, serviceId: string, date: string): ExamRecord {
  const rand = mulberry32(seq * 7919 + 17)
  const icd = (code: string) => ICD10.find((d) => d.code === code)!
  const tpl = (id: string) => INITIAL_PRESCRIPTION_TEMPLATES.find((t) => t.id === id)!
  let plan: { codes: string[]; tplId?: string; history: string }
  if (serviceId === 's7') plan = { codes: ['Z23.8'], history: 'Đến tiêm chủng theo lịch, không sốt, ăn bú tốt.' }
  else if (serviceId === 's5') plan = { codes: [pick(rand, ['E44.0', 'Z71.3', 'D50.9'])], history: 'Biếng ăn, chậm tăng cân 2 tháng gần đây.' }
  else if (serviceId === 's4') plan = pick(rand, [
    { codes: ['J20.9'], tplId: 'tpl_pharyngitis', history: 'Ho đờm 4 ngày, sốt nhẹ, không khó thở.' },
    { codes: ['J21.9'], tplId: 'tpl_fever', history: 'Ho, khò khè 3 ngày, bú kém hơn.' },
    { codes: ['J45.9'], history: 'Khò khè tái phát khi thay đổi thời tiết.' },
  ])
  else plan = pick(rand, [
    { codes: ['J00'], tplId: 'tpl_fever', history: 'Sốt 1–2 ngày, sổ mũi, ho ít.' },
    { codes: ['J02.9'], tplId: 'tpl_pharyngitis', history: 'Sốt, đau họng, nuốt vướng 2 ngày.' },
    { codes: ['A09'], tplId: 'tpl_diarrhea', history: 'Đi ngoài phân lỏng 4–5 lần/ngày, không máu.' },
    { codes: ['B08.4'], tplId: 'tpl_fever', history: 'Sốt, nổi bóng nước ở lòng bàn tay, bàn chân, loét miệng.' },
    { codes: ['L20.9'], history: 'Ngứa, nổi mẩn đỏ vùng má và khuỷu tay tái đi tái lại.' },
  ])
  const t = plan.tplId ? tpl(plan.tplId) : undefined
  const followUp = rand() < 0.55
  const followUpDays = pick(rand, [3, 5, 7])
  return {
    medicalHistory: plan.history,
    allergy: false,
    allergyNote: '',
    otherRisk: false,
    otherRiskNote: '',
    labNote: '',
    diagnoses: plan.codes.map(icd),
    prescription: (t?.items ?? []).map((it, i) => ({ ...it, id: `rx${seq}_${i}` })),
    advice: t?.advice ?? '',
    followUpEnabled: followUp,
    followUpDays,
    followUpDate: followUp ? addDays(date, followUpDays) : '',
    notes: [],
  }
}

export function createSeedState(): ClinicState {
  const rand = mulberry32(20261113)
  const today = todayISO()

  /* ---------- Người bệnh ---------- */
  const patients: Patient[] = CHILDREN.map((child, i) => {
    // tuổi từ ~2 tháng đến ~14 tuổi
    const ageDays = Math.floor(60 + rand() * 365 * 14)
    const relation: GuardianRelation = rand() < 0.62 ? 'mother' : rand() < 0.8 ? 'father' : 'grandparent'
    const guardianName =
      relation === 'mother' ? pick(rand, MOTHER_NAMES) : relation === 'father' ? pick(rand, FATHER_NAMES) : pick(rand, GRAND_NAMES)
    const preExisting = i % 2 === 0
    const rawAddress = pick(rand, ADDRESSES)
    const guardianPhone = makePhone(rand)
    const province = rawAddress.includes('Đồng Nai')
      ? 'Tỉnh Đồng Nai'
      : rawAddress.includes('Bình Dương')
        ? 'Tỉnh Bình Dương'
        : 'TP. Hồ Chí Minh'
    const streetAddress = rawAddress.split(',')[0]?.trim() ?? ''
    return {
      id: `p${i + 1}`,
      code: `BN${String(1201 + i).padStart(6, '0')}`,
      fullName: child.name,
      dob: addDays(today, -ageDays),
      gender: child.gender,
      phone: makePhone(rand),
      address: rawAddress,
      ethnicity: 'Kinh',
      nationality: 'Việt Nam',
      occupation: ageDays < 365 * 6 ? 'Trẻ em (còn nhỏ)' : 'Học sinh',
      province,
      ward: province === 'TP. Hồ Chí Minh' ? 'Phường 11, Quận 5' : '',
      streetAddress,
      relative: {
        fullName: guardianName,
        phone: guardianPhone,
        dob: addDays(today, -Math.floor(365 * (26 + rand() * 14))),
        gender: relation === 'mother' ? 'female' : 'male',
        relation,
        address: rawAddress,
      },
      guardianName,
      guardianRelation: relation,
      insuranceNumber: rand() < 0.45 ? `TE1${79}${String(Math.floor(rand() * 1e10)).padStart(10, '0')}` : '',
      allergies: pick(rand, ALLERGIES),
      createdAt: isoAt(addDays(today, preExisting ? -Math.floor(40 + rand() * 500) : -7), '08:00'),
    }
  })

  // Thêm hồ sơ mẫu khớp ảnh spotlight "Thêm bệnh cũ"
  patients.unshift({
    id: 'p_loc',
    code: 'BN001200',
    fullName: 'Hoàng Minh Lộc',
    dob: '2000-10-23',
    gender: 'male',
    phone: '0354444444',
    address: 'Xã Châu Phú, Tỉnh An Giang',
    province: 'Tỉnh An Giang',
    ward: 'Xã Châu Phú',
    streetAddress: '',
    ethnicity: 'Kinh',
    nationality: 'Việt Nam',
    occupation: 'Nhân viên văn phòng',
    createdAt: isoAt(addDays(today, -90), '09:00'),
  })

  /* ---------- Lượt khám: 7 ngày trước -> 2 ngày tới ---------- */
  const visits: Visit[] = []
  const seenPatients = new Set<string>(patients.filter((_, i) => i % 2 === 0).map((p) => p.id))
  let visitSeq = 1

  for (let offset = -7; offset <= 2; offset++) {
    const date = addDays(today, offset)
    const count = offset === 0 ? 18 : offset > 0 ? 5 + Math.floor(rand() * 3) : 7 + Math.floor(rand() * 5)

    // khung giờ 07:30 -> 17:00, cách nhau ngẫu nhiên
    const times: string[] = []
    let minutes = 7 * 60 + 30
    for (let i = 0; i < count; i++) {
      times.push(`${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`)
      minutes += 15 + Math.floor(rand() * 4) * 10
      if (minutes >= 11 * 60 + 30 && minutes < 13 * 60 + 30) minutes = 13 * 60 + 30
    }

    const used = new Set<string>()
    for (let i = 0; i < count; i++) {
      let patient = pick(rand, patients)
      while (used.has(patient.id)) patient = pick(rand, patients)
      used.add(patient.id)

      const time = times[i]
      const r = rand()
      const category: VisitCategory = offset > 0 ? 'booked' : r < 0.36 ? 'booked' : r < 0.86 ? 'walk_in' : 'referral'
      const source: VisitSource =
        category === 'walk_in'
          ? 'direct'
          : category === 'referral'
            ? 'referral'
            : pick<VisitSource>(rand, ['website', 'app', 'app', 'zalo', 'hotline'])

      const age = (new Date(today).getTime() - new Date(patient.dob).getTime()) / (365 * 86_400_000)
      let serviceId = pick(rand, ['s1', 's1', 's1', 's2', 's3', 's4', 's4', 's5', 's7'])
      if (age < 1.5 && rand() < 0.4) serviceId = 's7'
      if (time >= '17:00') serviceId = 's6'
      const service = SERVICES.find((s) => s.id === serviceId)!
      const doctor =
        serviceId === 's4' ? DOCTORS[2] : serviceId === 's5' ? DOCTORS[3] : serviceId === 's7' ? DOCTORS[4] : pick(rand, DOCTORS.slice(0, 2))

      /* trạng thái */
      let status: VisitStatus
      if (offset < 0) status = rand() < 0.9 ? 'done' : 'cancelled'
      else if (offset > 0) status = rand() < 0.9 ? 'registered' : 'cancelled'
      else {
        const ratio = i / count
        status =
          ratio < 0.4 ? (i === 3 ? 'cancelled' : 'done') : ratio < 0.52 ? 'in_progress' : ratio < 0.75 ? 'waiting' : 'registered'
      }

      /* thanh toán */
      const fee = service.price
      let paymentStatus: PaymentStatus
      const pr = rand()
      if (fee === 0) paymentStatus = status === 'cancelled' ? 'cancelled' : 'none'
      else if (status === 'done') paymentStatus = pr < 0.86 ? 'paid' : pr < 0.95 ? 'partial' : 'unpaid'
      else if (status === 'in_progress') paymentStatus = pr < 0.5 ? 'paid' : 'unpaid'
      else if (status === 'waiting') paymentStatus = pr < 0.4 ? 'paid' : 'unpaid'
      else if (status === 'registered')
        paymentStatus = category === 'booked' && source !== 'hotline' ? (pr < 0.45 ? 'paid' : pr < 0.85 ? 'unpaid' : 'failed') : 'unpaid'
      else paymentStatus = pr < 0.35 ? 'refunded' : 'cancelled'

      const method: PaymentMethod =
        source === 'app' || source === 'website' ? pick<PaymentMethod>(rand, ['ewallet', 'transfer', 'card']) : pick<PaymentMethod>(rand, ['cash', 'cash', 'transfer', 'card'])
      const payments: PaymentRecord[] = []
      const paidAt = isoAt(date, time, -5)
      if (paymentStatus === 'paid' || paymentStatus === 'refunded') {
        payments.push({ id: `pay${visitSeq}a`, kind: 'payment', amount: fee, method, at: paidAt })
      }
      if (paymentStatus === 'partial') {
        payments.push({ id: `pay${visitSeq}a`, kind: 'payment', amount: Math.round(fee / 2 / 10_000) * 10_000, method, at: paidAt })
      }
      if (paymentStatus === 'refunded') {
        payments.push({ id: `pay${visitSeq}b`, kind: 'refund', amount: fee, method, at: isoAt(date, time, 20), note: 'Hoàn tiền do huỷ lịch' })
      }

      const patientType = seenPatients.has(patient.id) ? 'returning' : 'new'
      seenPatients.add(patient.id)

      visits.push({
        id: `v${visitSeq}`,
        code: formatVisitCode(date, i + 1),
        patientId: patient.id,
        queueNumber: i + 1,
        date,
        time,
        endTime: addMinutesToTime(time, 30),
        doctorId: doctor.id,
        roomId: doctor.defaultRoomId,
        serviceId,
        consultationFee: fee,
        medicationFee: 0,
        paraclinicalOrders: [],
        fee,
        payments,
        paymentStatus,
        status,
        patientType,
        visitKind: 'Lịch khám',
        category,
        source,
        reason: pick(rand, REASONS_BY_SERVICE[serviceId] ?? REASONS_BY_SERVICE.s1),
        note: patient.allergies && rand() < 0.5 ? `Dị ứng ${patient.allergies}` : pick(rand, NOTES),
        exam: status === 'done' ? makeSeedExam(visitSeq, serviceId, date) : undefined,
        cancelReason: status === 'cancelled' ? pick(rand, ['Người nhà báo bận', 'Bé đã hết sốt', 'Đổi sang ngày khác', 'Không liên lạc được']) : undefined,
        createdAt: isoAt(category === 'booked' ? addDays(date, -1) : date, time, -10),
        checkedInAt: ['waiting', 'in_progress', 'done'].includes(status) ? isoAt(date, time, -5) : undefined,
        startedAt: ['in_progress', 'done'].includes(status) ? isoAt(date, time, 10) : undefined,
        finishedAt: status === 'done' ? isoAt(date, time, 25) : undefined,
      })
      visitSeq++
    }
  }

  const nameOf = new Map(patients.map((p) => [p.id, p.fullName]))
  return {
    version: STATE_VERSION,
    patients,
    visits: enrichVisits(visits, (id) => nameOf.get(id) ?? '', today),
    clsServices: INTERNAL_CLS_SEED,
    schedules: seedSchedules(),
    system: defaultSystem(),
    paraclinicalCombos: INITIAL_COMBOS,
    prescriptionTemplates: INITIAL_PRESCRIPTION_TEMPLATES,
    defaultProviderId: 'lab_internal',
    ui: {
      activeRoute: 'reception',
      sidebarCollapsed: false,
      reception: defaultReceptionView(),
    },
  }
}
