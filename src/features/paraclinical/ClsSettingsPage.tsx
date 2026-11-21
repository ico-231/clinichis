import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, FileSpreadsheet, MoreHorizontal, Pause, Pencil, Play, PlusCircle, Settings2, Trash2, UploadCloud } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, Kbd } from '@/components/ui/Button'
import { ConfirmDiscardModal } from '@/components/ui/ConfirmDiscardModal'
import { DropdownMenu, MenuItem } from '@/components/ui/DropdownMenu'
import { EmptyState } from '@/components/ui/EmptyState'
import { Drawer, Modal, hasOpenOverlay } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { RichTextArea } from '@/components/ui/RichText'
import { Select } from '@/components/ui/Select'
import { Tabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import { INTERNAL_LAB_ID } from '@/store/catalogSync'
import { downloadText, toCsv } from '@/lib/csv'
import { formatNumber, normalizeText } from '@/lib/format'
import { cn } from '@/lib/cn'
import { RESULT_TEMPLATES } from './resultTemplates'
import type { ParaclinicalServiceItem, ResultTemplate } from '@/store/types'

const CLASSES = ['Sinh hoá', 'Huyết học', 'Miễn dịch', 'Vi sinh', 'Thăm dò chức năng', 'Siêu âm', 'X-quang', 'Khác']
const input = 'h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15'
const newId = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

/** Cận lâm sàng › Thiết lập (ảnh 123–132) */
export function ClsSettingsPage() {
  const { clsServices } = useClinicState()
  const { setClsServices } = useClinicActions()
  const toast = useToast()
  const list = useMemo(() => clsServices ?? [], [clsServices])
  const [tab, setTab] = useState<'catalog' | 'classes' | 'combo'>('catalog')
  const [q, setQ] = useState('')
  const [cls, setCls] = useState('all')
  const [applied, setApplied] = useState({ q: '', cls: 'all' })
  const [edit, setEdit] = useState<{ s: ParaclinicalServiceItem; isNew: boolean } | null>(null)
  const [tplFor, setTplFor] = useState<ParaclinicalServiceItem | null>(null)
  const [del, setDel] = useState<ParaclinicalServiceItem | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const rows = list.filter((s) => (applied.cls === 'all' || s.classification === applied.cls) && (!applied.q || normalizeText(s.name).includes(normalizeText(applied.q))))
  const save = (next: ParaclinicalServiceItem[], msg: string) => {
    setClsServices(next)
    toast({ title: msg, tone: 'success' })
  }
  const openNew = () =>
    setEdit({ s: { id: newId('cls'), providerId: INTERNAL_LAB_ID, name: '', groupLabel: '', category: 'lab', price: 0, unit: 'Lần', classification: '', room: 'Mặc định', returnsResult: false, printLayout: 'portrait' }, isNew: true })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2' && tab === 'catalog' && !hasOpenOverlay()) {
        e.preventDefault()
        openNew()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Thiết lập" />
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Tabs
            variant="pill"
            value={tab}
            onChange={setTab}
            items={[
              { value: 'catalog', label: 'Danh mục CLS' },
              { value: 'classes', label: 'Phân loại' },
              { value: 'combo', label: 'Combo' },
            ]}
          />
          {tab === 'catalog' && (
            <>
              <span className="ml-auto" />
              <DropdownMenu
                align="end"
                renderTrigger={({ ref, toggle }) => (
                  <Button ref={ref} onClick={toggle} rightIcon={<ChevronDown className="h-3.5 w-3.5" />}>
                    Nhập danh mục từ file
                  </Button>
                )}
              >
                <MenuItem icon={<UploadCloud className="h-3.5 w-3.5" />} onSelect={() => setImportOpen(true)}>
                  Tải lên tệp danh mục
                </MenuItem>
                <MenuItem icon={<FileSpreadsheet className="h-3.5 w-3.5" />} onSelect={() => downloadTemplate()}>
                  Tải file mẫu
                </MenuItem>
              </DropdownMenu>
            </>
          )}
        </div>

        {tab !== 'catalog' ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState title={`${tab === 'classes' ? 'Phân loại' : 'Combo'} đang chờ thiết kế`} description="Chưa có ảnh tham chiếu cho tab này – giữ trang chờ theo kế hoạch." />
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-end gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setApplied({ q, cls })} placeholder="Tìm theo tên" className={cn(input, 'w-[220px] bg-slate-50')} />
              <Select label="Phân loại" value={cls} options={[{ value: 'all', label: 'Tất cả' }, ...CLASSES.map((c) => ({ value: c, label: c }))]} onChange={setCls} className="w-[150px]" />
              <Select label="Phòng CLS" value="all" options={[{ value: 'all', label: 'Tất cả' }, { value: 'default', label: 'Mặc định' }]} onChange={() => {}} className="w-[130px]" />
              <Button onClick={() => (setApplied({ q, cls }), setPage(1))}>Tìm kiếm</Button>
              <Button variant="success" className="ml-auto" leftIcon={<PlusCircle className="h-4 w-4" />} rightIcon={<Kbd tone="green">F2</Kbd>} onClick={openNew}>
                Thêm mới
              </Button>
            </div>
            <div className="thin-scroll min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full min-w-[900px] text-[13px]">
                <thead className="sticky top-0 bg-slate-50 text-[12.5px] text-slate-600">
                  <tr>
                    {['STT', 'Tên cận lâm sàng', 'Phân loại', 'Loại CLS', 'Đơn giá', 'Đơn vị', 'Phòng thực hiện', 'Trả kết quả', ''].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={9}>
                        <EmptyState description="Thêm dịch vụ cận lâm sàng thực hiện tại phòng khám để chỉ định cho người bệnh." />
                      </td>
                    </tr>
                  )}
                  {rows.slice((page - 1) * pageSize, page * pageSize).map((s, i) => (
                    <tr key={s.id} className={cn('border-t border-slate-100', s.paused && 'text-slate-400')}>
                      <td className="px-3 py-2">{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-3 py-2 font-medium">
                        {s.name}
                        {s.paused && <span className="ml-2 rounded bg-slate-100 px-1.5 text-[11px]">Tạm ngưng</span>}
                      </td>
                      <td className="px-3 py-2">{s.classification}</td>
                      <td className="px-3 py-2">{s.category === 'imaging' ? 'Chẩn đoán hình ảnh' : 'Xét nghiệm'}</td>
                      <td className="px-3 py-2 tabular-nums">{formatNumber(s.price)}</td>
                      <td className="px-3 py-2">{s.unit}</td>
                      <td className="px-3 py-2">{s.room}</td>
                      <td className="px-3 py-2">{s.returnsResult ? 'Có' : 'Không'}</td>
                      <td className="px-2 py-2 text-right">
                        <DropdownMenu
                          align="end"
                          renderTrigger={({ ref, toggle }) => (
                            <button ref={ref} type="button" onClick={toggle} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Hành động">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          )}
                        >
                          <MenuItem icon={<Pencil className="h-3.5 w-3.5" />} onSelect={() => setEdit({ s, isNew: false })}>
                            Chỉnh sửa
                          </MenuItem>
                          <MenuItem icon={<Settings2 className="h-3.5 w-3.5" />} onSelect={() => setTplFor(s)}>
                            Cài đặt mẫu
                          </MenuItem>
                          <MenuItem
                            icon={s.paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                            onSelect={() => save(list.map((x) => (x.id === s.id ? { ...x, paused: !x.paused } : x)), s.paused ? 'Đã mở lại dịch vụ' : 'Đã tạm ngưng dịch vụ')}
                          >
                            {s.paused ? 'Tiếp tục' : 'Tạm ngưng'}
                          </MenuItem>
                          <MenuItem icon={<Trash2 className="h-3.5 w-3.5" />} danger onSelect={() => setDel(s)}>
                            Xoá
                          </MenuItem>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageCount={Math.ceil(rows.length / pageSize)} pageSize={pageSize} total={rows.length} onPageChange={setPage} onPageSizeChange={(n) => (setPageSize(n), setPage(1))} />
          </>
        )}
      </div>

      {edit && (
        <ServiceDrawer
          value={edit.s}
          isNew={edit.isNew}
          onClose={() => setEdit(null)}
          onSave={(s) => {
            if (list.some((x) => x.id !== s.id && normalizeText(x.name) === normalizeText(s.name))) return toast({ title: 'Tên cận lâm sàng đã tồn tại', tone: 'warning' })
            save(edit.isNew ? [...list, s] : list.map((x) => (x.id === s.id ? s : x)), edit.isNew ? 'Đã thêm cận lâm sàng' : 'Đã lưu thay đổi')
            setEdit(null)
          }}
        />
      )}
      {tplFor && <TemplateModal service={tplFor} onClose={() => setTplFor(null)} />}
      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onImport={(items) => {
            const existing = new Set(list.map((x) => normalizeText(x.name)))
            const fresh = items.filter((x) => !existing.has(normalizeText(x.name)))
            save([...list, ...fresh], `Đã nhập ${fresh.length} dịch vụ${items.length - fresh.length ? ` (bỏ qua ${items.length - fresh.length} trùng tên)` : ''}`)
            setImportOpen(false)
          }}
        />
      )}
      <ConfirmDiscardModal
        open={!!del}
        title="Bạn có chắc muốn xoá?"
        description={del ? `Xoá "${del.name}" khỏi danh mục. Các chỉ định đã tạo trước đó không bị ảnh hưởng.` : ''}
        cancelLabel="Huỷ"
        confirmLabel="Xác nhận"
        onCancel={() => setDel(null)}
        onConfirm={() => {
          if (del) save(list.filter((x) => x.id !== del.id), 'Đã xoá cận lâm sàng')
          setDel(null)
        }}
      />
    </div>
  )
}

const TEMPLATE_HEADER = ['Tên cận lâm sàng', 'Giá', 'Đơn vị tính', 'Phân loại', 'Loại CLS (XN/CDHA)', 'Trả kết quả (Có/Không)']
function downloadTemplate() {
  downloadText(toCsv(TEMPLATE_HEADER, [['Siêu âm bụng tổng quát', 150000, 'Lượt', 'Siêu âm', 'CDHA', 'Có'], ['Công thức máu', 90000, 'Lần', 'Huyết học', 'XN', 'Có']]), 'mau-danh-muc-cls.csv')
}

/** Đọc CSV đơn giản (dấu phẩy, hỗ trợ ngoặc kép) */
function parseCsv(text: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (cell += '"'), i++
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',' || c === ';') (row.push(cell), (cell = ''))
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += c
  }
  if (cell || row.length) (row.push(cell), rows.push(row))
  return rows.filter((r) => r.some((x) => x.trim()))
}

