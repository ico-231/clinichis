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
  /** Ghi chú về người bệnh (ảnh 114) */
  notes?: VisitNote[]
  /** ISO datetime */
  createdAt: string
  updatedAt?: string
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
  /** Thiết lập danh mục CLS nội bộ (ảnh 123–131) */
  unit?: string
  classification?: string
  room?: string
  returnsResult?: boolean
  printLayout?: 'portrait' | 'landscape'
  paused?: boolean
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
  /** Thời điểm bác sĩ "Gửi chỉ định" tới nơi thực hiện */
  sentAt?: string
  /** Trạng thái trả kết quả (module CLS sẽ cập nhật) */
  resultStatus?: 'waiting' | 'has_result'
  /** Trạng thái thực hiện tại phòng CLS (ảnh 047) */
  performStatus?: PerformStatus
  result?: ParaclinicalResult
}

/** Mẫu kết quả CLS (ảnh 132): nội dung soạn sẵn chèn vào phiếu kết quả */
export interface ResultTemplate {
  id: string
  name: string
  /** Gắn với một dịch vụ CLS (rỗng = dùng chung) */
  serviceId?: string
  printTitle?: string
  description: string
  conclusion: string
  recommendation?: string
}

export type PerformStatus = 'pending' | 'in_progress' | 'done' | 'cancelled' | 'no_show'

export interface ResultFile {
  id: string
  name: string
  /** MIME: application/pdf, image/jpeg... */
  type: string
  size: number
  /** data: URL (lưu cục bộ trong trình duyệt – bản demo) */
  dataUrl: string
  at: string
}

/** Kết quả cận lâm sàng: dạng soạn thảo (CĐHA) hoặc tệp đính kèm (Xét nghiệm) */
export interface ParaclinicalResult {
  description: string
  conclusion: string
  recommendation: string
  /** Ảnh chụp / tải lên kèm phiếu kết quả */
  images: ResultFile[]
  files: ResultFile[]
  updatedAt: string
  by: string
}

/** Chẩn đoán theo ICD-10 (code rỗng = chẩn đoán tự do) */
export interface Diagnosis {
  code: string
  name: string
}

/** Danh mục thuốc dùng để kê đơn (không bán thuốc) */
export interface Drug {
  id: string
  name: string
  activeIngredient: string
  strength: string
  form: string
  route: string
  /** Đơn vị liều / cấp phát: Viên, Gói, ml... */
  unit: string
  manufacturer: string
}

export interface PrescriptionItem {
  id: string
  drugId: string
  name: string
  activeIngredient: string
  strength: string
  days: number
  /** Đơn vị liều dùng mỗi lần */
  doseUnit: string
  morning: number
  noon: number
  afternoon: number
  evening: number
  /** Tổng số lượng = số ngày × tổng liều/ngày (cho phép sửa tay) */
  quantity: number
  quantityUnit: string
  usage: string
}

export interface PrescriptionTemplate {
  id: string
  name: string
  items: Omit<PrescriptionItem, 'id'>[]
  advice: string
}

export interface VisitNote {
  id: string
  text: string
  /** ISO datetime */
  at: string
}

export type SignStatus = 'unsigned' | 'pending' | 'signed'

/** Bệnh án ngoại trú điện tử của một lượt khám (ảnh 091–101) */
export interface EmrRecord {
  type: 'outpatient_general'
  specialty: string
  /** ISO datetime tạo bệnh án */
  createdAt: string
  subject: '' | 'insurance' | 'fee' | 'free' | 'other'
  insuranceExpiry: string
  referralDiagnosis: Diagnosis[]
  admissionReason: string
  personalHistory: string
  familyHistory: string
  generalExam: string
  organExam: string
  clsSummary: string
  initialDiagnosis: Diagnosis[]
  treatmentGiven: string
  dischargeDiagnosis: Diagnosis[]
  treatFrom: string
  treatTo: string
  summary: {
    course: string
    clsValue: string
    mainDisease: Diagnosis[]
    comorbid: Diagnosis[]
    method: string
    dischargeState: string
    plan: string
    films: { xray: string; ct: string; ultrasound: string; lab: string; total: string }
  }
  closed: boolean
  signStatus: SignStatus
  signedAt?: string
  savedAt?: string
}

