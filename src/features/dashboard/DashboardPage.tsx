import { useMemo, useState } from 'react'
import { CheckCheck, CheckCircle2, Circle } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { SERIES, StackedBarLine } from '@/components/charts/Charts'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import { addDays, formatDateTimeVN, formatDateVN, todayISO } from '@/lib/date'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'
import { dailyAttendance, inRange, isAttended, netOf, revenueEntries } from '../reports/reportData'
import type { RouteKey } from '@/store/types'

type Period = 'today' | '7d' | '30d'

/** "14:25" nếu là hôm nay, ngược lại "14:25 23/11" (theo giờ máy) */
function shortStamp(iso: string, today: string) {
  const full = formatDateTimeVN(iso) // HH:mm dd/MM/yyyy
  return full.slice(6) === formatDateVN(today) ? full.slice(0, 5) : full.slice(0, 11)
}
const PERIOD_DAYS: Record<Period, number> = { today: 1, '7d': 7, '30d': 30 }

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const W = 76
  const H = 22
  const pad = 2
  const max = Math.max(1, ...values)
  const step = values.length > 1 ? (W - pad * 2) / (values.length - 1) : 0
  const points = values.map((v, i) => `${(pad + i * step).toFixed(1)},${(H - pad - (v / max) * (H - pad * 2)).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
      {values.length > 0 && <polyline points={points} fill="none" style={{ stroke: color }} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  )
}

function MixDonut({ nw, old, total }: { nw: number; old: number; total: number }) {
  const newPct = total ? Math.round((nw / total) * 100) : 0
  const oldPct = total ? 100 - newPct : 0
  const r = 41
  const cx = 58
  const cy = 58
  const circ = 2 * Math.PI * r
  const lenNew = (newPct / 100) * circ
  const lenOld = circ - lenNew
  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 116 116" width={108} height={108} role="img" aria-label="Tỉ lệ người bệnh mới và cũ">
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={r} fill="none" style={{ stroke: 'var(--chart-track)' }} strokeWidth={14} />
        ) : (
          <>
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              style={{ stroke: SERIES.old }}
              strokeWidth={14}
              strokeDasharray={`${lenOld} ${circ}`}
              strokeDashoffset={-lenNew}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              style={{ stroke: SERIES.new }}
              strokeWidth={14}
              strokeDasharray={`${lenNew} ${circ}`}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          </>
        )}
        <text x={cx} y={cy + 1} textAnchor="middle" className="fill-ink" fontSize={21} fontWeight={700}>
          {newPct}%
        </text>
        <text x={cx} y={cy + 17} textAnchor="middle" className="fill-ink-4" fontSize={10.5} fontWeight={500}>
          mới
        </text>
      </svg>
      <div className="space-y-0.5 text-center text-[12.5px] leading-snug">
        <div className="font-bold text-brand-ink">
          Mới: {newPct}% ({formatNumber(nw)})
        </div>
        <div className="font-semibold text-ink-2">
          Cũ: {oldPct}% ({formatNumber(old)})
        </div>
      </div>
    </div>
  )
}

/** Tổng quan 6C Bento – số liệu lấy trực tiếp từ dữ liệu dùng chung */
export function DashboardPage() {
  const { visits, patients, schedules, clinicProfile } = useClinicState()
  const { navigate, setUI } = useClinicActions()
  const toast = useToast()
  const [period, setPeriod] = useState<Period>('7d')
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const to = todayISO()
  const from = addDays(to, -(PERIOD_DAYS[period] - 1))

  const data = useMemo(() => {
    const rev = revenueEntries(visits).filter((e) => inRange(e.date, from, to))
    const inPeriod = visits.filter((v) => inRange(v.date, from, to))
    const attended = inPeriod.filter(isAttended)
    const series = dailyAttendance(visits, from, to)
    const allPatients = new Set(attended.map((v) => v.patientId))
    const newPatients = new Set(attended.filter((v) => v.patientType === 'new').map((v) => v.patientId))
    const orders = attended.flatMap((v) => v.paraclinicalOrders ?? []).filter((o) => o.sentAt)
    return {
      total: rev.reduce((s, e) => s + netOf(e), 0),
      clinic: rev.reduce((s, e) => s + e.consultation, 0),
      services: rev.reduce((s, e) => s + e.paraclinical, 0),
      visits: attended.length,
      booked: inPeriod.filter((v) => v.category === 'booked' && v.status !== 'cancelled').length,
      prescriptions: attended.filter((v) => v.exam?.prescription.length).length,
      orders: orders.length,
      series,
      patients: allPatients.size,
      newCount: newPatients.size,
      oldCount: allPatients.size - newPatients.size,
    }
  }, [visits, from, to])

  // Thông báo: các sự kiện gần nhất trong dữ liệu (lượt mới, kết quả CLS)
  const notices = useMemo(() => {
    const byId = new Map(patients.map((p) => [p.id, p]))
    const items: { id: string; title: string; body: string; at: string; route: RouteKey }[] = []
    for (const v of visits) {
      const p = byId.get(v.patientId)
      if (!p) continue
      for (const o of v.paraclinicalOrders ?? []) {
        if (o.result?.updatedAt) items.push({ id: `r_${o.id}`, title: 'Có kết quả cận lâm sàng', body: `${o.name} – ${p.fullName}`, at: o.result.updatedAt, route: o.category === 'imaging' ? 'imaging' : 'lab' })
      }
      if (v.status === 'waiting' && v.checkedInAt) items.push({ id: `w_${v.id}`, title: 'Người bệnh chờ khám', body: `STT ${v.queueNumber} – ${p.fullName}`, at: v.checkedInAt, route: 'examination' })
    }
    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8)
  }, [visits, patients])

  const checklist: { label: string; done: boolean; route?: RouteKey }[] = [
    { label: 'Thiết lập thông tin phòng khám', done: Boolean(clinicProfile?.clinicName), route: 'system' },
    { label: 'Thiết lập lịch làm việc', done: Boolean(schedules?.fixed.some((s) => s.enabled)), route: 'schedule' },
    { label: 'Thiết lập danh mục cận lâm sàng tại phòng khám', done: true, route: 'paraclinical-settings' },
  ]
  const doneCount = checklist.filter((c) => c.done).length
  const pctDone = Math.round((doneCount / checklist.length) * 100)
  const ringR = 13
  const ringC = 2 * Math.PI * ringR
  const ringDash = (pctDone / 100) * ringC

  const clinicPct = data.total ? Math.round((data.clinic / data.total) * 100) : 0
  const servPct = data.total ? 100 - clinicPct : 0

  const askNotify = async () => {
    if (!('Notification' in window)) return toast({ title: 'Trình duyệt không hỗ trợ thông báo', tone: 'warning' })
    const res = await Notification.requestPermission()
    toast({ title: res === 'granted' ? 'Đã bật thông báo trên trình duyệt' : 'Chưa được cấp quyền thông báo', tone: res === 'granted' ? 'success' : 'warning' })
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Tổng quan"
        subtitle={`${formatDateVN(from)} – ${formatDateVN(to)}`}
        actions={
          <>
            <Tabs
              variant="pill"
              value={period}
              onChange={setPeriod}
              items={[
                { value: 'today', label: 'Hôm nay' },
                { value: '7d', label: '7 ngày qua' },
                { value: '30d', label: '30 ngày qua' },
              ]}
            />
            <Button onClick={() => navigate('reception')}>Vào quầy Lễ tân</Button>
          </>
        }
      />

      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto bg-canvas">
        <div className="mx-auto flex max-w-[1920px] flex-col gap-3.5 px-4 pb-5 sm:px-6 xl:h-full xl:max-h-[980px] xl:min-h-[620px]">
          {/* Hàng trên: Hero Doanh thu Bento + Tỉ lệ & Xu hướng */}
          <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[1.38fr_1fr]">
            <section className="rounded-[18px] border border-line bg-surface px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold text-ink-3">Tổng doanh thu</p>
                  <p className="mt-0.5 text-[30px] leading-tight font-bold tracking-[-0.025em] text-ink tabular-nums">
                    {formatNumber(data.total)} đ
                  </p>
                </div>
                <span className="rounded-full border border-line bg-subtle px-3 py-1 text-[13px] text-ink-2">
                  Lượt khám: <b className="text-ink tabular-nums">{formatNumber(data.visits)}</b>
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-[14px] border border-brand-line bg-brand-tint px-3.5 py-3">
                  <div className="flex items-center justify-between text-[13.5px] font-semibold text-brand-ink">
                    <span>Phòng khám</span>
                    <span className="tabular-nums">{clinicPct}%</span>
                  </div>
                  <p className="my-0.5 text-[21px] font-bold text-ink tabular-nums">{formatNumber(data.clinic)} đ</p>
                  <p className="text-[13px] text-ink-2">
                    Đặt lịch trước: <b className="tabular-nums">{formatNumber(data.booked)}</b>
                  </p>
                </div>

                <div className="rounded-[14px] border border-accent-line bg-accent-tint px-3.5 py-3">
                  <div className="flex items-center justify-between text-[13.5px] font-semibold text-accent-ink">
                    <span>Doanh thu dịch vụ</span>
                    <span className="tabular-nums">{servPct}%</span>
                  </div>
                  <p className="my-0.5 text-[21px] font-bold text-ink tabular-nums">{formatNumber(data.services)} đ</p>
                  <div className="flex flex-wrap gap-3 text-[13px] text-ink-2">
                    <span>
                      Đơn thuốc: <b className="tabular-nums">{formatNumber(data.prescriptions)}</b>
                    </span>
                    <span>
                      Chỉ định: <b className="tabular-nums">{formatNumber(data.orders)}</b>
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 items-center gap-5 rounded-[18px] border border-line bg-surface px-5 py-4 sm:grid-cols-[auto_1fr]">
              <MixDonut nw={data.newCount} old={data.oldCount} total={data.patients} />
              <div className="min-w-0">
                <h2 className="mb-1.5 text-[15px] font-bold text-ink">Tỉ lệ và xu hướng người bệnh</h2>
                <div>
                  {(
                    [
                      ['Tổng người bệnh', data.patients, 'var(--color-ink-3)', data.series.map((d) => d.old + d.new)],
                      ['Khách hàng mới', data.newCount, SERIES.new, data.series.map((d) => d.new)],
                      ['Khách hàng cũ', data.oldCount, SERIES.visits, data.series.map((d) => d.old)],
                    ] as const
                  ).map(([label, value, color, values]) => (
                    <div key={label} className="grid grid-cols-[1fr_76px_42px] items-center gap-2 border-b border-line py-2 last:border-b-0 last:pb-0">
                      <span className="truncate text-[13.5px] font-medium text-ink-2">{label}</span>
                      <Sparkline values={[...values]} color={color} />
                      <b className="text-right text-[15px] text-ink tabular-nums">{formatNumber(value)}</b>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Hàng dưới: Biểu đồ lượt khám + Cặp thẻ Thông báo & Kích hoạt (giãn hết chiều cao còn lại trên màn rộng) */}
          <div className="grid grid-cols-1 gap-3.5 xl:min-h-0 xl:flex-1 xl:grid-cols-[1.38fr_1fr]">
            <section className="flex min-h-[320px] flex-col rounded-[18px] border border-line bg-surface px-5 py-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[15px] font-bold text-ink">Lượt người bệnh đến khám</h2>
                <LegendRow />
              </div>
              <div className="min-h-0 flex-1">
                <StackedBarLine data={data.series} height="fill" minHeight={240} />
              </div>
            </section>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:min-h-0">
              <section className="flex min-h-0 flex-col rounded-[18px] border border-line bg-surface px-4 py-3.5">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <h2 className="text-[15px] font-bold text-ink">Thông báo hôm nay</h2>
                  <button
                    type="button"
                    onClick={() => setReadIds(new Set(notices.map((n) => n.id)))}
                    className="inline-flex items-center gap-1 rounded-md text-[12.5px] font-semibold text-brand-ink hover:underline"
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> Đọc tất cả
                  </button>
                </div>
                {notices.length === 0 ? (
                  <p className="flex flex-1 items-center justify-center gap-2 py-6 text-[13px] text-ink-3">
                    Chưa có thông báo mới
                  </p>
                ) : (
                  <div className="thin-scroll -mr-2 min-h-0 flex-1 divide-y divide-line overflow-y-auto pr-2">
                    {notices.map((n) => {
                      const unread = !readIds.has(n.id)
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            setReadIds((s) => new Set(s).add(n.id))
                            if (n.route === 'examination') setUI({ examVisitId: null })
                            navigate(n.route)
                          }}
                          className="group flex w-full flex-col gap-0.5 py-2 text-left last:pb-0"
                        >
                          <div className="flex w-full items-center justify-between gap-1.5">
                            <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-ink group-hover:text-brand-ink">
                              {unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                              <span className="truncate">{n.title}</span>
                            </span>
                            <span className="shrink-0 text-[11.5px] text-ink-4 tabular-nums">{shortStamp(n.at, to)}</span>
                          </div>
                          <span className="line-clamp-2 text-[13px] text-ink-2">{n.body}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </section>

              <section className="flex min-h-0 flex-col justify-between gap-2.5 rounded-[18px] border border-line bg-surface px-4 py-3.5">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h2 className="text-[15px] font-bold text-ink">Kích hoạt</h2>
                    <div className="inline-flex items-center gap-1.5">
                      <svg width={32} height={32} viewBox="0 0 34 34" aria-hidden="true">
                        <circle cx={17} cy={17} r={ringR} fill="none" style={{ stroke: 'var(--chart-track)' }} strokeWidth={4} />
                        <circle
                          cx={17}
                          cy={17}
                          r={ringR}
                          fill="none"
                          style={{ stroke: 'var(--color-brand)' }}
                          strokeWidth={4}
                          strokeLinecap="round"
                          strokeDasharray={`${ringDash} ${ringC}`}
                          transform="rotate(-90 17 17)"
                        />
                      </svg>
                      <span className="text-[12.5px] font-bold text-accent-ink tabular-nums">
                        {doneCount}/{checklist.length}
                      </span>
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {checklist.map((c) => (
                      <li key={c.label}>
                        <button
                          type="button"
                          disabled={!c.route}
                          onClick={() => c.route && navigate(c.route)}
                          className="flex w-full items-start gap-2 py-0.5 text-left text-[13.5px] leading-snug enabled:hover:text-brand-ink disabled:cursor-default"
                        >
                          {c.done ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-ink" />
                          ) : (
                            <Circle className="mt-0.5 h-4 w-4 shrink-0 text-line-strong" />
                          )}
                          <span className={cn(c.done ? 'text-ink-3' : 'font-medium text-ink')}>{c.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-[12px] border border-accent-line bg-accent-tint p-2.5">
                  <p className="mb-2 text-[13.5px] font-medium text-accent-strong">Nhận thông báo lịch và CLS</p>
                  <Button size="sm" className="w-full" onClick={askNotify}>
                    Bật thông báo
                  </Button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LegendRow() {
  return (
    <ul className="flex flex-wrap justify-center gap-4 text-[12.5px] text-ink-2">
      <li className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES.old }} />
        Người bệnh cũ
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES.new }} />
        Người bệnh mới
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded" style={{ background: SERIES.visits }} />
        Lượt khám
      </li>
    </ul>
  )
}
