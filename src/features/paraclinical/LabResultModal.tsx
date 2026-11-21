import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Eye, FileText, Image as ImageIcon, Plus, Trash2, UploadCloud } from 'lucide-react'
import { Button, Kbd } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import { currentUser } from '@/store/runtime'
import { GENDER_LABEL } from '@/store/catalog'
import { ageLabel, formatDateVN } from '@/lib/date'
import { MAX_RESULT_FILES, formatBytes, toResultFile } from '@/lib/files'
import { cn } from '@/lib/cn'
import type { ResultFile } from '@/store/types'

/** Trả kết quả xét nghiệm bằng tệp PDF / ảnh (ảnh 058–060) */
export function LabResultModal({ visitId, orderId, onClose }: { visitId: string; orderId: string; onClose: () => void }) {
  const { visits, patients } = useClinicState()
  const { updateOrder } = useClinicActions()
  const toast = useToast()
  const visit = visits.find((v) => v.id === visitId)
  const order = visit?.paraclinicalOrders?.find((o) => o.id === orderId)
  const patient = visit ? patients.find((p) => p.id === visit.patientId) : undefined
  const [files, setFiles] = useState<ResultFile[]>(order?.result?.files ?? [])
  const [preview, setPreview] = useState<ResultFile | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [touched, setTouched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = async (list: File[]) => {
    const room = MAX_RESULT_FILES - files.length
    if (list.length > room) toast({ title: `Chỉ thêm được ${room} tệp nữa (tối đa ${MAX_RESULT_FILES})`, tone: 'warning' })
    setBusy(true)
    const added: ResultFile[] = []
    for (const f of list.slice(0, room)) {
      try {
        added.push(await toResultFile(f))
      } catch (err) {
        toast({ title: (err as Error).message, tone: 'warning' })
      }
    }
    setBusy(false)
    setFiles((cur) => [...cur, ...added])
  }

  const submit = useCallback(() => {
    setTouched(true)
    if (!visit || !order || !files.length) return
    updateOrder(visit.id, order.id, {
      result: { description: '', conclusion: '', recommendation: '', images: [], files, updatedAt: new Date().toISOString(), by: currentUser() },
      resultStatus: 'has_result',
      performStatus: 'done',
    })
    toast({ title: `Đã trả kết quả: ${order.name}`, description: `${files.length} tệp · ${patient?.fullName ?? ''}`, tone: 'success' })
    onClose()
  }, [visit, order, files, updateOrder, toast, patient, onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault()
        submit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [submit])

  if (!visit || !order || !patient) return null

  return (
    <Modal
      open
      onClose={onClose}
      size={preview ? 'lg' : 'md'}
      title={`Trả kết quả: ${order.name}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Button onClick={submit} disabled={busy} rightIcon={<Kbd tone="blue">F9</Kbd>}>
            Trả kết quả
          </Button>
        </>
      }
    >
      {preview ? (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Button size="sm" variant="ghost" leftIcon={<ArrowLeft className="h-3.5 w-3.5" />} onClick={() => setPreview(null)}>
              Trở lại
            </Button>
            <a href={preview.dataUrl} target="_blank" rel="noreferrer" className="text-[12.5px] text-blue-600 hover:underline">
              Mở trong thẻ mới
            </a>
          </div>
          {preview.type === 'application/pdf' ? (
            <iframe src={preview.dataUrl} title={preview.name} className="h-[60vh] w-full rounded border border-slate-200" />
          ) : (
            <img src={preview.dataUrl} alt={preview.name} className="mx-auto max-h-[60vh] rounded" />
          )}
        </div>
      ) : (
        <>
          <dl className="mb-4 grid grid-cols-[150px_1fr] gap-y-1 text-[13px]">
            <dt className="text-slate-500">Thông tin người bệnh:</dt>
            <dd>
              <b className="uppercase">{patient.fullName}</b> · Tuổi {ageLabel(patient.dob, visit.date)} · Giới tính {GENDER_LABEL[patient.gender]}
            </dd>
            <dt className="text-slate-500">Ngày chỉ định:</dt>
            <dd>{formatDateVN(visit.date)}</dd>
          </dl>
          <p className="mb-1.5 text-[13px] font-medium text-slate-800">
            Tải lên<span className="text-red-500">*</span> <span className="font-normal text-slate-500">({files.length}/{MAX_RESULT_FILES} tệp)</span>
          </p>
          {files.length < MAX_RESULT_FILES && files.length === 0 && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => (e.preventDefault(), setDragging(true))}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                addFiles([...e.dataTransfer.files])
              }}
              className={cn(
                'flex w-full flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-6 text-[13px] text-slate-600',
                dragging ? 'border-blue-500 bg-blue-50' : touched ? 'border-red-300' : 'border-slate-300 hover:bg-slate-50',
              )}
            >
              <UploadCloud className="h-7 w-7 text-slate-400" />
              <span>
                <span className="text-blue-600">Nhấn để chọn tệp</span> hoặc kéo thả vào đây
              </span>
              <span className="text-xs text-slate-500">Hỗ trợ jpg, jpeg, png, pdf · tối đa 5 tệp · PDF tối đa 2MB (bản demo lưu trong trình duyệt)</span>
            </button>
          )}
          {touched && !files.length && <p className="mt-1 text-xs text-red-600">Vui lòng tải lên ít nhất một tệp kết quả</p>}
          {files.length > 0 && (
            <ul className="space-y-1.5">
              {files.map((f) => (
                <li key={f.id} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-[13px]">
                  <span className={cn('flex h-8 w-8 items-center justify-center rounded', f.type === 'application/pdf' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600')}>
                    {f.type === 'application/pdf' ? <FileText className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{f.name}</span>
                    <span className="text-xs text-slate-500">{formatBytes(f.size)} · Hoàn thành</span>
                  </span>
                  <button type="button" onClick={() => setPreview(f)} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label={`Xem ${f.name}`}>
                    <Eye className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setFiles((l) => l.filter((x) => x.id !== f.id))} className="rounded p-1 text-red-600 hover:bg-red-50" aria-label={`Xoá ${f.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
              {files.length < MAX_RESULT_FILES && (
                <li>
                  <button type="button" onClick={() => inputRef.current?.click()} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-[13px] text-blue-600 hover:bg-blue-50/50">
                    <Plus className="h-3.5 w-3.5" /> Tải thêm tệp
                  </button>
                </li>
              )}
            </ul>
          )}
          {busy && <p className="mt-2 text-xs text-slate-500">Đang xử lý tệp...</p>}
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            multiple
            hidden
            onChange={(e) => {
              addFiles([...(e.target.files ?? [])])
              e.target.value = ''
            }}
          />
        </>
      )}
    </Modal>
  )
}