export type ScheduleKind = 'exam' | 'online'

/** Khung giờ của lịch cố định theo thứ (ảnh 079, 081) – weekday: 0 = Thứ 2 ... 6 = Chủ nhật */
export interface FixedSlot {
  id: string
  weekday: number
  kind: ScheduleKind
  start: string
  end: string
  perSlot: number
  slotMinutes: number
  minDaysAhead?: number
  maxDaysAhead?: number
  fee?: number
  discount?: number
  enabled: boolean
}

/** Lịch nghỉ (ảnh 082–084) */
export interface LeaveSlot {
  id: string
  date: string
  start: string
  end: string
  enabled: boolean
}

/** Lịch làm việc linh hoạt cho một ngày cụ thể (ảnh 085–086) */
export interface FlexSlot extends Omit<FixedSlot, 'weekday'> {
  date: string
}

export interface Schedules {
  fixed: FixedSlot[]
  leaves: LeaveSlot[]
  flexible: FlexSlot[]
}

/** Hồ sơ phòng khám / bác sĩ hiển thị công khai (ảnh 087–088, 155) */
export interface ClinicProfile {
  clinicName: string
  phone: string
  email: string
  logo?: string
  doctorName: string
  avatar?: string
  practiceSince: string
  specialty: string
  examSpecialty: string
  workplace: string
  position: string
  degree: string
  province: string
  ward: string
  address: string
  qualifications: string[]
  prices: { name: string; price: number }[]
  workingHours: { days: string; hours: string }[]
  training: { url: string; name: string }[]
  introduction: string
  experience: string
  awards: string
  certificate?: string
  images: string[]
  status: 'draft' | 'pending'
  submittedAt?: string
}

export interface OrgItem {
  id: string
  name: string
  description: string
  updatedAt: string
}

export interface StaffMember {
  id: string
  lastName: string
  firstName: string
  email: string
  phone: string
  gender: Gender
  dob: string
  avatar?: string
  role: 'member' | 'admin'
  signProvider: string
  signUsername: string
  status: 'active' | 'locked'
  createdAt: string
}

/** Cấu hình hệ thống (ảnh 155–176) */
export interface SystemSettings {
  account: {
    email: string
    lastName: string
    firstName: string
    avatar?: string
    signProvider: string
    signUsername: string
    alwaysSignExam: boolean
    requireSignRx: boolean
  }
  general: {
    accountPrefix: string
    printTicketOnCheckIn: boolean
    defaultLabId: string
    rxInsuranceCode: string
    rxFacilityCode: string
    codePrefix: string
    codeMinLength: number
  }
  org: {
    specialties: OrgItem[]
    areas: OrgItem[]
    rooms: OrgItem[]
    visitTypes: OrgItem[]
    subjects: OrgItem[]
  }
  staff: StaffMember[]
}

/** Lịch sử tải báo cáo (ảnh 153) */
export interface ReportDownload {
  id: string
  name: string
  report: string
  rangeLabel: string
  fileType: 'CSV'
  at: string
  status: 'success'
  /** Nội dung để "Tải lại" (giới hạn dung lượng) */
  content?: string
}

/** Nhật ký truy cập bệnh án (ảnh 171–174) */
export interface EmrAccessLog {
  id: string
  at: string
  user: string
  action: 'view' | 'edit' | 'delete'
  visitId: string
  emrCode: string
  signStatus: SignStatus
  state: 'draft' | 'created' | 'closed'
}

/** Dữ liệu khám bệnh của bác sĩ cho một lượt khám */
export interface ExamRecord {
  /** Hỏi bệnh: quá trình bệnh lý */
  medicalHistory: string
  allergy: boolean
  allergyNote: string
  otherRisk: boolean
  otherRiskNote: string
  /** Ghi chú gửi phòng lab */
  labNote: string
  diagnoses: Diagnosis[]
  prescription: PrescriptionItem[]
  /** Lời dặn của bác sĩ */
  advice: string
  prescriptionSentAt?: string
  followUpEnabled: boolean
  followUpDays: number
  /** YYYY-MM-DD */
  followUpDate: string
  notes: VisitNote[]
}

