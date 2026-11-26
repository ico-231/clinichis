import { useLayoutEffect, useRef, useState, type ReactNode, useId } from 'react'
import { formatNumber } from '@/lib/format'

/**
 * Màu biểu đồ lấy từ biến CSS (src/index.css, --chart-*) nên tự đổi theo giao diện sáng/tối.
 * Cũ (ngọc nhạt) / mới (ngọc đậm) / lượt khám (cam san hô).
 */
export const SERIES = { old: 'var(--chart-old)', new: 'var(--chart-new)', visits: 'var(--chart-visits)' } as const
export const CATEGORICAL = ['var(--chart-new)', 'var(--chart-visits)', 'var(--chart-info)', 'var(--chart-warn)', 'var(--chart-violet)']

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setSize({ w: el.clientWidth, h: el.clientHeight })
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size] as const
}

function useWidth<T extends HTMLElement>() {
  const [ref, size] = useSize<T>()
  return [ref, size.w] as const
}

const niceMax = (v: number) => {
  if (v <= 4) return 4
  const p = 10 ** Math.floor(Math.log10(v))
  return Math.ceil(v / p) * p
}

function Tooltip({ x, y, children, width }: { x: number; y: number; children: ReactNode; width: number }) {
  const left = Math.min(Math.max(x + 12, 4), width - 170)
  return (
    <div role="status" className="pointer-events-none absolute z-10 min-w-[150px] rounded-md bg-overlay/95 px-2.5 py-1.5 text-[12px] text-white shadow-lg" style={{ left, top: Math.max(y - 10, 0) }}>
      {children}
    </div>
  )
}

export function Legend({ items }: { items: { label: string; color: string; line?: boolean }[] }) {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] text-ink-3">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          {i.line ? <span className="h-0.5 w-4 rounded" style={{ background: i.color }} /> : <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />}
          {i.label}
        </li>
      ))}
    </ul>
  )
}

export interface StackPoint {
  label: string
  old: number
  new: number
  visits: number
}

/**
 * Cột chồng người bệnh cũ/mới + đường lượt khám (một trục: đều là "lượt").
 * height="fill": cao theo khung chứa (khung phải có chiều cao, vd. flex-1 min-h-0).
 */
