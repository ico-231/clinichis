import { useMemo, useState, type ReactNode } from 'react'
import { ChevronRight, PanelLeft, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDiscardModal } from '@/components/ui/ConfirmDiscardModal'
import { Pagination } from '@/components/ui/Pagination'
import { Tabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import { usePatientVisits } from '@/store/selectors'
import { GENDER_LABEL, RELATION_LABEL } from '@/store/catalog'
import { formatDiagnosis } from '@/store/icd10'
import { formatDateTimeVN, formatDateVN } from '@/lib/date'
import { formatPhone, initials } from '@/lib/format'
import { cn } from '@/lib/cn'
import { VisitInfoDrawer } from '../visit/VisitInfoDrawer'
import { PatientFormDrawer } from './PatientFormDrawer'
import type { Patient } from '@/store/types'
import { patientDeleteBlock } from '@/store/billing'

/** Hồ sơ người bệnh (ảnh 108, 114–117) */
export function PatientProfile({ patient, onBack }: { patient: Patient; onBack: () => void }) {
  const { ui } = useClinicState()
  const { setUI, deletePatient, updatePatient } = useClinicActions()
  const toast = useToast()
  const visits = usePatientVisits(patient.id)
  const [tab, setTab] = useState<'history' | 'notes'>('history')
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [note, setNote] = useState('')

  const history = useMemo(() => visits.filter((v) => v.status !== 'registered'), [visits])
  const last = history.find((v) => v.status !== 'cancelled')
  const rel = patient.relative
  const pageRows = history.slice((page - 1) * pageSize, page * pageSize)

  const info: [string, ReactNode][] = [
    ['Mã NB', patient.code],
    ['Ngày sinh', formatDateVN(patient.dob)],
    ['Giới tính', <span className={patient.gender === 'male' ? 'text-blue-600' : 'text-pink-600'}>{patient.gender === 'male' ? '♂' : '♀'} {GENDER_LABEL[patient.gender]}</span>],
    ['Nhóm máu', patient.bloodType || <Muted />],
    ['Địa chỉ', patient.address || <Muted />],
    ['Dân tộc', patient.ethnicity || <Muted />],
    ['Nghề nghiệp', patient.occupation || <Muted />],
    ['Email', patient.email || <Muted />],
    ['CCCD', patient.cccd || <Muted />],
    ['Mã BHYT', patient.insuranceNumber || <Muted />],
    ...(patient.allergies ? ([['Dị ứng', <span className="text-red-600">{patient.allergies}</span>]] as [string, ReactNode][]) : []),
  ]

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-[50px] shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
        <button type="button" onClick={() => setUI({ sidebarCollapsed: !ui.sidebarCollapsed })} className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100" aria-label="Thu gọn / mở rộng menu">
          <PanelLeft className="h-4 w-4" />
        </button>
        <span className="h-5 w-px bg-slate-200" />
        <nav className="flex flex-1 items-center gap-1.5 text-[13.5px]" aria-label="Breadcrumb">
          <button type="button" onClick={onBack} className="text-slate-500 hover:text-slate-900">
            Người bệnh
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-medium text-slate-900">{patient.code}</span>
        </nav>
        <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => {
            const block = patientDeleteBlock(visits)
            if (block) toast({ title: 'Không thể xoá hồ sơ', description: block, tone: 'warning' })
            else setConfirmDelete(true)
          }}
        >
          Xoá
        </Button>
        <Button size="sm" variant="outline" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditOpen(true)}>
          Chỉnh sửa
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 gap-2 p-2">
        <aside className="thin-scroll w-[260px] shrink-0 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/60 text-[13px]">
          <div className="flex flex-col items-center gap-1 border-b border-slate-200 px-3 py-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-400 text-sm font-semibold text-white">{initials(patient.fullName)}</span>
            <p className="mt-1 text-center font-semibold uppercase">{patient.fullName}</p>
            <p className="text-slate-500">{formatPhone(patient.phone)}</p>
          </div>
          <InfoList rows={info} />
          <div className="border-t border-slate-200 px-3 pt-3 font-semibold">Thông tin người thân</div>
          <InfoList
            rows={[
              ['Tên', rel?.fullName || patient.guardianName || <Muted />],
              ['Điện thoại', rel?.phone ? formatPhone(rel.phone) : <Muted />],
              ['Mối quan hệ', rel ? RELATION_LABEL[rel.relation] : patient.guardianRelation ? RELATION_LABEL[patient.guardianRelation] : <Muted />],
              ['Ngày sinh', rel?.dob ? formatDateVN(rel.dob) : <Muted />],
            ]}
          />
          <div className="border-t border-slate-200" />
          <InfoList
            rows={[
              ['Ngày tạo', formatDateTimeVN(patient.createdAt)],
              ['Cập nhật', formatDateTimeVN(patient.updatedAt ?? patient.createdAt)],
              ['Tg khám gần nhất', last ? `${last.time} ${formatDateVN(last.date)}` : <Muted text="Chưa khám" />],
            ]}
          />
        </aside>

        <section className="flex min-w-0 flex-1 flex-col rounded-lg border border-slate-200 bg-white p-2">
          <Tabs
            variant="pill"
            value={tab}
            onChange={setTab}
            className="self-start"
            items={[
              { value: 'history', label: 'Lịch sử khám' },
              { value: 'notes', label: 'Ghi chú' },
            ]}
          />
          {tab === 'history' ? (
            <>
              <div className="thin-scroll mt-2 min-h-0 flex-1 overflow-auto rounded-md border border-slate-200">
                <table className="w-full min-w-[820px] text-[13px]">
                  <thead className="bg-slate-50 text-[12.5px] text-slate-600">
                    <tr>
                      {['ID', 'Ngày khám', 'Toa thuốc', 'Cận lâm sàng', 'Chẩn đoán', 'Ngày tái khám', 'Loại', 'Mã KB'].map((h) => (
                        <th key={h} className="border-r border-slate-200 px-2 py-2 text-left font-medium last:border-r-0">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-500">
                          Chưa có lượt khám
                        </td>
                      </tr>
                    )}
                    {pageRows.map((v, i) => {
                      const dx = v.exam?.diagnoses ?? []
                      return (
                        <tr key={v.id} className={cn('border-t border-slate-100', i % 2 === 1 && 'bg-slate-50/50', v.status === 'cancelled' && 'text-slate-400')}>
                          <td className="px-2 py-1.5">{(page - 1) * pageSize + i + 1}</td>
                          <td className="px-2 py-1.5">
                            <button type="button" onClick={() => setDetailId(v.id)} className="text-blue-600 hover:underline">
                              {v.time} - {formatDateVN(v.date)}
                            </button>
                            {v.status === 'cancelled' && <span className="ml-1 text-xs">(đã huỷ)</span>}
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="checkbox" readOnly checked={!!v.exam?.prescription.length} aria-label="Có toa thuốc" className="pointer-events-none accent-slate-400" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="checkbox" readOnly checked={!!v.paraclinicalOrders?.length} aria-label="Có chỉ định CLS" className="pointer-events-none accent-slate-400" />
                          </td>
                          <td className="max-w-[260px] truncate px-2 py-1.5" title={dx.map(formatDiagnosis).join('; ')}>
                            {dx.length ? formatDiagnosis(dx[0]) : ''}
                          </td>
                          <td className="px-2 py-1.5">{v.exam?.followUpEnabled && v.exam.followUpDate ? formatDateVN(v.exam.followUpDate) : '--'}</td>
                          <td className="px-2 py-1.5">{v.visitKind ?? 'Lịch khám'}</td>
                          <td className="px-2 py-1.5 tabular-nums">{v.code}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={page}
                pageCount={Math.ceil(history.length / pageSize)}
                pageSize={pageSize}
                total={history.length}
                onPageChange={setPage}
                onPageSizeChange={(n) => (setPageSize(n), setPage(1))}
              />
            </>
          ) : (
            <div className="mt-2 flex min-h-0 flex-1 flex-col">
              <div className="thin-scroll min-h-0 flex-1 space-y-2 overflow-y-auto">
                {(patient.notes ?? []).length === 0 ? (
                  <p className="rounded-md border border-dashed border-slate-200 px-4 py-3 text-[13px] text-slate-500">Chưa có ghi chú nào. Bạn có thể thêm ghi chú cho người bệnh bằng hộp thoại bên dưới.</p>
                ) : (
                  (patient.notes ?? []).map((n) => (
                    <div key={n.id} className="group flex gap-3 rounded-md bg-amber-50/60 px-3 py-2 text-[13px]">
                      <p className="flex-1 whitespace-pre-wrap">{n.text}</p>
                      <span className="text-xs text-slate-500">{formatDateTimeVN(n.at)}</span>
                      <button
                        type="button"
                        onClick={() => updatePatient(patient.id, { notes: (patient.notes ?? []).filter((x) => x.id !== n.id) })}
                        className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-red-600"
                      >
                        Xoá
                      </button>
                    </div>
                  ))
                )}
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Nhập nội dung ghi chú"
                className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500"
              />
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  disabled={!note.trim()}
                  onClick={() => {
                    updatePatient(patient.id, { notes: [...(patient.notes ?? []), { id: `pn_${Date.now().toString(36)}`, text: note.trim(), at: new Date().toISOString() }] })
                    setNote('')
                    toast({ title: 'Đã lưu ghi chú', tone: 'success' })
                  }}
                >
                  Lưu
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>

      {editOpen && <PatientFormDrawer patient={patient} onClose={() => setEditOpen(false)} />}
      <VisitInfoDrawer visitId={detailId} onClose={() => setDetailId(null)} />
      <ConfirmDiscardModal
        open={confirmDelete}
        title="Bạn có chắc muốn xoá?"
        description={`Xoá thông tin ${patient.fullName}${visits.length ? ' cùng các lượt đăng ký chưa khám' : ''}. Không thể hoàn tác.`}
        cancelLabel="Huỷ"
        confirmLabel="Xác nhận"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false)
          onBack()
          deletePatient(patient.id)
          toast({ title: 'Đã xoá người bệnh', description: patient.fullName, tone: 'success' })
        }}
      />
    </div>
  )
}

function InfoList({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[92px_1fr] gap-x-2 gap-y-2 px-3 py-3">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-slate-500">{k}</dt>
          <dd className="min-w-0 break-words text-slate-900">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function Muted({ text = 'Chưa cập nhật' }: { text?: string }) {
  return <span className="text-slate-400">{text}</span>
}