function ImportModal({ onClose, onImport }: { onClose: () => void; onImport: (items: ParaclinicalServiceItem[]) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<ParaclinicalServiceItem[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [name, setName] = useState('')
  const read = async (f: File) => {
    setName(f.name)
    if (!/\.csv$/i.test(f.name)) return setErrors(['Bản demo hỗ trợ tệp .csv (mở file mẫu bằng Excel, lưu dạng CSV UTF-8).'])
    const rows = parseCsv((await f.text()).replace(/^﻿/, ''))
    const errs: string[] = []
    const out: ParaclinicalServiceItem[] = []
    rows.slice(1).forEach((r, i) => {
      const [n, price, unit, klass, kind, ret] = r.map((x) => x.trim())
      const p = Number(price.replace(/\D/g, ''))
      if (!n) return errs.push(`Dòng ${i + 2}: thiếu tên`)
      if (!p) return errs.push(`Dòng ${i + 2}: giá không hợp lệ`)
      out.push({
        id: newId('cls'),
        providerId: INTERNAL_LAB_ID,
        name: n,
        groupLabel: `${(klass || 'Khác').toUpperCase()} (${unit || 'Lần'})`,
        category: /cdha|hình|hinh/i.test(kind) ? 'imaging' : 'lab',
        price: p,
        unit: unit || 'Lần',
        classification: klass || 'Khác',
        room: 'Mặc định',
        returnsResult: /^c[oó]/i.test(ret),
        printLayout: 'portrait',
      })
    })
    setItems(out)
    setErrors(errs)
  }
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Upload danh mục cận lâm sàng"
      footer={
        <Button disabled={!items.length} onClick={() => onImport(items)}>
          Tải lên {items.length ? `(${items.length})` : ''}
        </Button>
      }
    >
      <div className="mb-3 flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-[12.5px]">
        <FileSpreadsheet className="h-6 w-6 shrink-0 text-emerald-600" />
        <p className="flex-1 text-slate-600">
          <b className="block text-slate-900">File mẫu</b>Tải file mẫu, điền đầy đủ thông tin dịch vụ rồi tải lên tại ô bên dưới.
        </p>
        <Button size="sm" variant="outline" onClick={downloadTemplate}>
          Tải file mẫu
        </Button>
      </div>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const f = e.dataTransfer.files[0]
          if (f) read(f)
        }}
        className="flex w-full flex-col items-center gap-1 rounded-lg border border-dashed border-slate-300 py-6 text-[13px] text-slate-600 hover:bg-slate-50"
      >
        <UploadCloud className="h-7 w-7 text-slate-400" />
        {name || 'Kéo và thả tập tin hoặc nhấn vào đây để chọn'}
        <span className="text-xs text-slate-500">Hỗ trợ định dạng .csv</span>
      </button>
      <input ref={ref} type="file" accept=".csv,text/csv" hidden onChange={(e) => e.target.files?.[0] && read(e.target.files[0])} />
      {items.length > 0 && <p className="mt-2 text-[12.5px] text-emerald-700">Đọc được {items.length} dịch vụ hợp lệ.</p>}
      {errors.length > 0 && (
        <ul className="mt-2 max-h-28 overflow-y-auto text-[12px] text-red-600">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

function ServiceDrawer({ value, isNew, onClose, onSave }: { value: ParaclinicalServiceItem; isNew: boolean; onClose: () => void; onSave: (s: ParaclinicalServiceItem) => void }) {
  const [s, setS] = useState(value)
  const [touched, setTouched] = useState(false)
  const set = (p: Partial<ParaclinicalServiceItem>) => setS((x) => ({ ...x, ...p }))
  const err: Record<string, string> = {}
  if (!s.name.trim()) err.name = 'Nhập tên cận lâm sàng'
  if (!s.price) err.price = 'Nhập giá'
  if (!s.unit?.trim()) err.unit = 'Nhập đơn vị tính'
  if (!s.classification) err.classification = 'Chọn phân loại'
  const submit = () => {
    setTouched(true)
    if (Object.keys(err).length) return
    onSave({ ...s, name: s.name.trim(), groupLabel: `${(s.classification ?? 'Khác').toUpperCase()} (${s.unit})` })
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault()
        submit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  return (
    <Drawer
      open
      onClose={onClose}
      title={isNew ? 'Thêm cận lâm sàng' : 'Điều chỉnh cận lâm sàng'}
      width="w-[min(360px,100vw)]"
      footer={
        <div className="flex justify-end">
          <Button onClick={submit} rightIcon={<Kbd tone="blue">F9</Kbd>}>
            {isNew ? 'Lưu' : 'Lưu thay đổi'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 px-4 py-3">
        <ReqField label="Tên" error={touched ? err.name : ""}>
          <input autoFocus value={s.name} onChange={(e) => set({ name: e.target.value })} placeholder="Tên cận lâm sàng" className={input} />
        </ReqField>
        <ReqField label="Giá" error={touched ? err.price : ""}>
          <input value={formatNumber(s.price)} inputMode="numeric" onChange={(e) => set({ price: Number(e.target.value.replace(/\D/g, '')) || 0 })} className={cn(input, 'tabular-nums')} />
        </ReqField>
        <ReqField label="Đơn vị tính" error={touched ? err.unit : ""}>
          <input value={s.unit ?? ''} onChange={(e) => set({ unit: e.target.value })} placeholder="Lần" className={input} />
        </ReqField>
        <ReqField label="Phân loại" error={touched ? err.classification : ""}>
          <select value={s.classification ?? ''} onChange={(e) => set({ classification: e.target.value })} className={input}>
            <option value="">Chọn phân loại</option>
            {CLASSES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </ReqField>
        <ReqField label="Loại CLS">
          <select value={s.category} onChange={(e) => set({ category: e.target.value as 'imaging' | 'lab' })} className={input}>
            <option value="lab">Xét nghiệm</option>
            <option value="imaging">Chẩn đoán hình ảnh</option>
          </select>
        </ReqField>
        <ReqField label="Phòng">
          <select value={s.room ?? 'Mặc định'} onChange={(e) => set({ room: e.target.value })} className={input}>
            <option>Mặc định</option>
          </select>
        </ReqField>
        <div>
          <span className="mb-1 block text-[12.5px] font-medium text-slate-700">Trả kết quả</span>
          <select value={s.returnsResult ? 'yes' : 'no'} onChange={(e) => set({ returnsResult: e.target.value === 'yes' })} className={input}>
            <option value="yes">Trả kết quả</option>
            <option value="no">Không trả kết quả</option>
          </select>
        </div>
        <div>
          <span className="mb-1 block text-[12.5px] font-medium text-slate-700">Loại in</span>
          <select value={s.printLayout ?? 'portrait'} onChange={(e) => set({ printLayout: e.target.value as 'portrait' | 'landscape' })} className={input}>
            <option value="landscape">In ngang</option>
            <option value="portrait">In dọc</option>
          </select>
        </div>
      </div>
    </Drawer>
  )
}

/** Cài đặt mẫu kết quả cho một dịch vụ (ảnh 132) */
function TemplateModal({ service, onClose }: { service: ParaclinicalServiceItem; onClose: () => void }) {
  const { resultTemplates } = useClinicState()
  const { setResultTemplates } = useClinicActions()
  const toast = useToast()
  const all = resultTemplates ?? []
  const mine = all.filter((t) => t.serviceId === service.id)
  const blank = (): ResultTemplate => ({ id: newId('rt'), name: '', serviceId: service.id, printTitle: 'PHIẾU KẾT QUẢ', description: '', conclusion: '', recommendation: '' })
  const [cur, setCur] = useState<ResultTemplate>(() => mine[0] ?? blank())
  const [touched, setTouched] = useState(false)
  const isNew = !all.some((t) => t.id === cur.id)
  const save = () => {
    setTouched(true)
    if (!cur.name.trim() || !cur.printTitle?.trim()) return
    setResultTemplates(isNew ? [cur, ...all] : all.map((t) => (t.id === cur.id ? cur : t)))
    toast({ title: 'Đã lưu mẫu kết quả', description: cur.name, tone: 'success' })
  }
  return (
    <Modal
      open
      onClose={onClose}
      size="2xl"
      title={`Cài đặt mẫu: ${service.name}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Button onClick={save} rightIcon={<Kbd tone="blue">F4</Kbd>}>
            Lưu mẫu
          </Button>
        </>
      }
    >
      <div className="grid min-h-[420px] grid-cols-[220px_1fr] gap-4">
        <div className="rounded-lg border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 px-2.5 py-2 text-[13px] font-semibold">
            Danh sách mẫu
            <Button size="sm" variant="outline" leftIcon={<PlusCircle className="h-3.5 w-3.5" />} onClick={() => setCur(blank())}>
              Thêm mới
            </Button>
          </div>
          {mine.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12.5px] text-slate-500">Vui lòng thêm mẫu</p>
          ) : (
            <ul className="p-1">
              {mine.map((t) => (
                <li key={t.id} className="flex items-center">
                  <button type="button" onClick={() => setCur(t)} className={cn('flex-1 truncate rounded px-2 py-1.5 text-left text-[13px]', t.id === cur.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50')}>
                    {t.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResultTemplates(all.filter((x) => x.id !== t.id))
                      if (cur.id === t.id) setCur(blank())
                    }}
                    className="rounded p-1 text-red-500 hover:bg-red-50"
                    aria-label={`Xoá mẫu ${t.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="border-t border-slate-100 px-2.5 py-2 text-[11.5px] text-slate-500">Mẫu có sẵn: {RESULT_TEMPLATES.length} mẫu dùng chung</p>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_160px_120px] gap-2">
            <label className="block">
              <span className="mb-1 block text-[12.5px] font-medium">
                Tên mẫu<span className="text-red-500">*</span>
              </span>
              <input value={cur.name} onChange={(e) => setCur((x) => ({ ...x, name: e.target.value }))} placeholder="Nhập tên gợi nhớ của mẫu." className={cn(input, touched && !cur.name.trim() && 'border-red-400')} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12.5px] font-medium">Nội dung phiếu in</span>
              <select className={input} defaultValue="both">
                <option value="both">Nội dung + hình ảnh</option>
                <option value="text">Chỉ nội dung</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[12.5px] font-medium">Bố cục in</span>
              <select className={input} defaultValue={service.printLayout ?? 'portrait'}>
                <option value="portrait">In dọc</option>
                <option value="landscape">In ngang</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-[12.5px] font-medium">
              Tên hiển thị trên phiếu in<span className="text-red-500">*</span>
            </span>
            <input value={cur.printTitle ?? ''} onChange={(e) => setCur((x) => ({ ...x, printTitle: e.target.value }))} className={input} />
          </label>
          <RichTextArea label="Mô tả" value={cur.description} onChange={(description) => setCur((x) => ({ ...x, description }))} placeholder="Soạn nội dung mô tả mẫu cho phiếu kết quả." className="min-h-[150px]" />
          <RichTextArea label="Kết luận" value={cur.conclusion} onChange={(conclusion) => setCur((x) => ({ ...x, conclusion }))} placeholder="Soạn kết luận mẫu sẽ được chèn vào phiếu kết quả." />
        </div>
      </div>
    </Modal>
  )
}

function ReqField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1 block text-[12.5px] font-medium text-slate-700">
        {label}
        <span className="text-red-500">*</span>
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </div>
  )
}
