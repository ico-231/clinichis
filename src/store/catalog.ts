import type {
  Doctor,
  GuardianRelation,
  PatientType,
  PaymentMethod,
  PaymentStatus,
  Room,
  Service,
  VisitCategory,
  VisitSource,
  VisitStatus,
} from './types'

export const CLINIC = {
  name: 'Phòng khám Nhi Khoa',
  shortName: 'PK',
  // Địa chỉ, số điện thoại minh hoạ (đầu số 0123 đã ngừng dùng ở Việt Nam) – không trùng cơ sở y tế thật
  address: '18 Đường số 3, Khu phố 5, TP. Hồ Chí Minh',
  hotline: '0123 456 789',
}

export const ROOMS: Room[] = [
  { id: 'r1', name: 'Phòng khám Nhi 1', floor: 'Tầng 1' },
  { id: 'r2', name: 'Phòng khám Nhi 2', floor: 'Tầng 1' },
  { id: 'r3', name: 'Phòng Hô hấp nhi', floor: 'Tầng 2' },
  { id: 'r4', name: 'Phòng Dinh dưỡng', floor: 'Tầng 2' },
  { id: 'r5', name: 'Phòng Tư vấn tiêm chủng', floor: 'Tầng 1' },
]

export const DOCTORS: Doctor[] = [
  { id: 'd1', title: 'BS.CKII', name: 'Phạm Thu Hà', specialty: 'Nhi tổng quát', defaultRoomId: 'r1' },
  { id: 'd2', title: 'ThS.BS', name: 'Trần Quốc Huy', specialty: 'Nhi tổng quát', defaultRoomId: 'r2' },
  { id: 'd3', title: 'BS.CKI', name: 'Nguyễn Thị Minh Thư', specialty: 'Hô hấp nhi', defaultRoomId: 'r3' },
  { id: 'd4', title: 'BS', name: 'Lê Hoàng Anh', specialty: 'Dinh dưỡng nhi', defaultRoomId: 'r4' },
  { id: 'd5', title: 'BS', name: 'Võ Ngọc Lan', specialty: 'Tiêm chủng', defaultRoomId: 'r5' },
]

export const SERVICES: Service[] = [
  { id: 's0', name: 'Mặc định', price: 0 },
  { id: 's1', name: 'Khám nhi tổng quát', price: 150_000 },
  { id: 's2', name: 'Khám chuyên gia', price: 300_000 },
  { id: 's3', name: 'Tái khám', price: 100_000 },
  { id: 's4', name: 'Khám hô hấp nhi', price: 200_000 },
  { id: 's5', name: 'Khám dinh dưỡng', price: 200_000 },
  { id: 's6', name: 'Khám ngoài giờ', price: 250_000 },
  { id: 's7', name: 'Tư vấn tiêm chủng', price: 0 },
]

export const doctorById = (id: string) => DOCTORS.find((d) => d.id === id)
/** Phòng gốc – vẫn tra được tên cho lượt khám cũ khi phòng đã bị xoá ở Cơ cấu tổ chức */
const ROOM_ARCHIVE: Room[] = [...ROOMS]
export const roomById = (id: string) => ROOMS.find((r) => r.id === id) ?? ROOM_ARCHIVE.find((r) => r.id === id)
export const serviceById = (id: string) => SERVICES.find((s) => s.id === id)
export const doctorLabel = (id: string) => {
  const d = doctorById(id)
  return d ? `${d.title} ${d.name}` : '—'
}

type Tone = 'gray' | 'blue' | 'green' | 'amber' | 'orange' | 'red' | 'violet' | 'sky' | 'yellow' | 'rose'

export const VISIT_STATUS: Record<VisitStatus, { label: string; tone: Tone }> = {
  registered: { label: 'Đã đăng ký khám', tone: 'amber' },
  waiting: { label: 'Chờ khám', tone: 'amber' },
  in_progress: { label: 'Đang khám', tone: 'blue' },
  done: { label: 'Đã khám', tone: 'green' },
  cancelled: { label: 'Đã huỷ', tone: 'gray' },
}

/** Thứ tự dùng cho bộ lọc "Trạng thái" (đúng như hệ thống gốc) */
export const VISIT_STATUS_FILTER: { value: VisitStatus; label: string }[] = [
  { value: 'registered', label: 'Đã đăng ký khám' },
  { value: 'waiting', label: 'Chờ khám' },
  { value: 'in_progress', label: 'Đang khám' },
  { value: 'done', label: 'Đã khám' },
  { value: 'cancelled', label: 'Đã huỷ' },
]

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; short: string; tone: Tone }> = {
  none: { label: 'Không thanh toán', short: 'Miễn phí', tone: 'gray' },
  paid: { label: 'Đã thanh toán', short: 'Đã thanh toán', tone: 'green' },
  unpaid: { label: 'Chưa thanh toán', short: 'Chưa thanh toán', tone: 'orange' },
  partial: { label: 'Thanh toán một phần', short: 'TT một phần', tone: 'yellow' },
  cancelled: { label: 'Đã huỷ', short: 'Đã huỷ', tone: 'gray' },
  refunded: { label: 'Đã hoàn tiền', short: 'Đã hoàn tiền', tone: 'violet' },
  failed: { label: 'Thất bại', short: 'Thất bại', tone: 'red' },
}

export const PAYMENT_STATUS_ORDER: PaymentStatus[] = ['none', 'paid', 'unpaid', 'partial', 'cancelled', 'refunded', 'failed']

export const CATEGORY_LABEL: Record<VisitCategory, string> = {
  booked: 'Đặt trước',
  walk_in: 'Tại phòng khám',
  referral: 'Chỉ định',
}

export const SOURCE_LABEL: Record<VisitSource, string> = {
  direct: 'Trực tiếp',
  website: 'Website',
  app: 'Ứng dụng di động',
  zalo: 'Zalo OA',
  hotline: 'Tổng đài',
  referral: 'Giới thiệu / chuyển tuyến',
}

export const PATIENT_TYPE_LABEL: Record<PatientType, string> = {
  new: 'Khách mới',
  returning: 'Khách cũ',
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Tiền mặt',
  transfer: 'Chuyển khoản',
  card: 'Thẻ ngân hàng',
  ewallet: 'Ví điện tử',
}

export const RELATION_LABEL: Record<GuardianRelation, string> = {
  mother: 'Mẹ',
  father: 'Cha',
  grandparent: 'Ông/Bà',
  spouse: 'Vợ/Chồng',
  sibling: 'Anh/Chị/Em',
  child: 'Con',
  other: 'Khác',
}

export const GENDER_LABEL = { male: 'Nam', female: 'Nữ' } as const

export const toOptions = <T extends string>(record: Record<T, string>) =>
  (Object.keys(record) as T[]).map((value) => ({ value, label: record[value] }))
