import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, FolderOpen, Plus, Trash2, Upload, X } from 'lucide-react'
import { Button, Kbd } from '@/components/ui/Button'
import { Modal, useOverlayBehavior } from '@/components/ui/Modal'
import { Portal } from '@/components/ui/Portal'
import { RichTextArea, htmlToText } from '@/components/ui/RichText'
import { useToast } from '@/components/ui/Toast'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import { currentUser } from '@/store/runtime'
import { GENDER_LABEL } from '@/store/catalog'
import { ageLabel, formatDateTimeVN } from '@/lib/date'
import { compressImage, formatBytes, imageResult, toResultFile } from '@/lib/files'
import { cn } from '@/lib/cn'
import { PrintPreviewModal } from '../examination/PrintDocs'
import { ResultReportDoc } from './ResultViewer'
import { RESULT_TEMPLATES } from './resultTemplates'
import type { ParaclinicalResult, ResultFile } from '@/store/types'

const MAX_IMAGES = 6

/** Trả kết quả chẩn đoán hình ảnh (ảnh 052–055) */
export function ImagingResultEditor({ visitId, orderId, onClose }: { visitId: string; orderId: string; onClose: () => void }) {
  const { visits, patients, resultTemplates } = useClinicState()
  const { updateOrder } = useClinicActions()
  const toast = useToast()
  const visit = visits.find((v) => v.id === visitId)
  const order = visit?.paraclinicalOrders?.find((o) => o.id === orderId)
  const patient = visit ? patients.find((p) => p.id === visit.patientId) : undefined

  const [description, setDescription] = useState(order?.result?.description ?? '')
  const [conclusion, setConclusion] = useState(order?.result?.conclusion ?? '')
  const [recommendation, setRecommendation] = useState(order?.result?.recommendation ?? '')
  const [images, setImages] = useState<ResultFile[]>(order?.result?.images ?? [])
  const [files, setFiles] = useState<ResultFile[]>(order?.result?.files ?? [])
  const [templateId, setTemplateId] = useState('')
  const [folderOpen, setFolderOpen] = useState(false)
  const [printOpen, setPrintOpen] = useState(false)
  const [overlay, setOverlay] = useState(false)
  useOverlayBehavior(!overlay, onClose)

  const templates = [...(resultTemplates ?? []), ...RESULT_TEMPLATES].filter((t) => !t.serviceId || t.serviceId === order?.serviceId)

  const addImage = useCallback(
    (dataUrl: string) => {
      setImages((list) => {
        if (list.length >= MAX_IMAGES) {
          toast({ title: `Tối đa ${MAX_IMAGES} ảnh cho một phiếu kết quả`, tone: 'warning' })
          return list
        }
        return [...list, imageResult(dataUrl, `anh-${list.length + 1}.jpg`)]
      })
    },
    [toast],
  )

  const save = useCallback(
    (print: boolean) => {
      if (!visit || !order) return
      if (!htmlToText(description) && !htmlToText(conclusion) && !images.length) {
        toast({ title: 'Nhập mô tả, kết luận hoặc thêm ảnh trước khi lưu', tone: 'warning' })
        return
      }
      const result: ParaclinicalResult = { description, conclusion, recommendation, images, files, updatedAt: new Date().toISOString(), by: currentUser() }
      updateOrder(visit.id, order.id, { result, resultStatus: 'has_result', performStatus: 'done' })
      toast({ title: `Đã lưu kết quả: ${order.name}`, description: patient?.fullName, tone: 'success' })
      if (print) setPrintOpen(true)
      else onClose()
    },
    [visit, order, description, conclusion, recommendation, images, files, updateOrder, toast, patient, onClose],
  )

  useEffect(() => {
    if (overlay || printOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault()
        save(e.ctrlKey)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [save, overlay, printOpen])

  useEffect(() => setOverlay(folderOpen || printOpen), [folderOpen, printOpen])

  if (!visit || !order || !patient) return null

  const applyTemplate = (id: string) => {
    setTemplateId(id)
    const t = templates.find((x) => x.id === id)
    if (!t) return
    setDescription(t.description)
    setConclusion(t.conclusion)
    setRecommendation(t.recommendation ?? '')
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex animate-fade-in bg-slate-900/45 p-2">
        <div role="dialog" aria-modal="true" aria-label={`Trả kết quả ${order.name}`} className="flex w-full animate-pop-in flex-col rounded-xl bg-white shadow-2xl">
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-2.5">
            <h2 className="flex-1 text-[15px] font-semibold text-slate-900">{order.result ? 'Cập nhật kết quả' : 'Trả kết quả'}: {order.name}</h2>
            <span className="text-[12.5px] text-slate-600">
              Người bệnh: <b className="uppercase">{patient.fullName}</b> · Tuổi: <b>{ageLabel(patient.dob, visit.date)}</b> · Giới tính: <b>{GENDER_LABEL[patient.gender]}</b>
            </span>
            <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Đóng">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 gap-3 p-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-[13px] font-medium text-slate-800">Mẫu cận lâm sàng</span>
                <select
                  value={templateId}
                  onChange={(e) => applyTemplate(e.target.value)}
                  className="h-9 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-[13px] outline-none focus:border-blue-500"
                  aria-label="Chọn mẫu kết quả"
                >
                  <option value="">Vui lòng chọn mẫu hoặc thêm mới</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <RichTextArea label="Mô tả" value={description} onChange={setDescription} placeholder="Nhập mô tả..." className="flex-[1.3]" />
              <RichTextArea label="Kết luận" value={conclusion} onChange={setConclusion} placeholder="Nhập kết luận..." className="flex-1" />
              <RichTextArea label="Đề nghị" value={recommendation} onChange={setRecommendation} placeholder="Nhập đề nghị..." className="flex-1" />
            </div>

            <div className="flex w-[300px] shrink-0 flex-col gap-2 rounded-lg border border-slate-200 p-2">
              <CameraPanel onCapture={addImage} disabled={images.length >= MAX_IMAGES} />
              <div className="grid grid-cols-2 gap-1.5">
                <UploadImagesButton
                  onFiles={async (list) => {
                    for (const f of list) {
                      try {
                        addImage(await compressImage(f))
                      } catch (err) {
                        toast({ title: (err as Error).message, tone: 'warning' })
                      }
                    }
                  }}
                />
                <Button size="sm" variant="outline" leftIcon={<FolderOpen className="h-3.5 w-3.5" />} onClick={() => setFolderOpen(true)}>
                  Thư mục kết quả
                </Button>
              </div>
              {images.length === 0 ? (
                <p className="flex flex-1 items-center justify-center rounded-md border border-dashed border-slate-200 px-3 text-center text-[12.5px] text-slate-500">Vui lòng chụp ảnh hoặc tải ảnh lên</p>
              ) : (
                <>
                  <div className="thin-scroll grid flex-1 grid-cols-2 content-start gap-1.5 overflow-y-auto">
                    {images.map((img) => (
                      <div key={img.id} className="group relative overflow-hidden rounded-md border-2 border-blue-400">
                        <img src={img.dataUrl} alt={img.name} className="aspect-[4/3] w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImages((l) => l.filter((x) => x.id !== img.id))}
                          className="absolute top-1 right-1 rounded bg-white/90 p-0.5 text-red-600 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                          aria-label="Xoá ảnh"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => setImages([])} className="flex items-center justify-center gap-1 rounded-md bg-slate-50 py-1.5 text-[12.5px] text-red-600 hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5" /> Xoá tất cả ảnh
                  </button>
                </>
              )}
              {/* Hai nút xếp dọc: cột 300px không đủ chỗ cho chữ + nhãn phím khi đặt cạnh nhau */}
              <div className="mt-auto flex flex-col gap-1.5 pt-1">
                <Button size="sm" className="w-full" rightIcon={<Kbd tone="blue">F9</Kbd>} onClick={() => save(false)}>
                  Lưu kết quả
                </Button>
                <Button size="sm" variant="outline" className="w-full" rightIcon={<Kbd>Ctrl+F9</Kbd>} onClick={() => save(true)}>
                  Lưu &amp; in phiếu
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {folderOpen && <ResultFolderModal files={files} onChange={setFiles} onClose={() => setFolderOpen(false)} />}
      <PrintPreviewModal
        open={printOpen}
        title="Phiếu kết quả"
        onClose={() => {
          setPrintOpen(false)
          onClose()
        }}
      >
        <ResultReportDoc visit={visit} patient={patient} order={{ ...order, result: { description, conclusion, recommendation, images, files, updatedAt: new Date().toISOString(), by: currentUser() } }} />
      </PrintPreviewModal>
    </Portal>
  )
}

/** Khung camera: chọn thiết bị, tỉ lệ khung hình, chụp ảnh (F8) */
function CameraPanel({ onCapture, disabled }: { onCapture: (dataUrl: string) => void; disabled: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceId, setDeviceId] = useState('')
  const [ratio, setRatio] = useState<'4:3' | '16:9'>('4:3')
  const [state, setState] = useState<'idle' | 'on' | 'error'>('idle')
  const streamRef = useRef<MediaStream | null>(null)

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  const start = useCallback(async (id?: string) => {
    stop()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: id ? { deviceId: { exact: id } } : true })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setState('on')
      const list = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput')
      setDevices(list)
      if (!id && list[0]) setDeviceId(stream.getVideoTracks()[0]?.getSettings().deviceId ?? list[0].deviceId)
    } catch {
      setState('error')
    }
  }, [])

  useEffect(() => stop, [])

  const capture = useCallback(async () => {
    const v = videoRef.current
    if (!v || state !== 'on' || disabled) return
    const [rw, rh] = ratio === '4:3' ? [4, 3] : [16, 9]
    const srcW = v.videoWidth
    const srcH = v.videoHeight
    const targetH = Math.min(srcH, (srcW * rh) / rw)
    const targetW = (targetH * rw) / rh
    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    canvas.getContext('2d')!.drawImage(v, (srcW - targetW) / 2, (srcH - targetH) / 2, targetW, targetH, 0, 0, targetW, targetH)
    onCapture(await compressImage(canvas))
  }, [state, disabled, ratio, onCapture])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F8') {
        e.preventDefault()
        capture()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [capture])

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        <select
          value={deviceId}
          onChange={(e) => {
            setDeviceId(e.target.value)
            start(e.target.value)
          }}
          disabled={!devices.length}
          className="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-1.5 text-[12px] outline-none disabled:text-slate-400"
          aria-label="Chọn camera"
        >
          {devices.length === 0 && <option value="">Chưa bật camera</option>}
          {devices.map((d, i) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `Camera ${i + 1}`}
            </option>
          ))}
        </select>
        <select value={ratio} onChange={(e) => setRatio(e.target.value as '4:3' | '16:9')} className="h-8 w-[68px] rounded-md border border-slate-200 bg-white px-1.5 text-[12px]" aria-label="Tỉ lệ khung hình">
          <option>4:3</option>
          <option>16:9</option>
        </select>
      </div>
      <div className={cn('relative overflow-hidden rounded-md bg-slate-200', ratio === '4:3' ? 'aspect-[4/3]' : 'aspect-video')}>
        <video ref={videoRef} autoPlay playsInline muted className={cn('h-full w-full object-cover', state !== 'on' && 'hidden')} />
        {state !== 'on' && (
          <button type="button" onClick={() => start()} className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[12.5px] text-slate-600 hover:bg-slate-300/40">
            {state === 'error' ? <CameraOff className="h-6 w-6" /> : <Camera className="h-6 w-6" />}
            {state === 'error' ? 'Không truy cập được camera – có thể tải ảnh lên' : 'Bấm để bật camera'}
          </button>
        )}
      </div>
      <Button className="w-full" size="sm" disabled={state !== 'on' || disabled} onClick={capture} leftIcon={<Camera className="h-3.5 w-3.5" />} rightIcon={<Kbd tone="blue">F8</Kbd>}>
        Chụp ảnh
      </Button>
    </div>
  )
}