export function StackedBarLine({ data, height: heightProp = 220, minHeight = 200 }: { data: StackPoint[]; height?: number | 'fill'; minHeight?: number }) {
  const [ref, size] = useSize<HTMLDivElement>()
  const width = size.w
  const fill = heightProp === 'fill'
  const height = fill ? Math.max(size.h, minHeight) : heightProp
  const [hover, setHover] = useState<number | null>(null)
  const pad = { l: 32, r: 8, t: 10, b: 26 }
  const max = niceMax(Math.max(1, ...data.map((d) => Math.max(d.old + d.new, d.visits))))
  const innerW = Math.max(width - pad.l - pad.r, 10)
  const innerH = height - pad.t - pad.b
  const step = innerW / Math.max(data.length, 1)
  const barW = Math.min(64, step * 0.62)
  const y = (v: number) => pad.t + innerH - (v / max) * innerH
  const cx = (i: number) => pad.l + step * i + step / 2
  const ticks = [0, max / 4, max / 2, (max * 3) / 4, max]
  const labelEvery = Math.ceil(data.length / Math.max(1, Math.floor(innerW / 48)))
  return (
    // SVG nằm tuyệt đối trong khung cao cố định => không đẩy rộng ô grid/flex chứa nó, chỉ co giãn theo khung
    <div ref={ref} className={fill ? 'relative h-full w-full min-w-0' : 'relative w-full min-w-0'} style={fill ? { minHeight } : { height }} onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} className="absolute top-0 left-0" role="img" aria-label="Biểu đồ lượt người bệnh đến khám theo ngày">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} style={{ stroke: t === 0 ? 'var(--chart-axis)' : 'var(--chart-grid)' }} strokeDasharray={t === 0 ? undefined : '3 4'} />
              <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize={11} className="fill-ink-4">
                {formatNumber(Math.round(t))}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const total = d.old + d.new
            const hOld = (d.old / max) * innerH
            const hNew = (d.new / max) * innerH
            const base = y(0)
            return (
              <g key={d.label}>
                <rect x={cx(i) - barW / 2} y={pad.t} width={barW} height={innerH} rx={6} style={{ fill: hover === i ? 'var(--chart-track-hover)' : 'var(--chart-track)' }} />
                {d.old > 0 && <rect x={cx(i) - barW / 2} y={base - hOld} width={barW} height={hOld} rx={total === d.old ? 5 : 0} style={{ fill: SERIES.old }} opacity={hover === null || hover === i ? 1 : 0.55} />}
                {d.new > 0 && <rect x={cx(i) - barW / 2} y={base - hOld - hNew} width={barW} height={Math.max(hNew - 2, 1)} rx={5} style={{ fill: SERIES.new }} opacity={hover === null || hover === i ? 1 : 0.55} />}
                {i % labelEvery === 0 && (
                  <text x={cx(i)} y={height - 8} textAnchor="middle" fontSize={11} className={hover === i ? 'fill-ink font-semibold' : 'fill-ink-3'}>
                    {d.label}
                  </text>
                )}
                <rect x={pad.l + step * i} y={pad.t} width={step} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} />
              </g>
            )
          })}
          <polyline fill="none" style={{ stroke: SERIES.visits }} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" points={data.map((d, i) => `${cx(i)},${y(d.visits)}`).join(' ')} pointerEvents="none" />
          {data.map((d, i) => (
            <circle key={d.label} cx={cx(i)} cy={y(d.visits)} r={hover === i ? 5 : 3.5} style={{ fill: 'var(--color-surface)', stroke: SERIES.visits }} strokeWidth={2.3} pointerEvents="none" />
          ))}
        </svg>
      )}
      {hover !== null && data[hover] && (
        <Tooltip x={cx(hover)} y={y(Math.max(data[hover].old + data[hover].new, data[hover].visits))} width={width}>
          <p className="mb-0.5 font-semibold">{data[hover].label}</p>
          <TipRow color={SERIES.old} label="Người bệnh cũ" value={data[hover].old} />
          <TipRow color={SERIES.new} label="Người bệnh mới" value={data[hover].new} />
          <TipRow color={SERIES.visits} label="Lượt khám" value={data[hover].visits} />
        </Tooltip>
      )}
    </div>
  )
}

function TipRow({ color, label, value, suffix = '' }: { color: string; label: string; value: number; suffix?: string }) {
  return (
    <p className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
        {label}
      </span>
      <b className="tabular-nums">
        {formatNumber(value)}
        {suffix}
      </b>
    </p>
  )
}

/** Biểu đồ tròn khuyết, có % trên lát lớn và tooltip */
export function Donut({ slices, size = 170, label }: { slices: { label: string; value: number; color: string }[]; size?: number; label: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const total = slices.reduce((s, x) => s + x.value, 0)
  const r = size / 2 - 8
  const inner = r * 0.55
  let angle = -Math.PI / 2
  const arcs = slices.map((s, i) => {
    const frac = total ? s.value / total : 0
    const a0 = angle
    const a1 = angle + frac * Math.PI * 2
    angle = a1
    const large = a1 - a0 > Math.PI ? 1 : 0
    const p = (a: number, rad: number) => `${size / 2 + rad * Math.cos(a)},${size / 2 + rad * Math.sin(a)}`
    const d =
      frac >= 0.9999
        ? `M ${p(0, r)} A ${r} ${r} 0 1 1 ${p(Math.PI, r)} A ${r} ${r} 0 1 1 ${p(0, r)} M ${p(0, inner)} A ${inner} ${inner} 0 1 0 ${p(Math.PI, inner)} A ${inner} ${inner} 0 1 0 ${p(0, inner)} Z`
        : `M ${p(a0, r)} A ${r} ${r} 0 ${large} 1 ${p(a1, r)} L ${p(a1, inner)} A ${inner} ${inner} 0 ${large} 0 ${p(a0, inner)} Z`
    const mid = (a0 + a1) / 2
    return { d, frac, mid, i }
  })
  return (
    <div className="relative flex flex-col items-center gap-2">
      {/* Chừa lề 26px quanh vòng để nhãn % bên ngoài không bị cắt */}
      <svg width={size + 52} height={size + 52} viewBox={`-26 -26 ${size + 52} ${size + 52}`} role="img" aria-label={label} onMouseLeave={() => setHover(null)}>
        {total === 0 ? (
          <circle cx={size / 2} cy={size / 2} r={(r + inner) / 2} fill="none" style={{ stroke: 'var(--chart-track)' }} strokeWidth={r - inner} />
        ) : (
          arcs.map((a) =>
            a.frac > 0 ? (
              <path key={a.i} d={a.d} style={{ fill: slices[a.i].color, stroke: 'var(--color-surface)' }} fillRule="evenodd" strokeWidth={2} opacity={hover === null || hover === a.i ? 1 : 0.55} onMouseEnter={() => setHover(a.i)} />
            ) : null,
          )
        )}
        {arcs.map((a) =>
          a.frac >= 0.08 ? (
            <text key={a.i} x={size / 2 + (r + 16) * Math.cos(a.mid)} y={size / 2 + (r + 16) * Math.sin(a.mid) + 3.5} textAnchor="middle" fontSize={10.5} fill="currentColor" className="text-ink-3" pointerEvents="none">
              {Math.round(a.frac * 100)}%
            </text>
          ) : null,
        )}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-overlay/90 px-2 py-1 text-center text-[11.5px] text-white">
          {slices[hover].label}
          <br />
          <b>
            {formatNumber(slices[hover].value)} ({total ? Math.round((slices[hover].value / total) * 100) : 0}%)
          </b>
        </div>
      )}
      <Legend items={slices.map((s) => ({ label: s.label, color: s.color }))} />
    </div>
  )
}

