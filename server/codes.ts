import { RUNTIME } from '../src/store/runtime'
import type { Repos } from './repo'

/** Số thứ tự tiếp theo của ngày; mức sàn = STT lớn nhất đang có (an toàn cả khi bộ đếm mới tạo) */
export async function nextQueue(repos: Repos, date: string) {
  const sameDay = await repos.visits.list({ dateFrom: date, dateTo: date })
  return repos.counters.next(`queue:${date}`, sameDay.reduce((m, v) => Math.max(m, v.queueNumber), 0))
}

/** Mã phiếu thu theo ngày thu: TIỀN_TỐ + yyyymmdd + số thứ tự (không trùng giữa các quầy) */
export async function nextReceiptCode(repos: Repos, day: string) {
  const prefix = `${RUNTIME.codePrefix}${day.replace(/-/g, '')}`
  const sameDay = await repos.visits.list({ dateFrom: day, dateTo: day })
  const floor = sameDay.flatMap((v) => v.payments).reduce((m, p) => Math.max(m, p.code?.startsWith(prefix) ? Number(p.code.slice(prefix.length)) || 0 : 0), 0)
  const n = await repos.counters.next(`receipt:${day}`, floor)
  return `${prefix}${String(n).padStart(RUNTIME.seqDigits, '0')}`
}
