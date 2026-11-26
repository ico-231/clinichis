import { useMemo, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDiscardModal } from '@/components/ui/ConfirmDiscardModal'
import { Pagination } from '@/components/ui/Pagination'
import { Tabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { useClinicActions } from '@/store/ClinicStore'
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
  const { deletePatient, updatePatient } = useClinicActions()
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
    ['Mã NB', <span className="font-semibold text-info-ink tabular-nums">{patient.code}</span>],
    ['Ngày sinh', <span className="tabular-nums">{formatDateVN(patient.dob)}</span>],
    ['Giới tính', <span className={patient.gender === 'male' ? 'font-medium text-info-ink' : 'font-medium text-accent-ink'}>{patient.gender === 'male' ? '♂' : '♀'} {GENDER_LABEL[patient.gender]}</span>],
    ['Nhóm máu', patient.bloodType || <Muted />],
    ['Địa chỉ', patient.address || <Muted />],
    ['Dân tộc', patient.ethnicity || <Muted />],
    ['Nghề nghiệp', patient.occupation || <Muted />],
    ['Email', patient.email || <Muted />],
    ['CCCD', <span className="tabular-nums">{patient.cccd || <Muted />}</span>],
    ['Mã BHYT', <span className="tabular-nums">{patient.insuranceNumber || <Muted />}</span>],
    ...(patient.allergies ? ([['Dị ứng', <span className="font-semibold text-accent-ink">{patient.allergies}</span>]] as [string, ReactNode][]) : []),
  ]

  return (
    <div className="flex h-full flex-col bg-canvas">
      <header className="shrink-0 border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-[1920px] items-center gap-2.5 px-4 sm:px-6 2xl:px-8 py-2.5">
          <button
            type="button"
            onClick={onBack}
            className="rounded-[10px] p-1.5 text-ink-2 transition-colors hover:bg-subtle hover:text-ink"
            aria-label="Quay lại danh sách người bệnh"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="h-5 w-px bg-line" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-[16px] font-bold tracking-[-0.01em] text-ink">Hồ sơ người bệnh</h1>
              <span className="rounded-full border border-brand-line bg-brand-tint px-2.5 py-0.5 text-[12px] font-semibold text-brand-ink tabular-nums">{patient.code}</span>
            </div>
            <nav className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-3" aria-label="Breadcrumb">
              <button type="button" onClick={onBack} className="hover:text-brand-ink">
                Người bệnh
              </button>
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium text-ink uppercase">{patient.fullName}</span>
            </nav>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-accent-line text-accent-ink hover:border-accent/40 hover:bg-accent-soft"
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={() => {
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
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 gap-4 overflow-hidden px-4 sm:px-6 2xl:px-8 py-4">
        <aside className="thin-scroll w-[280px] shrink-0 overflow-y-auto rounded-[16px] border border-line bg-surface text-[13px]">
          <div className="flex flex-col items-center gap-1 border-b border-line px-4 py-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-brand-line bg-brand-tint text-[15px] font-bold text-brand-ink">{initials(patient.fullName)}</span>
            <p className="mt-1.5 text-center text-[15px] font-bold text-ink uppercase">{patient.fullName}</p>
            <p className="text-[12.5px] font-medium text-ink-3 tabular-nums">{formatPhone(patient.phone)}</p>
          </div>
          <InfoList rows={info} />
          <div className="border-t border-line px-3.5 pt-3 text-[12px] font-bold tracking-[0.03em] text-brand-ink uppercase">Thông tin người thân</div>
          <InfoList
            rows={[
              ['Tên', rel?.fullName || patient.guardianName || <Muted />],
              ['Điện thoại', rel?.phone ? <span className="tabular-nums">{formatPhone(rel.phone)}</span> : <Muted />],
              ['Mối quan hệ', rel ? RELATION_LABEL[rel.relation] : patient.guardianRelation ? RELATION_LABEL[patient.guardianRelation] : <Muted />],
              ['Ngày sinh', rel?.dob ? <span className="tabular-nums">{formatDateVN(rel.dob)}</span> : <Muted />],
            ]}
          />
          <div className="border-t border-line" />
          <InfoList
            rows={[
              ['Ngày tạo', <span className="tabular-nums">{formatDateTimeVN(patient.createdAt)}</span>],
              ['Cập nhật', <span className="tabular-nums">{formatDateTimeVN(patient.updatedAt ?? patient.createdAt)}</span>],
              ['Tg khám gần nhất', last ? <span className="tabular-nums">{`${last.time} ${formatDateVN(last.date)}`}</span> : <Muted text="Chưa khám" />],
            ]}
          />
        </aside>

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[16px] border border-line bg-surface">
          <div className="border-b border-line px-4 py-2.5">
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
          </div>
          {tab === 'history' ? (
            <>
              <div className="thin-scroll min-h-0 flex-1 overflow-auto">
                <table className="w-full min-w-[820px] text-[13px]">
                  <thead className="sticky top-0 z-10 border-b border-line bg-subtle text-[12.5px] font-semibold text-ink-3">
                    <tr>
                      {['ID', 'Ngày khám', 'Toa thuốc', 'Cận lâm sàng', 'Chẩn đoán', 'Ngày tái khám', 'Loại', 'Mã KB'].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {pageRows.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-ink-3">
                          Chưa có lượt khám
                        </td>
                      </tr>
                    )}
                    {pageRows.map((v, i) => {
                      const dx = v.exam?.diagnoses ?? []
                      return (
                        <tr key={v.id} onClick={() => setDetailId(v.id)} className={cn('cursor-pointer transition-colors hover:bg-brand-wash', v.status === 'cancelled' && 'text-ink-5')}>
                          <td className="px-3 py-2 text-ink-3 tabular-nums">{(page - 1) * pageSize + i + 1}</td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => setDetailId(v.id)} className="font-semibold text-info-ink hover:underline tabular-nums">
                              {v.time} - {formatDateVN(v.date)}
                            </button>
                            {v.status === 'cancelled' && <span className="ml-1.5 text-xs text-accent-ink">(đã huỷ)</span>}
                          </td>
                          <td className="px-3 py-2">
                            <input type="checkbox" readOnly checked={!!v.exam?.prescription.length} aria-label="Có toa thuốc" className="pointer-events-none accent-brand" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="checkbox" readOnly checked={!!v.paraclinicalOrders?.length} aria-label="Có chỉ định CLS" className="pointer-events-none accent-brand" />
                          </td>
                          <td className="max-w-[260px] truncate px-3 py-2 text-ink-2" title={dx.map(formatDiagnosis).join('; ')}>
                            {dx.length ? formatDiagnosis(dx[0]) : ''}
                          </td>
                          <td className="px-3 py-2 text-ink-2 tabular-nums">{v.exam?.followUpEnabled && v.exam.followUpDate ? formatDateVN(v.exam.followUpDate) : '--'}</td>
                          <td className="px-3 py-2 text-ink-2">{v.visitKind ?? 'Lịch khám'}</td>
                          <td className="px-3 py-2 font-medium text-ink-2 tabular-nums">{v.code}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-line px-4">
                <Pagination
                  page={page}
                  pageCount={Math.ceil(history.length / pageSize)}
                  pageSize={pageSize}
                  total={history.length}
                  onPageChange={setPage}
                  onPageSizeChange={(n) => (setPageSize(n), setPage(1))}
                />
              </div>
            </>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col p-4">
              <div className="thin-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto">
                {(patient.notes ?? []).length === 0 ? (
                  <p className="rounded-[12px] border border-dashed border-line-strong bg-canvas px-4 py-3 text-[13px] text-ink-3">
                    Chưa có ghi chú nào. Bạn có thể thêm ghi chú cho người bệnh bằng hộp thoại bên dưới.
                  </p>
                ) : (
                  (patient.notes ?? []).map((n) => (
                    <div key={n.id} className="group flex items-start gap-3 rounded-[12px] border border-accent-line bg-accent-tint px-3.5 py-2.5 text-[13px] text-ink">
                      <p className="flex-1 whitespace-pre-wrap">{n.text}</p>
                      <span className="shrink-0 text-xs text-accent-strong tabular-nums">{formatDateTimeVN(n.at)}</span>
                      <button
                        type="button"
                        onClick={() => updatePatient(patient.id, { notes: (patient.notes ?? []).filter((x) => x.id !== n.id) })}
                        className="shrink-0 text-xs font-medium text-accent-strong opacity-0 transition-opacity group-hover:opacity-100 hover:text-accent-ink focus-visible:opacity-100"
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
                className="mt-3 w-full rounded-[12px] border border-line-strong bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-ink-4 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
              <div className="mt-2.5 flex justify-end">
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
    <dl className="grid grid-cols-[96px_1fr] gap-x-2 gap-y-2 px-3.5 py-3">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ink-3">{k}</dt>
          <dd className="min-w-0 break-words font-medium text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function Muted({ text = 'Chưa cập nhật' }: { text?: string }) {
  return <span className="font-normal text-ink-4">{text}</span>
}