/** Đường vùng nhỏ cho thẻ chỉ số (không trục) */
export function MiniArea({ values, color, height = 90, label }: { values: number[]; color: string; height?: number; label: string }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...values)
  const n = Math.max(values.length - 1, 1)
  const pts = values.map((v, i) => [(i / n) * width, height - 4 - (v / max) * (height - 12)] as const)
  const id = `g${useId().replace(/:/g, '')}`
  return (
    <div ref={ref} className="relative w-full min-w-0" style={{ height }} onMouseLeave={() => setHover(null)}>
      {width > 0 && values.length > 0 && (
        <svg
          width={width}
          height={height}
          className="absolute top-0 left-0"
          role="img"
          aria-label={label}
          onMouseMove={(e) => {
            const x = e.nativeEvent.offsetX
            setHover(Math.round((x / width) * n))
          }}
        >
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" style={{ stopColor: color, stopOpacity: 0.32 }} />
              <stop offset="1" style={{ stopColor: color, stopOpacity: 0.02 }} />
            </linearGradient>
          </defs>
          <path d={`M0,${height} ${pts.map(([x, yy]) => `L${x},${yy}`).join(' ')} L${width},${height} Z`} fill={`url(#${id})`} />
          <polyline points={pts.map(([x, yy]) => `${x},${yy}`).join(' ')} fill="none" style={{ stroke: color }} strokeWidth={2} strokeLinejoin="round" />
          {hover !== null && pts[hover] && <circle cx={pts[hover][0]} cy={pts[hover][1]} r={4} style={{ fill: color, stroke: 'var(--color-surface)' }} strokeWidth={2} />}
        </svg>
      )}
      {hover !== null && pts[hover] && (
        <div className="pointer-events-none absolute rounded bg-overlay/90 px-1.5 py-0.5 text-[11px] text-white" style={{ left: Math.min(pts[hover][0], width - 40), top: 0 }}>
          {formatNumber(values[hover])}
        </div>
      )}
    </div>
  )
}

/** Thanh ngang xếp hạng (CLS / thuốc phổ biến): nhãn chữ tối, giá trị ở cuối */
export function HBars({ items, color = 'var(--chart-new)', empty = 'Không có dữ liệu' }: { items: { label: string; value: number }[]; color?: string; empty?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  if (!items.length) return <p className="py-8 text-center text-[13px] text-ink-3">{empty}</p>
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.label} className="text-[12.5px]" title={`${i.label}: ${formatNumber(i.value)}`}>
          <span className="mb-0.5 flex justify-between gap-2 text-ink-2">
            <span className="truncate">{i.label}</span>
            <b className="tabular-nums text-ink">{formatNumber(i.value)}</b>
          </span>
          <span className="block h-2 overflow-hidden rounded-full bg-subtle">
            <span className="block h-full rounded-full" style={{ width: `${(i.value / max) * 100}%`, background: color }} />
          </span>
        </li>
      ))}
    </ul>
  )
}
