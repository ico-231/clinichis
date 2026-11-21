import { useMemo, useState, type ReactNode } from 'react'
import { BellRing, Building2, CheckCheck, CheckCircle2, Circle, FlaskConical, Rocket, Stethoscope, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { Donut, MiniArea, SERIES, StackedBarLine } from '@/components/charts/Charts'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import { addDays, formatDateTimeVN, todayISO } from '@/lib/date'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'
import { dailyAttendance, inRange, isAttended, netOf, revenueEntries } from '../reports/reportData'
import type { RouteKey } from '@/store/types'

type Period = 'today' | '7d' | '30d'
const PERIOD_DAYS: Record<Period, number> = { today: 1, '7d': 7, '30d': 30 }

/** Tổng quan (ảnh 001) – số liệu lấy trực tiếp từ dữ liệu dùng chung */
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
    // Thông tin phòng khám nay chỉnh ở Hệ thống (mục riêng trên menu và tư vấn trực tuyến đã bỏ)
    { label: 'Thiết lập thông tin phòng khám', done: Boolean(clinicProfile?.clinicName), route: 'system' },
    { label: 'Thiết lập lịch làm việc', done: Boolean(schedules?.fixed.some((s) => s.enabled)), route: 'schedule' },
    { label: 'Thiết lập danh mục cận lâm sàng tại phòng khám', done: true, route: 'paraclinical-settings' },
  ]
  const remaining = checklist.filter((c) => !c.done).length

  const askNotify = async () => {
    if (!('Notification' in window)) return toast({ title: 'Trình duyệt không hỗ trợ thông báo', tone: 'warning' })
    const res = await Notification.requestPermission()
    toast({ title: res === 'granted' ? 'Đã bật thông báo trên trình duyệt' : 'Chưa được cấp quyền thông báo', tone: res === 'granted' ? 'success' : 'warning' })
  }

  const cards: { title: string; value: number; icon: ReactNode; tone: string; sub: [string, number][] }[] = [
    { title: 'Tổng doanh thu', value: data.total, icon: <Stethoscope className="h-4 w-4" />, tone: 'bg-blue-50 text-blue-600', sub: [['Lượt khám', data.visits]] },
    { title: 'Phòng khám', value: data.clinic, icon: <Building2 className="h-4 w-4" />, tone: 'bg-orange-50 text-orange-600', sub: [['Ký trước', data.booked]] },
    { title: 'Doanh thu dịch vụ', value: data.services, icon: <FlaskConical className="h-4 w-4" />, tone: 'bg-violet-50 text-violet-600', sub: [['Đơn thuốc', data.prescriptions], ['Chỉ định', data.orders]] },
  ]

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Tổng quan" />
      <div className="thin-scroll flex-1 overflow-y-auto bg-slate-50/60 p-3">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_300px]">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[16px] font-semibold text-slate-900">Báo cáo tổng quan</h2>
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
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {cards.map((c) => (
                <div key={c.title} className="rounded-xl border border-slate-200 bg-white">
                  <div className="p-3">
                    <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', c.tone)}>{c.icon}</span>
                    <p className="mt-2 text-[11.5px] font-semibold tracking-wide text-slate-600 uppercase">{c.title}</p>
                    <p className="text-[20px] font-semibold text-blue-600 tabular-nums">{formatNumber(c.value)}</p>
                  </div>
                  <div className="flex justify-between gap-2 border-t border-slate-100 px-3 py-2 text-[12px] text-slate-600">
                    {c.sub.map(([k, v]) => (
                      <span key={k}>
                        {k}: <b className="text-blue-600">{formatNumber(v)}</b>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr]">
              <Panel title="Lượt người bệnh đến khám">
                <StackedBarLine data={data.series} />
                <div className="mt-2">
                  <LegendRow />
                </div>
              </Panel>
              <Panel title="Tỉ lệ khách mới/cũ" center>
                <Donut
                  label="Tỉ lệ người bệnh mới và cũ"
                  slices={[
                    { label: 'Người bệnh mới', value: data.newCount, color: SERIES.new },
                    { label: 'Người bệnh cũ', value: data.oldCount, color: SERIES.old },
                  ]}
                />
              </Panel>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {(
                [
                  ['Tổng người bệnh', data.patients, '#2563eb', data.series.map((d) => d.old + d.new)],
                  ['Khách hàng mới', data.newCount, '#10b981', data.series.map((d) => d.new)],
                  ['Khách hàng cũ', data.oldCount, '#f97316', data.series.map((d) => d.old)],
                ] as const
              ).map(([title, value, color, values]) => (
                <div key={title} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[13.5px] font-semibold text-slate-800">
                      <span className="h-4 w-1 rounded" style={{ background: color }} />
                      {title}
                    </span>
                    <b className="tabular-nums" style={{ color }}>
                      {formatNumber(value)}
                    </b>
                  </div>
                  {values.some((v) => v > 0) ? <MiniArea values={[...values]} color={color} label={`${title} theo ngày`} /> : <p className="py-8 text-center text-[13px] text-slate-400">Không có dữ liệu</p>}
                </div>
              ))}
            </div>
          </div>

          <aside className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[14px] font-semibold text-blue-700">Kích hoạt toàn diện phòng khám</p>
              <p className="text-[12px] text-slate-500">{remaining ? `Bạn còn ${remaining} tác vụ sau` : 'Đã hoàn tất các tác vụ'}</p>
              <ul className="mt-2 space-y-1.5">
                {checklist.map((c) => (
                  <li key={c.label}>
                    <button
                      type="button"
                      disabled={!c.route}
                      onClick={() => c.route && navigate(c.route)}
                      className="flex w-full items-start gap-2 text-left text-[12.5px] text-slate-700 enabled:hover:text-blue-700 disabled:cursor-default"
                    >
                      {c.done ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />}
                      <span className={cn(c.done && 'text-slate-500')}>{c.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
              <p className="flex items-center gap-2 text-[14px] font-semibold text-slate-900">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-white">
                  <BellRing className="h-3.5 w-3.5" />
                </span>
                Nhận thông báo
              </p>
              <p className="mt-1 text-[12.5px] text-slate-700">Cho phép trình duyệt gửi thông báo khi có lịch khám, kết quả cận lâm sàng hoặc người bệnh mới.</p>
              <button type="button" onClick={askNotify} className="mt-2 rounded-full bg-slate-900 px-3 py-1 text-[12px] font-medium text-white hover:bg-slate-700">
                Nhận thông báo
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                <p className="text-[14px] font-semibold">Thông báo</p>
                <button type="button" onClick={() => setReadIds(new Set(notices.map((n) => n.id)))} className="flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-900">
                  <CheckCheck className="h-3.5 w-3.5" /> Đọc tất cả
                </button>
              </div>
              {notices.length === 0 ? (
                <p className="flex items-center gap-2 px-3 py-6 text-[12.5px] text-slate-500">
                  <Rocket className="h-4 w-4" /> Chưa có thông báo mới
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {notices.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setReadIds((s) => new Set(s).add(n.id))
                          if (n.route === 'examination') setUI({ examVisitId: null })
                          navigate(n.route)
                        }}
                        className={cn('w-full px-3 py-2 text-left hover:bg-slate-50', !readIds.has(n.id) && 'bg-blue-50/40')}
                      >
                        <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-900">
                          {!readIds.has(n.id) && <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />}
                          {n.title === 'Có kết quả cận lâm sàng' ? <FlaskConical className="h-3.5 w-3.5 text-violet-600" /> : <Wallet className="h-3.5 w-3.5 text-orange-500" />}
                          {n.title}
                        </span>
                        <span className="block text-[12px] text-slate-600">{n.body}</span>
                        <span className="text-[11px] text-slate-400">{formatDateTimeVN(n.at)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function Panel({ title, children, center }: { title: string; children: ReactNode; center?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className={cn('mb-2 text-[14px] font-semibold text-slate-900', center && 'text-center')}>{title}</p>
      {children}
    </div>
  )
}

export function LegendRow() {
  return (
    <ul className="flex flex-wrap justify-center gap-4 text-[12px] text-slate-600">
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
