import { useCallback } from 'react'
import { useToast } from '@/components/ui/Toast'
import { useClinicActions } from '@/store/ClinicStore'
import { downloadText, toCsv } from '@/lib/csv'

/** Xuất báo cáo ra CSV (mở bằng Excel) và ghi vào Lịch sử tải về */
export function useExport() {
  const { recordDownload } = useClinicActions()
  const toast = useToast()
  return useCallback(
    (opts: { report: string; rangeLabel: string; header: string[]; rows: (string | number)[][]; filename: string }) => {
      const csv = toCsv(opts.header, opts.rows)
      const name = `${opts.filename}.csv`
      downloadText(csv, name)
      recordDownload({ name: `(${opts.rangeLabel}) ${opts.report}`, report: opts.report, rangeLabel: opts.rangeLabel, fileType: 'CSV', content: csv })
      toast({ title: `Đã xuất ${name}`, description: `${opts.rows.length} dòng · lưu trong Lịch sử tải về`, tone: 'success' })
    },
    [recordDownload, toast],
  )
}
