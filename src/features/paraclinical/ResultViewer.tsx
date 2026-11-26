import { useMemo, useState } from 'react'
import { ExternalLink, FileText, Image as ImageIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useOverlayBehavior } from '@/components/ui/Modal'
import { Portal } from '@/components/ui/Portal'
import { useClinicState } from '@/store/ClinicStore'
import { CLINIC, GENDER_LABEL } from '@/store/catalog'
import { ageLabel, formatDateTimeVN, formatDateVN } from '@/lib/date'
import { formatPhone } from '@/lib/format'
import { cn } from '@/lib/cn'
import { RichView } from '@/components/ui/RichText'
import type { ParaclinicalOrderItem, Patient, ResultFile, Visit } from '@/store/types'

type FileTab = 'all' | 'pdf' | 'image'

/** Xem kết quả cận lâm sàng (ảnh 066–067): khung xem bên trái, danh sách tệp bên phải */
export function ResultViewer({ visitId, orderId, onClose }: { visitId: string; orderId: string | null; onClose: () => void }) {
  if (!orderId) return null
  return <Viewer visitId={visitId} orderId={orderId} onClose={onClose} />
}

function Viewer({ visitId, orderId, onClose }: { visitId: string; orderId: string; onClose: () => void }) {
  useOverlayBehavior(true, onClose)
  const { visits, patients } = useClinicState()
  const visit = visits.find((v) => v.id === visitId)
  const order = visit?.paraclinicalOrders?.find((o) => o.id === orderId)
  const patient = visit ? patients.find((p) => p.id === visit.patientId) : undefined
  const [tab, setTab] = useState<FileTab>('all')

  /** Tệp hiển thị: phiếu kết quả soạn thảo (nếu có nội dung) + tệp tải lên */
  const entries = useMemo(() => {
    if (!order?.result) return []
    const r = order.result
    const list: { id: string; name: string; kind: 'report' | 'pdf' | 'image'; file?: ResultFile }[] = []
    if (r.description || r.conclusion || r.recommendation) list.push({ id: 'report', name: `phieu-ket-qua-${order.name}`, kind: 'report' })
    r.files.forEach((f) => list.push({ id: f.id, name: f.name, kind: f.type === 'application/pdf' ? 'pdf' : 'image', file: f }))
    if (!list.length) r.images.forEach((f) => list.push({ id: f.id, name: f.name, kind: 'image', file: f }))
    return list
  }, [order])
  const [activeId, setActiveId] = useState<string | null>(null)

  if (!visit || !order || !patient) return null
  const filtered = entries.filter((e) => tab === 'all' || (tab === 'pdf' ? e.kind === 'pdf' || e.kind === 'report' : e.kind === 'image'))
  const active = entries.find((e) => e.id === activeId) ?? entries[0]
  const count = (k: FileTab) => entries.filter((e) => k === 'all' || (k === 'pdf' ? e.kind !== 'image' : e.kind === 'image')).length

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex animate-fade-in items-center justify-center bg-overlay/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div role="dialog" aria-modal="true" aria-label={`Kết quả ${order.name}`} className="flex h-[88vh] w-full max-w-[1000px] animate-pop-in flex-col rounded-[18px] border border-line bg-surface shadow-pop">
          <div className="flex items-center gap-3 border-b border-line px-5 py-3">
            <h2 className="flex-1 text-[15.5px] font-bold text-ink">{order.name}</h2>
            <span className="text-[12.5px] text-ink-3">
              <b className="text-ink uppercase">{patient.fullName}</b> · Tuổi: {ageLabel(patient.dob, visit.date)} · Giới tính: {GENDER_LABEL[patient.gender]} · Ngày chỉ định: {formatDateVN(visit.date)}
            </span>
            <button type="button" onClick={onClose} className="rounded-[8px] p-1 text-ink-3 hover:bg-subtle hover:text-ink" aria-label="Đóng">
              <X className="h-4 w-4" />
            </button>
          </div>

          {entries.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-[13px] text-ink-3">Chưa có kết quả cho chỉ định này.</div>
          ) : (
            <div className="flex min-h-0 flex-1">
              <div className="flex min-w-0 flex-1 flex-col border-r border-line p-4">
                <div className="mb-2 flex items-center gap-2">
                  {active.kind === 'image' ? <ImageIcon className="h-5 w-5 text-info-ink" /> : <FileText className="h-5 w-5 text-accent-ink" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink">{active.name}</p>
                    <p className="text-xs text-ink-3 tabular-nums">
                      Loại file: {active.kind === 'image' ? 'Hình ảnh' : 'PDF'} · Ngày chỉnh sửa: {formatDateTimeVN(active.file?.at ?? order.result!.updatedAt)}
                    </p>
                  </div>
                  {active.file && (
                    <a href={active.file.dataUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-[10px] border border-line-strong px-2.5 py-1 text-[12px] font-medium text-ink-2 hover:bg-subtle">
                      <ExternalLink className="h-3.5 w-3.5" /> Mở trong thẻ mới
                    </a>
                  )}
                </div>
                <div className="thin-scroll min-h-0 flex-1 overflow-auto rounded-[12px] bg-viewer p-4">
                  {active.kind === 'report' ? (
                    <div className="paper mx-auto max-w-[620px] rounded-[6px] bg-surface px-8 py-6 font-doc text-[13px] leading-6 text-black">
                      <ResultReportDoc visit={visit} patient={patient} order={order} />
                    </div>
                  ) : active.kind === 'pdf' ? (
                    <iframe src={active.file!.dataUrl} title={active.name} className="h-full min-h-[60vh] w-full rounded bg-surface" />
                  ) : (
                    <img src={active.file!.dataUrl} alt={active.name} className="mx-auto max-h-full rounded" />
                  )}
                </div>
              </div>
              <div className="flex w-[260px] shrink-0 flex-col bg-canvas/50 p-3">
                <div className="mb-2 inline-flex rounded-[10px] bg-subtle p-0.5 text-[12px] font-semibold">
                  {(['all', 'pdf', 'image'] as FileTab[]).map((k) => (
                    <button key={k} type="button" onClick={() => setTab(k)} className={cn('flex-1 rounded-[8px] px-2 py-1 transition', tab === k ? 'bg-surface text-ink shadow-xs' : 'text-ink-3 hover:text-ink')}>
                      {k === 'all' ? 'Tất cả' : k === 'pdf' ? 'PDF' : 'Hình ảnh'} {count(k)}
                    </button>
                  ))}
                </div>
                <ul className="thin-scroll flex-1 space-y-1.5 overflow-y-auto">
                  {filtered.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(e.id)}
                        className={cn('w-full rounded-[10px] border px-2.5 py-2 text-left text-[12.5px] transition-colors', e.id === active.id ? 'border-brand bg-brand-tint' : 'border-line bg-surface hover:bg-canvas')}
                      >
                        <span className="block truncate font-semibold text-ink">{e.name}</span>
                        {e.id === active.id && <span className="mt-1 inline-block rounded-full bg-brand px-2 py-0.5 text-[10.5px] font-semibold text-white">Đang xem</span>}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="pt-2 text-center text-xs text-ink-3 tabular-nums">{entries.length} file</p>
              </div>
            </div>
          )}

          <div className="flex justify-end border-t border-line px-5 py-2.5">
            <Button variant="outline" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  )
}

