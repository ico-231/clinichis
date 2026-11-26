import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Download, FileText, FlaskConical, Printer, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DocumentsEmptyIllustration } from '@/components/ui/EmptyState'
import { Tabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import { GENDER_LABEL } from '@/store/catalog'
import { formatDateTimeVN, formatDateVN } from '@/lib/date'
import { cn } from '@/lib/cn'
import { DiagnosisInput } from '../examination/DiagnosisSection'
import { PrescriptionDoc, PrintPreviewModal } from '../examination/PrintDocs'
import { draftFromVisit } from '../examination/examDraft'
import { ResultReportDoc } from '../paraclinical/ResultViewer'
import { EmrPrintDoc } from './EmrPrintDoc'
import { emrCodeOf, emrOf, SIGN_LABEL, SUBJECT_LABEL } from './emrData'
import type { EmrRecord, Patient, Visit } from '@/store/types'

type Tab = 'record' | 'treatment' | 'summary'
type Preview = { kind: 'emr' } | { kind: 'rx' } | { kind: 'cls'; orderId: string }

const box = 'w-full rounded-[10px] border border-line-strong bg-surface px-2.5 text-[13px] text-ink placeholder:text-ink-4 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15'

/** Chi tiết bệnh án điện tử (ảnh 091–097) */
export function EmrDetail({ visit, patient, onBack }: { visit: Visit; patient: Patient; onBack: () => void }) {
  const { saveExam, logEmrAccess } = useClinicActions()
  const toast = useToast()
  const [emr, setEmr] = useState<EmrRecord>(() => emrOf(visit, patient))
  const [saved, setSaved] = useState(() => JSON.stringify(emrOf(visit, patient)))
  const [tab, setTab] = useState<Tab>('record')
  const [preview, setPreview] = useState<Preview | null>(visit.emr?.savedAt ? { kind: 'emr' } : null)
  const [printOpen, setPrintOpen] = useState(false)
  const dirty = JSON.stringify(emr) !== saved
  const code = emrCodeOf(visit)
  const state = emr.closed ? 'closed' : visit.emr ? 'created' : 'draft'
  // Bản đã lưu: ký số => khoá vĩnh viễn; đã đóng (chưa ký) => chỉ xem, có thể mở lại (ghi nhật ký)
  const lockedSigned = visit.emr?.signStatus === 'signed'
  const lockedClosed = !!visit.emr?.closed
  const readOnly = lockedSigned || lockedClosed

  const logged = useRef(false)
  useEffect(() => {
    // Ghi một lần khi mở (ref giữ nguyên qua lần chạy lặp của StrictMode)
    if (logged.current) return
    logged.current = true
    logEmrAccess({ action: 'view', visitId: visit.id, emrCode: code, signStatus: emr.signStatus, state })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (p: Partial<EmrRecord>) => setEmr((e) => ({ ...e, ...p }))
  const setSum = (p: Partial<EmrRecord['summary']>) => setEmr((e) => ({ ...e, summary: { ...e.summary, ...p } }))

  const reopen = () => {
    const next: EmrRecord = { ...emr, closed: false, savedAt: new Date().toISOString() }
    saveExam(visit.id, { emr: next })
    setEmr(next)
    setSaved(JSON.stringify(next))
    logEmrAccess({ action: 'edit', visitId: visit.id, emrCode: code, signStatus: next.signStatus, state: 'created' })
    toast({ title: 'Đã mở lại bệnh án', description: `${code} · có thể chỉnh sửa`, tone: 'info' })
  }

  const save = () => {
    if (readOnly) return
    const next: EmrRecord = { ...emr, savedAt: new Date().toISOString(), signStatus: emr.signStatus === 'pending' ? 'signed' : emr.signStatus, signedAt: emr.signStatus === 'pending' ? new Date().toISOString() : emr.signedAt }
    saveExam(visit.id, { emr: next })
    setEmr(next)
    setSaved(JSON.stringify(next))
    setPreview({ kind: 'emr' })
    logEmrAccess({ action: 'edit', visitId: visit.id, emrCode: code, signStatus: next.signStatus, state: next.closed ? 'closed' : 'created' })
    toast({ title: 'Đã lưu bệnh án', description: `${code}${next.signStatus === 'signed' ? ' · đã ký số (mô phỏng)' : ''}`, tone: 'success' })
  }

  const download = () => {
    const el = document.getElementById('emr-preview')
    if (!el) return
    const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Bệnh án ${code}</title><style>body{font-family:'Times New Roman',serif;max-width:760px;margin:24px auto;font-size:13px;line-height:1.6}table{border-collapse:collapse;width:100%}td,th{border:1px solid #000;padding:2px 6px}</style></head><body>${el.innerHTML}</body></html>`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    a.download = `benh-an-${code}.html`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const rx = draftFromVisit(visit)
  const results = (visit.paraclinicalOrders ?? []).filter((o) => o.resultStatus === 'has_result')

  return (
    <div className="flex h-full flex-col bg-canvas">
      <header className="shrink-0 border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-3 px-4 sm:px-6 py-2.5">
          <button
            type="button"
            onClick={onBack}
            className="rounded-[10px] p-1.5 text-ink-2 transition-colors hover:bg-subtle hover:text-ink"
            aria-label="Quay lại danh sách bệnh án"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="h-5 w-px bg-line" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[16px] font-bold tracking-[-0.01em] text-ink">Chi tiết bệnh án điện tử</h1>
              <span className="rounded-full border border-brand-line bg-brand-tint px-2.5 py-0.5 text-[12px] font-semibold text-brand-ink tabular-nums">{code}</span>
              <span className="text-[13px] font-semibold text-ink-2 uppercase">{patient.fullName}</span>
            </div>
            <nav className="mt-0.5 flex items-center gap-1 text-[12px] text-ink-3" aria-label="Breadcrumb">
              <button type="button" onClick={onBack} className="hover:text-brand-ink">
                Danh sách bệnh án
              </button>
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium text-ink">Chi tiết bệnh án</span>
            </nav>
          </div>
          {dirty && <span className="rounded-full border border-accent-line bg-accent-tint px-2.5 py-0.5 text-[12px] font-semibold text-accent-ink">● Chưa lưu</span>}
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 gap-4 overflow-hidden px-4 sm:px-6 py-3">
        <div className="flex w-[min(540px,48%)] shrink-0 flex-col overflow-hidden rounded-[16px] border border-line bg-surface">
          <dl className="grid grid-cols-3 gap-x-3 gap-y-2 border-b border-line bg-canvas/60 px-4 py-3 text-[12.5px]">
            <Info label="Họ và tên" value={<b className="uppercase">{patient.fullName}</b>} />
            <Info label="Giới tính" value={GENDER_LABEL[patient.gender]} />
            <Info label="Ngày sinh" value={<span className="tabular-nums">{formatDateVN(patient.dob)}</span>} />
            <Info label="Mã bệnh án" value={<span className="font-semibold text-info-ink tabular-nums">{code}</span>} />
            <Info label="Mã phiếu khám" value={<span className="font-semibold text-info-ink tabular-nums">{visit.code}</span>} />
            <Info
              label="Trạng thái ký số"
              value={
                <span
                  className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-[11.5px] font-semibold',
                    emr.signStatus === 'signed' ? 'bg-brand-soft text-brand-ink' : emr.signStatus === 'pending' ? 'bg-accent-soft text-accent-strong' : 'bg-subtle text-ink-3',
                  )}
                >
                  {SIGN_LABEL[emr.signStatus]}
                </span>
              }
            />
          </dl>
          <div className="px-4 pt-3">
            <Tabs
              variant="pill"
              className="flex w-full [&>button]:flex-1"
              value={tab}
              onChange={setTab}
              items={[
                { value: 'record', label: 'Bệnh án' },
                { value: 'treatment', label: 'Phiếu điều trị' },
                { value: 'summary', label: 'Tổng kết bệnh án' },
              ]}
            />
          </div>

          {readOnly && (
            <div className="mx-4 mt-2.5 flex items-center gap-2 rounded-[12px] border border-accent-line bg-accent-tint px-3 py-2 text-[12.5px] text-accent-strong" role="status">
              <span className="flex-1">
                {lockedSigned ? 'Bệnh án đã ký số – không thể chỉnh sửa.' : 'Bệnh án đã đóng – chỉ xem.'}
              </span>
              {!lockedSigned && (
                <Button size="sm" variant="outline" onClick={reopen}>
                  Mở lại bệnh án
                </Button>
              )}
            </div>
          )}
          <fieldset disabled={readOnly} className="thin-scroll min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 text-[13px]">
            {tab === 'record' && (
              <>
                <Row label="Loại bệnh án">
                  <select value={emr.type} disabled className={cn(box, 'h-9 bg-canvas text-ink-3')}>
                    <option value="outpatient_general">Bệnh án Ngoại trú chung</option>
                  </select>
                </Row>
                <Row label="Chuyên khoa">
                  <input value={emr.specialty} onChange={(e) => set({ specialty: e.target.value })} placeholder="Nhập thông tin..." className={cn(box, 'h-9')} />
                </Row>
                <div className="grid grid-cols-3 gap-2">
                  <Row label="Ngày tạo">
                    <input type="date" value={emr.createdAt.slice(0, 10)} onChange={(e) => set({ createdAt: `${e.target.value}${emr.createdAt.slice(10)}` })} className={cn(box, 'h-9 tabular-nums')} />
                  </Row>
                  <Row label="Giờ tạo">
                    <input type="time" value={emr.createdAt.slice(11, 16)} onChange={(e) => set({ createdAt: `${emr.createdAt.slice(0, 11)}${e.target.value}` })} className={cn(box, 'h-9 tabular-nums')} />
                  </Row>
                  <Row label="Đối tượng">
                    <select value={emr.subject} onChange={(e) => set({ subject: e.target.value as EmrRecord['subject'] })} className={cn(box, 'h-9')}>
                      {(Object.keys(SUBJECT_LABEL) as EmrRecord['subject'][]).map((k) => (
                        <option key={k} value={k}>
                          {SUBJECT_LABEL[k]}
                        </option>
                      ))}
                    </select>
                  </Row>
                </div>
                <Heading>Hành chính</Heading>
                <div className="grid grid-cols-2 gap-2">
                  <Row label="Số thẻ BHYT">
                    <input value={patient.insuranceNumber ?? ''} readOnly placeholder="Chưa cập nhật (sửa ở hồ sơ người bệnh)" className={cn(box, 'h-9 bg-canvas text-ink-3')} />
                  </Row>
                  <Row label="Thời hạn BHYT">
                    <input type="date" value={emr.insuranceExpiry} onChange={(e) => set({ insuranceExpiry: e.target.value })} className={cn(box, 'h-9 tabular-nums')} />
                  </Row>
                  <Row label="Họ tên người nhà">
                    <input value={patient.relative?.fullName || patient.guardianName || ''} readOnly className={cn(box, 'h-9 bg-canvas text-ink-3')} />
                  </Row>
                  <Row label="Số điện thoại người nhà">
                    <input value={patient.relative?.phone ?? ''} readOnly className={cn(box, 'h-9 bg-canvas text-ink-3 tabular-nums')} />
                  </Row>
                </div>
                <Heading>Đến khám bệnh lúc</Heading>
                <p className="text-ink-2 tabular-nums">{formatDateTimeVN(emr.createdAt)}</p>
                <Row label="Chẩn đoán của nơi giới thiệu">
                  <DiagnosisInput compact value={emr.referralDiagnosis} onChange={(referralDiagnosis) => set({ referralDiagnosis })} placeholder="Tìm kiếm..." />
                </Row>
                <Area label="Lý do vào viện" value={emr.admissionReason} onChange={(admissionReason) => set({ admissionReason })} />
                <Heading>Chỉ số sinh hiệu</Heading>
                <VitalsLine visit={visit} />
                <Heading>Hỏi bệnh</Heading>
                <Area label="Quá trình bệnh lý" value={emr.summary.course} onChange={(course) => setSum({ course })} />
                <div className="grid grid-cols-2 gap-2">
                  <Area label="Tiền sử bản thân" value={emr.personalHistory} onChange={(personalHistory) => set({ personalHistory })} />
                  <Area label="Tiền sử gia đình" value={emr.familyHistory} onChange={(familyHistory) => set({ familyHistory })} />
                </div>
                <Heading>Khám bệnh</Heading>
                <Area label="Khám toàn thân" value={emr.generalExam} onChange={(generalExam) => set({ generalExam })} />
                <Area label="Các bộ phận" value={emr.organExam} onChange={(organExam) => set({ organExam })} />
                <Area label="Tóm tắt kết quả cận lâm sàng" value={emr.clsSummary} onChange={(clsSummary) => set({ clsSummary })} />
                <Row label="Chẩn đoán ban đầu">
                  <DiagnosisInput compact value={emr.initialDiagnosis} onChange={(initialDiagnosis) => set({ initialDiagnosis })} placeholder="Tìm kiếm..." />
                </Row>
                <Area label="Đã xử lý (thuốc, chăm sóc)" value={emr.treatmentGiven} onChange={(treatmentGiven) => set({ treatmentGiven })} />
                <Row label="Chẩn đoán khi ra viện">
                  <DiagnosisInput compact value={emr.dischargeDiagnosis} onChange={(dischargeDiagnosis) => set({ dischargeDiagnosis })} placeholder="Tìm kiếm..." />
                </Row>
                <Heading>Điều trị ngoại trú</Heading>
                <div className="grid grid-cols-2 gap-2">
                  <Row label="Từ ngày">
                    <input type="datetime-local" value={emr.treatFrom} onChange={(e) => set({ treatFrom: e.target.value })} className={cn(box, 'h-9 tabular-nums')} />
                  </Row>
                  <Row label="Đến ngày">
                    <input type="datetime-local" value={emr.treatTo} min={emr.treatFrom} onChange={(e) => set({ treatTo: e.target.value })} className={cn(box, 'h-9 tabular-nums')} />
                  </Row>
                </div>
              </>
            )}

            {tab === 'treatment' && (
              <>
                <Collapsible title="Toa thuốc">
                  {rx.prescription.length ? (
                    <button
                      type="button"
                      onClick={() => setPreview({ kind: 'rx' })}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-[10px] border px-3 py-2 text-left transition-colors',
                        preview?.kind === 'rx' ? 'border-brand bg-brand-tint text-brand-ink' : 'border-line hover:bg-canvas',
                      )}
                    >
                      <FileText className="h-4 w-4 text-brand-ink" />
                      <span className="flex-1">
                        <span className="block font-medium text-ink">Toa thuốc</span>
                        <span className="text-xs text-ink-3 tabular-nums">{formatDateTimeVN(visit.finishedAt ?? visit.createdAt)}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 text-ink-4" />
                    </button>
                  ) : (
                    <Empty text="Lượt khám không có toa thuốc." />
                  )}
                </Collapsible>
                <Collapsible title="Kết quả cận lâm sàng">
                  {results.length ? (
                    results.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setPreview({ kind: 'cls', orderId: o.id })}
                        className={cn(
                          'mb-1.5 flex w-full items-center gap-2 rounded-[10px] border px-3 py-2 text-left transition-colors last:mb-0',
                          preview?.kind === 'cls' && preview.orderId === o.id ? 'border-brand bg-brand-tint text-brand-ink' : 'border-line hover:bg-canvas',
                        )}
                      >
                        <FlaskConical className="h-4 w-4 text-accent-ink" />
                        <span className="flex-1 font-medium text-ink">{o.name}</span>
                        <ChevronRight className="h-4 w-4 text-ink-4" />
                      </button>
                    ))
                  ) : (
                    <Empty text="Chưa có file kết quả cận lâm sàng, vui lòng cập nhật dữ liệu hoặc chọn bệnh án khác." />
                  )}
                </Collapsible>
              </>
            )}

            {tab === 'summary' && (
              <>
                <Heading>Tóm tắt điều trị</Heading>
                <Area label="Quá trình bệnh lý và diễn biến lâm sàng" value={emr.summary.course} onChange={(course) => setSum({ course })} />
                <Area label="Tóm tắt kết quả xét nghiệm cận lâm sàng có giá trị chẩn đoán" value={emr.summary.clsValue} onChange={(clsValue) => setSum({ clsValue })} />
                <Heading>Chẩn đoán ra viện</Heading>
                <div className="grid grid-cols-2 gap-2">
                  <Row label="Bệnh chính">
                    <DiagnosisInput compact value={emr.summary.mainDisease} onChange={(mainDisease) => setSum({ mainDisease })} placeholder="Tìm kiếm..." />
                  </Row>
                  <Row label="Bệnh kèm theo">
                    <DiagnosisInput compact value={emr.summary.comorbid} onChange={(comorbid) => setSum({ comorbid })} placeholder="Tìm kiếm..." />
                  </Row>
                </div>
                <Area label="Phương pháp điều trị" value={emr.summary.method} onChange={(method) => setSum({ method })} />
                <Area label="Tình trạng người ra viện" value={emr.summary.dischargeState} onChange={(dischargeState) => setSum({ dischargeState })} />
                <Area label="Hướng điều trị và các chế độ tiếp theo" value={emr.summary.plan} onChange={(plan) => setSum({ plan })} />
                <Heading>Hồ sơ phim ảnh</Heading>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      ['xray', 'X-Quang'],
                      ['ct', 'CT Scanner'],
                      ['ultrasound', 'Siêu âm'],
                      ['lab', 'Xét nghiệm'],
                    ] as const
                  ).map(([k, l]) => (
                    <Row key={k} label={l}>
                      <input value={emr.summary.films[k]} onChange={(e) => setSum({ films: { ...emr.summary.films, [k]: e.target.value } })} placeholder="Nhập thông tin..." className={cn(box, 'h-9')} />
                    </Row>
                  ))}
                </div>
                <Row label="Toàn bộ hồ sơ">
                  <input value={emr.summary.films.total} onChange={(e) => setSum({ films: { ...emr.summary.films, total: e.target.value } })} placeholder="Nhập thông tin..." className={cn(box, 'h-9 w-1/2')} />
                </Row>
                <div className="flex gap-8 pt-1">
                  <Switch label="Đóng bệnh án" checked={emr.closed} onChange={(closed) => set({ closed })} />
                  <Switch
                    label="Ký số"
                    checked={emr.signStatus !== 'unsigned'}
                    onChange={(on) => set({ signStatus: on ? (emr.signStatus === 'signed' ? 'signed' : 'pending') : 'unsigned', signedAt: on ? emr.signedAt : undefined })}
                  />
                </div>
                {emr.signStatus === 'pending' && <p className="rounded-[10px] border border-accent-line bg-accent-tint px-3 py-1.5 text-xs text-accent-strong">Bệnh án sẽ được ký số (mô phỏng) khi bấm “Lưu bệnh án”.</p>}
              </>
            )}
          </fieldset>

          <div className="flex justify-end gap-2 border-t border-line bg-canvas/70 px-4 py-2.5">
            <Button size="sm" variant="outline" leftIcon={<Download className="h-3.5 w-3.5" />} disabled={!visit.emr?.savedAt} onClick={download} title="Tải bản bệnh án đã lưu (HTML)">
              Tải bệnh án
            </Button>
            <Button size="sm" variant="soft" leftIcon={<Printer className="h-3.5 w-3.5" />} onClick={() => setPrintOpen(true)}>
              In bệnh án
            </Button>
            <Button size="sm" leftIcon={<Save className="h-3.5 w-3.5" />} onClick={save} disabled={readOnly}>
              Lưu bệnh án
            </Button>
          </div>
        </div>

        <div className="thin-scroll min-w-0 flex-1 overflow-y-auto rounded-[16px] border border-line bg-subtle p-5">
          {!preview ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <DocumentsEmptyIllustration />
              <p className="text-[14px] font-semibold text-ink">Chưa có bản xem trước</p>
              <p className="text-xs text-ink-3">Bản xem trước sẽ xuất hiện ngay sau khi lưu bệnh án.</p>
            </div>
          ) : (
            <div id="emr-preview" className="paper mx-auto max-w-[720px] rounded-[8px] bg-surface px-10 py-8 font-doc text-black shadow-sm">
              {preview.kind === 'emr' && <EmrPrintDoc visit={visit} patient={patient} emr={emr} />}
              {preview.kind === 'rx' && <PrescriptionDoc visit={visit} patient={patient} draft={rx} />}
              {preview.kind === 'cls' && <ResultReportDoc visit={visit} patient={patient} order={results.find((o) => o.id === preview.orderId)!} />}
            </div>
          )}
        </div>
      </div>

      <PrintPreviewModal open={printOpen} title="Bệnh án ngoại trú" onClose={() => setPrintOpen(false)}>
        <EmrPrintDoc visit={visit} patient={patient} emr={emr} />
      </PrintPreviewModal>
    </div>
  )
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-ink-3">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="mb-1 block text-[12.5px] font-medium text-ink-2">{label}</span>
      {children}
    </div>
  )
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Row label={label}>
      <textarea value={value} rows={2} onChange={(e) => onChange(e.target.value)} placeholder="Nhập thông tin..." className={cn(box, 'resize-y py-1.5')} />
    </Row>
  )
}

