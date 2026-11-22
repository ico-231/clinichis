import { normalizeText } from '@/lib/format'
import type { Patient } from './types'

/**
 * Hồ sơ có thể trùng với người bệnh sắp tạo: cùng họ tên VÀ (cùng ngày sinh HOẶC cùng số điện thoại).
 * Chỉ trùng số điện thoại không tính (anh chị em thường dùng chung số của bố mẹ).
 */
export function findDuplicatePatients(patients: Patient[], input: { fullName: string; dob: string; phone: string }, excludeId?: string): Patient[] {
  const name = normalizeText(input.fullName).replace(/\s+/g, ' ').trim()
  const phone = input.phone.replace(/\D/g, '')
  if (!name) return []
  return patients.filter(
    (p) => p.id !== excludeId && normalizeText(p.fullName).replace(/\s+/g, ' ').trim() === name && ((!!input.dob && p.dob === input.dob) || (!!phone && p.phone === phone)),
  )
}
