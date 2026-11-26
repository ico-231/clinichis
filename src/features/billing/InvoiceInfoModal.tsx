import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { cn } from '@/lib/cn'
import type { InvoiceInfo, Patient } from '@/store/types'

export const emptyInvoice = (patient: Patient): InvoiceInfo => ({
  type: 'personal',
  name: patient.relative?.fullName || patient.guardianName || patient.fullName,
  taxCode: '',
  email: patient.email ?? '',
  phone: patient.relative?.phone || patient.phone,
  address: patient.address,
  status: 'not_issued',
})

const input =
  'h-9 w-full rounded-md border border-line bg-surface px-3 text-[13px] outline-none placeholder:text-ink-5 focus:border-brand focus:ring-2 focus:ring-brand/15'

/** Thông tin phát hành hoá đơn điện tử: Cá nhân / Doanh nghiệp (ảnh 032, 033) */
export function InvoiceInfoModal({ initial, onClose, onSave }: { initial: InvoiceInfo; onClose: () => void; onSave: (inv: InvoiceInfo) => void }) {
  const [inv, setInv] = useState<InvoiceInfo>(initial)
  const [touched, setTouched] = useState(false)
  const set = (p: Partial<InvoiceInfo>) => setInv((v) => ({ ...v, ...p }))
  const company = inv.type === 'company'

  const errors: Record<string, string> = {}
  if (!inv.name.trim()) errors.name = company ? 'Nhập tên công ty' : 'Nhập họ và tên'
  if (company && !/^\d{10}(-\d{3})?$/.test(inv.taxCode.trim())) errors.taxCode = 'Mã số thuế gồm 10 số (hoặc 10 số + "-" + 3 số)'
  if (!company && inv.taxCode.trim() && !/^\d{10}(\d{2})?(-\d{3})?$/.test(inv.taxCode.trim())) errors.taxCode = 'Mã số thuế không hợp lệ'
  if (inv.email.trim() && !/^\S+@\S+\.\S+$/.test(inv.email.trim())) errors.email = 'Email không hợp lệ'
  if (inv.phone.trim() && !/^0\d{9}$/.test(inv.phone.replace(/\D/g, ''))) errors.phone = 'Số điện thoại gồm 10 chữ số'

  const save = () => {
    setTouched(true)
    if (Object.keys(errors).length) return
    onSave({ ...inv, name: inv.name.trim(), taxCode: inv.taxCode.trim(), email: inv.email.trim(), phone: inv.phone.replace(/\D/g, ''), address: inv.address.trim() })
  }

  const field = (key: keyof InvoiceInfo, label: string, placeholder: string, required = false, hint?: string) => (
    <label className="block">
      <span className="mb-1 block text-[13px] font-medium text-ink">
        {label}
        {required && <span className="ml-0.5 text-danger-ink">*</span>}
      </span>
      <input value={String(inv[key] ?? '')} placeholder={placeholder} onChange={(e) => set({ [key]: e.target.value })} className={cn(input, touched && errors[key] && 'border-danger')} />
      {touched && errors[key] ? <span className="mt-1 block text-xs text-danger-ink">{errors[key]}</span> : hint && <span className="mt-1 block text-xs text-ink-4">{hint}</span>}
    </label>
  )

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Thông tin phát hành hoá đơn điện tử"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Huỷ bỏ
          </Button>
          <Button onClick={save}>Lưu thông tin</Button>
        </>
      }
    >
      <div className="mb-4 flex justify-center">
        <Tabs
          variant="pill"
          value={inv.type}
          onChange={(type) => set({ type, name: type === 'company' ? '' : initial.type === 'personal' ? initial.name : '', taxCode: '' })}
          items={[
            { value: 'personal', label: 'Cá nhân' },
            { value: 'company', label: 'Doanh nghiệp' },
          ]}
        />
      </div>
      <div className="space-y-3">
        {company ? (
          <>
            {field('taxCode', 'Mã số thuế', 'Nhập mã số thuế', true)}
            {field('name', 'Tên công ty', 'Nhập tên doanh nghiệp', true)}
          </>
        ) : (
          <>
            {field('name', 'Họ và tên', 'Nhập họ và tên', true)}
            {field('taxCode', 'Mã số thuế', 'Nhập mã số thuế (nếu có)')}
          </>
        )}
        {field('email', 'Email', 'Nhập email', false, 'Hoá đơn điện tử sẽ được gửi đến email này')}
        {field('phone', 'Số điện thoại', 'Nhập số điện thoại')}
        {field('address', 'Địa chỉ', 'Nhập địa chỉ')}
      </div>
    </Modal>
  )
}
