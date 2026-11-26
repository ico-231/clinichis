import { addDays, parseISODate } from '@/lib/date'

/** Khoá localStorage ghi "ngày của bộ dữ liệu mẫu" (ngày nạp mẫu / lần dời gần nhất) */
export const DEMO_DAY_KEY = 'clinic-his:demo-day'

/** Số ngày từ `from` tới `to` (YYYY-MM-DD, theo lịch) */
export function daysBetweenISO(from: string, to: string) {
  return Math.round((parseISODate(to).getTime() - parseISODate(from).getTime()) / 86_400_000)
}

const ISO_DATE = /(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/g
/** Mã khám / mã phiếu dạng <TIỀN TỐ><yyyymmdd><số thứ tự>, ví dụ "YMD202611260000001" */
const DATED_CODE = /"([A-Z]{2,6})(20\d{2})(\d{2})(\d{2})(\d{3,9})"/g

const validDate = (y: string, m: string, d: string) => {
  const mm = Number(m)
  const dd = Number(d)
  return Number(y) >= 2000 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31
}

/**
 * Dời mọi mốc ngày trong dữ liệu đã lưu (chuỗi JSON) đi `days` ngày: ngày khám, giờ thu, ngày sinh,
 * lịch hẹn… và phần ngày trong mã khám / mã phiếu. Dùng khi người xem mở lại bản demo sau vài ngày:
 * dữ liệu "hôm nay" vẫn là hôm nay, tuổi các bé giữ nguyên, thao tác người xem đã làm không mất.
 */
export function shiftDemoDates(json: string, days: number): string {
  if (!days) return json
  return json
    .replace(ISO_DATE, (all, y: string, m: string, d: string) => (validDate(y, m, d) ? addDays(`${y}-${m}-${d}`, days) : all))
    .replace(DATED_CODE, (all, prefix: string, y: string, m: string, d: string, seq: string) =>
      validDate(y, m, d) ? `"${prefix}${addDays(`${y}-${m}-${d}`, days).replace(/-/g, '')}${seq}"` : all,
    )
}
