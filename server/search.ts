/** Bỏ dấu tiếng Việt, đưa về chữ thường (tìm "nguyen van an" ra "Nguyễn Văn An") */
export function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

/** Khớp hồ sơ với từ khoá: họ tên / mã BN (không dấu, một phần) hoặc SĐT (từ 3 chữ số) */
export function matchesPatient(p: { fullName: string; code: string; phone: string }, q: string) {
  const needle = normalize(q)
  if (!needle) return true
  const digits = needle.replace(/\D/g, '')
  if (digits.length >= 3 && p.phone.replace(/\D/g, '').includes(digits)) return true
  return normalize(`${p.fullName} ${p.code}`).includes(needle)
}
