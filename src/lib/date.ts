export const pad = (n: number) => String(n).padStart(2, '0')

/** Local date -> 'YYYY-MM-DD' */
export function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayISO() {
  return toISODate(new Date())
}

export function parseISODate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function addDays(iso: string, days: number) {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function formatDateVN(iso?: string) {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export function formatDateTimeVN(isoDateTime?: string) {
  if (!isoDateTime) return ''
  const d = new Date(isoDateTime)
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

export function nowTime() {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Cộng thêm số phút vào chuỗi HH:mm */
export function addMinutesToTime(hhmm: string, plusMinutes = 30) {
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm
  const total = ((h * 60 + m + plusMinutes) % 1440 + 1440) % 1440
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

export function formatTimeRange(start: string, end?: string) {
  if (!start) return ''
  return `${start} - ${end || addMinutesToTime(start, 30)}`
}

/** Tuổi hiển thị kiểu nhi khoa: ngày / tháng / tuổi */
export function ageLabel(dob: string, refIso: string = todayISO()) {
  const birth = parseISODate(dob)
  const ref = parseISODate(refIso)
  const days = Math.floor((ref.getTime() - birth.getTime()) / 86_400_000)
  if (days < 0) return ''
  if (days < 31) return `${days} ngày`
  let months = (ref.getFullYear() - birth.getFullYear()) * 12 + (ref.getMonth() - birth.getMonth())
  if (ref.getDate() < birth.getDate()) months -= 1
  if (months < 24) return `${Math.max(months, 1)} tháng`
  return `${Math.floor(months / 12)} tuổi`
}

export function ageInYears(dob: string, refIso: string = todayISO()) {
  const birth = parseISODate(dob)
  const ref = parseISODate(refIso)
  let years = ref.getFullYear() - birth.getFullYear()
  if (ref.getMonth() < birth.getMonth() || (ref.getMonth() === birth.getMonth() && ref.getDate() < birth.getDate())) years -= 1
  return years
}

export const WEEKDAYS_VN = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