function UploadImagesButton({ onFiles }: { onFiles: (files: File[]) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <Button size="sm" variant="outline" leftIcon={<Upload className="h-3.5 w-3.5" />} onClick={() => ref.current?.click()}>
        Tải ảnh lên
      </Button>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg"
        multiple
        hidden
        onChange={(e) => {
          onFiles([...(e.target.files ?? [])])
          e.target.value = ''
        }}
      />
    </>
  )
}

/** Thư mục kết quả: tệp PDF đính kèm phiếu (ảnh 055) */
function ResultFolderModal({ files, onChange, onClose }: { files: ResultFile[]; onChange: (f: ResultFile[]) => void; onClose: () => void }) {
  const toast = useToast()
  const ref = useRef<HTMLInputElement>(null)
  return (
    <Modal open onClose={onClose} size="md" title="Thư mục kết quả chẩn đoán hình ảnh" description="Chọn tối đa 05 tệp, mỗi tệp PDF tối đa 2MB (bản demo lưu trong trình duyệt).">
      <div className="mb-3 flex justify-end">
        <Button size="sm" variant="outline" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => ref.current?.click()} disabled={files.length >= 5}>
          Tải lên tệp kết quả
        </Button>
        <input
          ref={ref}
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          multiple
          hidden
          onChange={async (e) => {
            const picked = [...(e.target.files ?? [])].slice(0, 5 - files.length)
            e.target.value = ''
            const added: ResultFile[] = []
            for (const f of picked) {
              try {
                added.push(await toResultFile(f))
              } catch (err) {
                toast({ title: (err as Error).message, tone: 'warning' })
              }
            }
            onChange([...files, ...added])
          }}
        />
      </div>
      <table className="w-full text-[13px]">
        <thead className="bg-slate-50 text-[12.5px] text-slate-600">
          <tr>
            <th className="w-8 py-2 pl-2 text-left font-medium">#</th>
            <th className="py-2 text-left font-medium">Tên</th>
            <th className="w-36 py-2 text-left font-medium">Ngày</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {files.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-slate-500">
                Chưa có tệp kết quả
              </td>
            </tr>
          )}
          {files.map((f, i) => (
            <tr key={f.id} className="border-t border-slate-100">
              <td className="py-2 pl-2">{i + 1}</td>
              <td className="py-2">
                <a href={f.dataUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  {f.name}
                </a>
                <span className="ml-1 text-xs text-slate-400">({formatBytes(f.size)})</span>
              </td>
              <td className="py-2">{formatDateTimeVN(f.at)}</td>
              <td className="py-2 text-right">
                <button type="button" onClick={() => onChange(files.filter((x) => x.id !== f.id))} className="rounded p-1 text-red-600 hover:bg-red-50" aria-label={`Xoá ${f.name}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  )
}