export interface ParaclinicalCombo {
  id: string
  name: string
  providerId: string
  items: { serviceId: string; quantity: number; instruction?: string }[]
}

/** Một dòng trên phiếu thu: công khám hoặc một chỉ định CLS */
export interface ReceiptLine {
  kind: 'consultation' | 'paraclinical'
  /** 'ck' cho công khám, id chỉ định cho CLS */
  refId: string
  name: string
  unit: string
  quantity: number
  unitPrice: number
  /** Giảm giá của dòng (VNĐ, đã quy đổi nếu nhập %) */
  discount: number
}

export interface InvoiceInfo {
  type: 'personal' | 'company'
  /** Họ tên (cá nhân) hoặc tên công ty */
  name: string
  taxCode: string
  email: string
  phone: string
  address: string
  status: 'not_issued' | 'issued'
  issuedAt?: string
}

export interface PaymentRecord {
  id: string
  kind: 'payment' | 'refund'
  /** Số tiền thực thu / thực hoàn (sau giảm giá) */
  amount: number
  method: PaymentMethod
  /** ISO datetime */
  at: string
  note?: string
  /** Mã phiếu thu, ví dụ YMD20261116000003 (dữ liệu cũ có thể không có) */
  code?: string
  /** Các dòng được thu trong phiếu (dữ liệu cũ không có => phân bổ theo thứ tự) */
  lines?: ReceiptLine[]
  /** Giảm giá dịch vụ trên toàn phiếu (VNĐ) */
  discount?: number
  /** Tiền khách đưa (để tính tiền thừa) */
  customerPaid?: number
  cashier?: string
  /** Yêu cầu xuất hoá đơn điện tử */
  invoice?: InvoiceInfo
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
  /** Phần khám của bác sĩ (màn Khám bệnh) */
  exam?: ExamRecord
  /** Bệnh án điện tử (tạo khi lưu lần đầu ở trang Bệnh án điện tử) */
  emr?: EmrRecord
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
  /** Nguồn theo ảnh 008: Tại phòng khám (trực tiếp) / Bên ngoài (đặt online, giới thiệu...) */
  source: 'all' | 'onsite' | 'external'
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
  reception: ReceptionViewState
  /** Lượt khám đang mở trong màn Khám bệnh (null = danh sách) */
  examVisitId?: string | null
  /** Hồ sơ người bệnh đang mở ở trang Người bệnh */
  patientId?: string | null
  /** Bệnh án đang mở ở trang Bệnh án điện tử */
  emrVisitId?: string | null
  /** Giao diện: theo hệ thống / sáng / tối */
  theme?: 'system' | 'light' | 'dark'
  /** Yêu cầu mở Thêm bệnh cũ (F1) / mới (F2) khi chuyển sang Lễ tân từ màn khác */
  receptionAction?: 'existing' | 'new' | null
  /** Mục Hệ thống cần mở khi chuyển sang màn Hệ thống (vd. từ menu tài khoản) */
  systemSection?: string | null
}

export interface ClinicState {
  version: number
  patients: Patient[]
  visits: Visit[]
  paraclinicalCombos: ParaclinicalCombo[]
  defaultProviderId: string
  /** Đơn thuốc mẫu (có thể thiếu ở dữ liệu lưu từ phiên bản cũ) */
  prescriptionTemplates?: PrescriptionTemplate[]
  /** Mẫu kết quả CLS do người dùng tạo */
  resultTemplates?: ResultTemplate[]
  emrLogs?: EmrAccessLog[]
  reportDownloads?: ReportDownload[]
  schedules?: Schedules
  clinicProfile?: ClinicProfile
  system?: SystemSettings
  /** Danh mục công khám (Tiền công khám – ảnh 168) */
  services?: Service[]
  /** Danh mục CLS của lab nội bộ (ảnh 123) */
  clsServices?: ParaclinicalServiceItem[]
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