function Heading({ children }: { children: ReactNode }) {
  return <p className="pt-1 text-[12px] font-bold tracking-[0.04em] text-brand-ink uppercase">{children}</p>
}

function VitalsLine({ visit }: { visit: Visit }) {
  const v = visit.vitals ?? {}
  const items: [string, string | undefined, string][] = [
    ['Mạch', v.pulse, 'lần/phút'],
    ['Nhiệt độ', v.temperatureC, '°C'],
    ['Huyết áp', v.bpSystolic ? `${v.bpSystolic}/${v.bpDiastolic ?? ''}` : '', 'mmHg'],
    ['Nhịp thở', v.respiratoryRate, 'lần/phút'],
    ['Cân nặng', v.weightKg, 'kg'],
  ]
  return (
    <div className="grid grid-cols-5 gap-2">
      {items.map(([k, val, unit]) => (
        <div key={k}>
          <span className="block text-[12px] text-ink-3">{k}</span>
          <span className="block rounded-[10px] border border-line bg-canvas px-2 py-1.5 text-[12.5px] font-medium text-ink tabular-nums">{val || <span className="font-normal text-ink-4">{unit}</span>}</span>
        </div>
      ))}
    </div>
  )
}

function Collapsible({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-[12px] border border-line bg-surface">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-3 py-2.5 text-[13px] font-semibold text-ink">
        {title}
        <ChevronDown className={cn('h-4 w-4 text-ink-3 transition-transform', !open && '-rotate-90')} />
      </button>
      {open && <div className="border-t border-line-soft p-2.5">{children}</div>}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-4 text-center text-xs text-ink-3">
      <DocumentsEmptyIllustration className="h-[48px] w-[60px]" />
      {text}
    </div>
  )
}

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-ink-2">
      {label}
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={cn('relative h-5 w-9 rounded-full transition', checked ? 'bg-brand' : 'bg-line-strong')}>
        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
      </button>
    </label>
  )
}

export function useEmrRows() {
  const { visits, patients } = useClinicState()
  return useMemo(() => {
    const byId = new Map(patients.map((p) => [p.id, p]))
    return visits
      .filter((v) => v.status === 'in_progress' || v.status === 'done')
      .flatMap((v) => {
        const p = byId.get(v.patientId)
        return p ? [{ visit: v, patient: p, emr: emrOf(v, p) }] : []
      })
  }, [visits, patients])
}
