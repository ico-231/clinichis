export type Gender = 'male' | 'female'

export type VisitStatus = 'registered' | 'waiting' | 'in_progress' | 'done' | 'cancelled'

export type PaymentStatus = 'none' | 'paid' | 'unpaid' | 'partial' | 'cancelled' | 'refunded' | 'failed'

/** Phân loại lượt khám */
export type VisitCategory = 'booked' | 'walk_in' | 'referral'

/** Nguồn tiếp nhận */
export type VisitSource = 'direct' | 'website' | 'app' | 'zalo' | 'hotline' | 'referral'

/** Loại khách: mới / cũ */
export type PatientType = 'new' | 'returning'

export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'ewallet'

export type GuardianRelation = 'mother' | 'father' | 'grandparent' | 'spouse' | 'child' | 'sibling' | 'other'

export type VisitKind = 'Lịch khám' | 'Cận lâm sàng'

export interface PatientRelative {
  fullName: string
  phone: string
  dob: string
  gender: Gender
  relation: GuardianRelation
  address: string
}

export interface Patient {
  id: string
  /** Mã người bệnh, ví dụ BN000123 */
  code: string
  fullName: string
  /** YYYY-MM-DD */
  dob: string
  gender: Gender
  phone: string
  address: string
  cccd?: string
  email?: string
  bloodType?: string
  occupation?: string
  ethnicity?: string
  nationality?: string
  province?: string
  ward?: string
  streetAddress?: string
  relative?: PatientRelative
  guardianName?: string
  guardianRelation?: GuardianRelation
  insuranceNumber?: string
  allergies?: string
  /** ISO datetime */
  createdAt: string
}

export interface VitalSigns {
  heightCm?: string
  weightKg?: string
  temperatureC?: string
  bpSystolic?: string
  bpDiastolic?: string
  pulse?: string
  respiratoryRate?: string
  spo2?: string
  bmi?: string
}

export interface ParaclinicalProvider {
  id: string
  name: string
  address: string
  isInternal?: boolean
}

export interface ParaclinicalServiceItem {
  id: string
  providerId: string
  name: string
  /** VD: MIỄN DỊCH (lần), SIÊU ÂM (lần) */
  groupLabel: string
  category: 'imaging' | 'lab'
  price: number
}

export interface ParaclinicalOrderItem {
  id: string
  serviceId: string
  providerId: string
  providerName: string
  providerAddress: string
  name: string
  groupLabel: string
  category: 'imaging' | 'lab'
  unitPrice: number
  quantity: number
  instruction: string
}

export interface ParaclinicalCombo {
  id: string
  name: string
  providerId: string
  items: { serviceId: string; quantity: number; instruction?: string }[]
}

export interface PaymentRecord {
  id: string
  kind: 'payment' | 'refund'
  amount: number
  method: PaymentMethod
  /** ISO datetime */
  at: string
  note?: string
}

/** Một lượt khám (encounter) */
export interface Visit {
  id: string
  /** Mã khám bệnh, ví dụ YMD202611130000001 */
  code: string
  patientId: string
  /** Số thứ tự trong ngày */
  queueNumber: number
  /** YYYY-MM-DD */
  date: string
  /** HH:mm */
  time: string
  /** HH:mm kết thúc dự kiến (mặc định +30 phút) */
  endTime?: string
  doctorId: string
  roomId: string
  serviceId: string
  /** Công khám (CK) */
  consultationFee?: number
  /** Tiền thuốc (Th) */
  medicationFee?: number
  /** Danh sách chỉ định cận lâm sàng (CLS) */
  paraclinicalOrders?: ParaclinicalOrderItem[]
  /** Tổng phí = CK + CLS + Th */
  fee: number
  payments: PaymentRecord[]
  paymentStatus: PaymentStatus
  status: VisitStatus
  patientType: PatientType
  /** Loại hiển thị trên bảng Lễ tân: Lịch khám / Cận lâm sàng */
  visitKind?: VisitKind
  category: VisitCategory
  source: VisitSource
  reason: string
  symptoms?: string
  note: string
  vitals?: VitalSigns
  cancelReason?: string
  createdAt: string
  checkedInAt?: string
  startedAt?: string
  finishedAt?: string
}

export interface Doctor {
  id: string
  name: string
  title: string
  specialty: string
  defaultRoomId: string
}

export interface Room {
  id: string
  name: string
  floor: string
}

export interface Service {
  id: string
  name: string
  price: number
}

export type RouteKey =
  | 'dashboard'
  | 'reception'
  | 'examination'
  | 'prescriptions'
  | 'calls'
  | 'messages'
  | 'appointments'
  | 'schedule'
  | 'clinic-info'
  | 'branding'
  | 'emr'
  | 'patients'
  | 'imaging'
  | 'lab'
  | 'paraclinical-reports'
  | 'paraclinical-settings'
  | 'reports'
  | 'system'

export type ReceptionColumnKey =
  | 'stt'
  | 'fullName'
  | 'dob'
  | 'gender'
  | 'phone'
  | 'address'
  | 'visitDate'
  | 'visitTime'
  | 'doctor'
  | 'fee'
  | 'payment'
  | 'note'
  | 'patientType'
  | 'room'
  | 'category'
  | 'source'

export interface ReceptionFilters {
  search: string
  dateFrom: string
  dateTo: string
  status: VisitStatus | 'all'
  payment: PaymentStatus | 'all'
  category: VisitCategory | 'all'
  source: VisitSource | 'all'
  doctorId: string | 'all'
  roomId: string | 'all'
  patientType: PatientType | 'all'
}

export type SortDirection = 'asc' | 'desc'

export interface ReceptionViewState {
  /** Ô nhập tìm kiếm (chưa áp dụng) */
  searchInput: string
  filters: ReceptionFilters
  visibleColumns: ReceptionColumnKey[]
  sort: { key: ReceptionColumnKey; direction: SortDirection } | null
  page: number
  pageSize: number
}

export interface UIState {
  activeRoute: RouteKey
  sidebarCollapsed: boolean
  upgradeCardDismissed: boolean
  reception: ReceptionViewState
}

export interface ClinicState {
  version: number
  patients: Patient[]
  visits: Visit[]
  paraclinicalCombos: ParaclinicalCombo[]
  defaultProviderId: string
  ui: UIState
}

/** Dữ liệu nhập khi đăng ký lượt khám */
export interface VisitInput {
  date: string
  time: string
  endTime?: string
  serviceId: string
  consultationFee?: number
  paraclinicalOrders?: ParaclinicalOrderItem[]
  fee: number
  doctorId: string
  roomId: string
  category: VisitCategory
  source: VisitSource
  reason: string
  symptoms?: string
  note: string
  vitals?: VitalSigns
  visitKind?: VisitKind
  /** Trạng thái khởi tạo tường minh (registered / waiting / in_progress) */
  initialStatus?: VisitStatus
  /** Tiếp nhận ngay => trạng thái Chờ khám, ngược lại Đã đăng ký */
  checkInNow: boolean
  /** Thu phí ngay khi tiếp nhận */
  payNow: boolean
  paidAmountNow?: number
  payMethod: PaymentMethod
}

export type PatientInput = Omit<Patient, 'id' | 'code' | 'createdAt'>