/** Phiếu kết quả soạn thảo ("PHIẾU KHÁC" – ảnh 054) */
export function ResultReportDoc({ visit, patient, order }: { visit: Visit; patient: Patient; order: ParaclinicalOrderItem }) {
  const r = order.result
  return (
    <>
      <p className="font-bold uppercase">{CLINIC.name}</p>
      <p className="text-[12.5px]">{CLINIC.address}</p>
      <p className="text-[12.5px]">Điện thoại: {CLINIC.hotline}</p>
      <h1 className="my-4 text-center text-xl font-bold text-danger-ink uppercase">Phiếu kết quả</h1>
      <p>
        <b>Họ và tên:</b> <span className="uppercase">{patient.fullName}</span> &nbsp; <b>Ngày sinh:</b> {formatDateVN(patient.dob)} ({ageLabel(patient.dob, visit.date)}) &nbsp;
        <b>Giới tính:</b> {GENDER_LABEL[patient.gender]}
      </p>
      <p>
        <b>Điện thoại:</b> {formatPhone(patient.phone)}
      </p>
      <p>
        <b>Địa chỉ:</b> {patient.address}
      </p>
      <p>
        <b>Tên chỉ định:</b> {order.name}
      </p>
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-4">
        <div className="space-y-2">
          <Part title="Mô tả" text={r?.description} />
          <Part title="Kết luận" text={r?.conclusion} />
          <Part title="Đề nghị" text={r?.recommendation} />
        </div>
        {!!r?.images.length && (
          <div className="flex w-40 flex-col gap-2">
            {r.images.map((img) => (
              <img key={img.id} src={img.dataUrl} alt={img.name} className="w-full rounded-sm border border-line-strong" />
            ))}
          </div>
        )}
      </div>
      <div className="mt-6 flex justify-end">
        <div className="w-60 text-center">
          <p className="italic">{r ? formatDateTimeVN(r.updatedAt) : ''}</p>
          <p className="font-bold uppercase">Bác sĩ chuyên khoa</p>
          <p className="mt-12 font-bold">{r?.by}</p>
        </div>
      </div>
    </>
  )
}

function Part({ title, text }: { title: string; text?: string }) {
  return (
    <div>
      <p className="font-bold">• {title}</p>
      {text ? <RichView html={text} /> : <p>—</p>}
    </div>
  )
}
