import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'

/**
 * Dòng tổng chi phí ở chân màn Tiếp nhận / Khám bệnh: Thuốc · CLS · Công khám · Tổng.
 * (Hệ thống gốc viết tắt Th / CLS / CK / TT; ở đây ghi đủ chữ cho dễ đọc, giữ tooltip tên viết tắt.)
 */
export function CostSummary({ medication, cls, consultation, total, className }: { medication: number; cls: number; consultation: number; total: number; className?: string }) {
  const items: [string, string, number][] = [
    ['Thuốc', 'Th – tiền thuốc', medication],
    ['CLS', 'CLS – cận lâm sàng', cls],
    ['Công khám', 'CK – công khám', consultation],
  ]
  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-4 gap-y-1 tabular-nums', className)}>
      {items.map(([label, title, value]) => (
        <span key={label} title={title} className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-[12.5px] text-ink-3">{label}</span>
          <b className="text-[13.5px] font-semibold text-ink">{formatNumber(Math.round(value))}</b>
        </span>
      ))}
      <span title="TT – tổng tiền" className="inline-flex items-baseline gap-1.5 border-l border-line pl-4 whitespace-nowrap">
        <span className="text-[12.5px] font-medium text-ink-2">Tổng</span>
        <b className="text-[15px] font-bold text-brand-ink">{formatNumber(Math.round(total))}</b>
      </span>
    </div>
  )
}
