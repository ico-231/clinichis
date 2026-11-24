import { patientDeleteBlock } from '../src/store/billing.js'
import { ageInYears } from '../src/lib/date.js'
import type { Gender, GuardianRelation, Patient } from '../src/store/types.js'
import { ApiError } from './errors.js'
import type { NewPatient, Repos } from './repo.js'
import { isISODate, todayVN } from './time.js'

const GENDERS: Gender[] = ['male', 'female']
const RELATIONS: GuardianRelation[] = ['mother', 'father', 'grandparent', 'spouse', 'child', 'sibling', 'other']
/** Trường người dùng được gửi lên (id, mã BN, thời điểm tạo do máy chủ quyết định) */
const WRITABLE = [
  'fullName', 'dob', 'gender', 'phone', 'address', 'cccd', 'email', 'bloodType', 'occupation', 'ethnicity', 'nationality',
  'province', 'ward', 'streetAddress', 'relative', 'guardianName', 'guardianRelation', 'insuranceNumber', 'allergies', 'notes',
] as const satisfies readonly (keyof NewPatient)[]

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Chỉ giữ các trường được phép, chuẩn hoá chuỗi (bỏ khoảng trắng thừa, SĐT chỉ còn chữ số) */
function pick(body: unknown): Partial<NewPatient> {
  if (!isObject(body)) throw new ApiError('bad_request', 'Dữ liệu gửi lên phải là một đối tượng JSON')
  const out: Record<string, unknown> = {}
  for (const key of WRITABLE) {
    if (!(key in body)) continue
    const v = body[key]
    out[key] = typeof v === 'string' ? (key === 'fullName' ? v.trim().replace(/\s+/g, ' ') : v.trim()) : v
  }
  if (typeof out.phone === 'string') out.phone = out.phone.replace(/\D/g, '')
  return out as Partial<NewPatient>
}

/** Cùng quy tắc với form hồ sơ của 1.0 (src/features/reception/forms.tsx → validatePatient) */
function validate(p: Partial<NewPatient>, today = todayVN()) {
  const e: Record<string, string> = {}
  const str = (k: keyof NewPatient) => (typeof p[k] === 'string' ? (p[k] as string) : '')
  if (str('fullName').split(' ').filter(Boolean).length < 2) e.fullName = 'Nhập đầy đủ họ và tên'
  const dob = str('dob')
  if (!isISODate(dob)) e.dob = 'Ngày sinh không hợp lệ (YYYY-MM-DD)'
  else if (dob > today) e.dob = 'Ngày sinh không hợp lệ'
  if (!GENDERS.includes(p.gender as Gender)) e.gender = 'Chọn giới tính'
  if (!/^0\d{9}$/.test(str('phone'))) e.phone = 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0'
  if (!e.dob && ageInYears(dob, today) < 16 && !str('guardianName')) e.guardianName = 'Bắt buộc với trẻ dưới 16 tuổi'
  if (p.guardianRelation !== undefined && !RELATIONS.includes(p.guardianRelation)) e.guardianRelation = 'Quan hệ không hợp lệ'
  if (str('insuranceNumber') && !/^[A-Za-z]{2}\d{13}$/.test(str('insuranceNumber'))) e.insuranceNumber = 'Mã BHYT gồm 15 ký tự (vd: TE1790123456789)'
  if (str('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str('email'))) e.email = 'Email không hợp lệ'
  if (p.notes !== undefined && !Array.isArray(p.notes)) e.notes = 'Ghi chú phải là danh sách'
  if (p.relative !== undefined && (typeof p.relative !== 'object' || p.relative === null || Array.isArray(p.relative))) e.relative = 'Phải là đối tượng'
  // Các trường chữ còn lại: gửi số / đối tượng vào cột text sẽ làm cơ sở dữ liệu báo lỗi 500 ⇒ chặn sớm
  for (const k of WRITABLE) {
    if (k === 'notes' || k === 'relative' || p[k] === undefined || p[k] === null || typeof p[k] === 'string') continue
    e[k] ??= 'Phải là chuỗi'
  }
  if (Object.keys(e).length) throw new ApiError('validation', 'Dữ liệu hồ sơ chưa hợp lệ', e)
}

export function patientService(repos: Repos) {
  const mustGet = async (id: string) => {
    const p = await repos.patients.get(id)
    if (!p) throw new ApiError('not_found', 'Không tìm thấy hồ sơ người bệnh')
    return p
  }

  return {
    async list(params: { q?: string; limit?: number; offset?: number }) {
      const limit = Math.min(Math.max(Math.trunc(params.limit ?? 20) || 20, 1), 100)
      const offset = Math.max(Math.trunc(params.offset ?? 0) || 0, 0)
      return repos.patients.list({ q: params.q?.trim() || undefined, limit, offset })
    },

    get: mustGet,

    async create(body: unknown): Promise<Patient> {
      const input = pick(body)
      validate(input)
      return repos.patients.create({ address: '', ...input } as NewPatient)
    },

    async update(id: string, body: unknown): Promise<Patient> {
      const current = await mustGet(id)
      const patch = pick(body)
      // Kiểm tra trên bản ghi sau khi sửa để không lọt dữ liệu sai (vd. xoá tên người giám hộ của trẻ em)
      const { id: _id, code: _code, createdAt: _c, updatedAt: _u, ...rest } = current
      validate({ ...rest, ...patch })
      const updated = await repos.patients.update(id, patch)
      if (!updated) throw new ApiError('not_found', 'Không tìm thấy hồ sơ người bệnh')
      return updated
    },

    /** Chỉ xoá được hồ sơ chưa khám và chưa thu tiền (bệnh án, chứng từ phải lưu trữ) */
    async remove(id: string) {
      await mustGet(id)
      const block = patientDeleteBlock(await repos.visits.listByPatient(id))
      if (block) throw new ApiError('conflict', block)
      await repos.patients.remove(id)
    },
  }
}
