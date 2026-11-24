import type { Patient, PaymentStatus, Visit, VisitStatus } from '../src/store/types'

/** Dữ liệu tạo hồ sơ: máy chủ tự cấp id, mã BN, thời điểm tạo */
export type NewPatient = Omit<Patient, 'id' | 'code' | 'createdAt' | 'updatedAt'>

export interface PatientQuery {
  /** Tìm theo họ tên (không dấu), mã BN hoặc số điện thoại */
  q?: string
  limit: number
  offset: number
}

export interface PatientRepo {
  list(query: PatientQuery): Promise<{ items: Patient[]; total: number }>
  get(id: string): Promise<Patient | null>
  getMany(ids: string[]): Promise<Patient[]>
  /** Tạo hồ sơ và cấp mã BN tiếp theo trong cùng một bước (không trùng mã) */
  create(input: NewPatient): Promise<Patient>
  update(id: string, patch: Partial<NewPatient>): Promise<Patient | null>
  remove(id: string): Promise<boolean>
}

export interface VisitQuery {
  dateFrom: string
  dateTo: string
  status?: VisitStatus
  paymentStatus?: PaymentStatus
  patientId?: string
}

export interface VisitRepo {
  list(query: VisitQuery): Promise<Visit[]>
  listByPatient(patientId: string): Promise<Visit[]>
  get(id: string): Promise<Visit | null>
  insert(visit: Visit): Promise<Visit>
  update(id: string, patch: Partial<Visit>): Promise<Visit | null>
}

export interface CounterRepo {
  /**
   * Tăng bộ đếm và trả về giá trị mới, không bao giờ trùng giữa các lần gọi đồng thời.
   * `floor`: giá trị lớn nhất đang có trong dữ liệu (để bộ đếm mới tạo không cấp lại số cũ).
   */
  next(key: string, floor?: number): Promise<number>
}

/** Danh mục sửa được, mỗi loại một danh sách (bảng catalog: kind + id + data jsonb) */
export interface CatalogRepo {
  /** null = chưa từng lưu loại này (dùng danh mục mặc định của 1.0) */
  list<T extends { id: string }>(kind: string): Promise<T[] | null>
  replace<T extends { id: string }>(kind: string, items: T[]): Promise<T[]>
}

/** Cài đặt dạng khoá → giá trị jsonb (bảng settings) */
export interface SettingsRepo {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, data: T): Promise<T>
}

export interface Repos {
  patients: PatientRepo
  visits: VisitRepo
  counters: CounterRepo
  catalog: CatalogRepo
  settings: SettingsRepo
}
