import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Check,
  CreditCard,
  FlaskConical,
  IdCard,
  Landmark,
  Minus,
  Plus,
  Printer,
  ScanLine,
  Trash2,
  Wallet,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ConfirmDiscardModal } from '@/components/ui/ConfirmDiscardModal'
import { DocumentsEmptyIllustration } from '@/components/ui/EmptyState'
import { Modal, hasOpenOverlay } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Field'
import { Popover } from '@/components/ui/Popover'
import { useToast } from '@/components/ui/Toast'
import { useClinicActions, useClinicState } from '@/store/ClinicStore'
import {
  BLOOD_TYPES,
  ETHNICITIES,
  NATIONALITIES,
  OCCUPATIONS,
  PROVINCES,
} from '@/store/administrativeCatalog'
import { DOCTORS, PAYMENT_METHOD_LABEL, RELATION_LABEL, SERVICES, serviceById, toOptions } from '@/store/catalog'
import { addMinutesToTime, formatDateVN, nowTime, pad, todayISO } from '@/lib/date'
import { formatMoney, formatNumber, formatPhone, normalizeText } from '@/lib/format'
import { cn } from '@/lib/cn'
import { isTypingTarget } from '@/lib/keyboard'
import { ParaclinicalOrderModal } from './ParaclinicalOrderModal'
import {
  CardSectionHeader,
  FieldLabel,
  formatSummaryCounter,
  underlineBase,
  UnderlineDateField,
  UnderlineInput,
  UnderlineRadioGender,
  UnderlineSelect,
  VitalUnderlineInput,
} from './UnderlineControls'
import type {
  Gender,
  GuardianRelation,
  ParaclinicalOrderItem,
  Patient,
  PatientInput,
  PaymentMethod,
  RouteKey,
  Visit,
  VisitStatus,
  VitalSigns,
} from '@/store/types'

export interface IntakeInit {
  mode: 'new' | 'existing'
  patientId?: string
  prefillQuery?: string
}

interface ReceptionIntakeViewProps {
  init: IntakeInit
  onCancel: () => void
  /** print = true khi lưu bằng F8 (Đăng ký + in phiếu tiếp nhận) */
  onSaved: (visit: Visit, status: VisitStatus, opts?: { print?: boolean }) => void
}

interface PatientFormState {
  existingPatientId: string | null
  fullName: string
  gender: Gender
  cccd: string
  phone: string
  dob: string
  email: string
  bloodType: string
  insuranceNumber: string
  occupation: string
  ethnicity: string
  nationality: string
  province: string
  ward: string
  streetAddress: string
}

interface RelativeFormState {
  fullName: string
  phone: string
  dob: string
  gender: Gender
  relation: GuardianRelation
  address: string
}

interface VisitFormState {
  date: string
  time: string
  serviceId: string
  reason: string
  symptoms: string
  note: string
}

function roundedNowTime() {
  const [h, m] = nowTime().split(':').map(Number)
  return `${pad(h)}:${pad(m)}`
}

function buildInitialPatientState(init: IntakeInit, existing: Patient | undefined): PatientFormState {
  if (existing) {
    return {
      existingPatientId: existing.id,
      fullName: existing.fullName.toLocaleUpperCase('vi'),
      gender: existing.gender,
      cccd: existing.cccd ?? '',
      phone: existing.phone,
      dob: existing.dob,
      email: existing.email ?? '',
      bloodType: existing.bloodType ?? '',
      insuranceNumber: existing.insuranceNumber ?? '',
      occupation: existing.occupation ?? '',
      ethnicity: existing.ethnicity || 'Kinh',
      nationality: existing.nationality || 'Việt Nam',
      province: existing.province ?? '',
      ward: existing.ward ?? '',
      streetAddress: existing.streetAddress ?? existing.address ?? '',
    }
  }
  const q = init.prefillQuery?.trim() ?? ''
  const digitsOnly = /^\d+$/.test(q.replace(/\s+/g, ''))
  return {
    existingPatientId: null,
    fullName: digitsOnly ? '' : q.toLocaleUpperCase('vi'),
    gender: 'male',
    cccd: '',
    phone: digitsOnly ? q.replace(/\D/g, '').slice(0, 10) : '',
    dob: '',
    email: '',
    bloodType: '',
    insuranceNumber: '',
    occupation: '',
    ethnicity: 'Kinh',
    nationality: 'Việt Nam',
    province: '',
    ward: '',
    streetAddress: '',
  }
}

function buildInitialRelativeState(existing: Patient | undefined): RelativeFormState {
  if (existing?.relative) {
    return { ...existing.relative }
  }
  if (existing?.guardianName) {
    return {
      fullName: existing.guardianName.toLocaleUpperCase('vi'),
      phone: '',
      dob: '',
      gender: existing.guardianRelation === 'mother' ? 'female' : 'male',
      relation: existing.guardianRelation ?? 'other',
      address: existing.address ?? '',
    }
  }
  return {
    fullName: '',
    phone: '',
    dob: '',
    gender: 'male',
    relation: 'other',
    address: '',
  }
}

export function ReceptionIntakeView({ init, onCancel, onSaved }: ReceptionIntakeViewProps) {
  const { patients } = useClinicState()
  const { registerNewPatient, registerVisit, setNavigationGuard, forceNavigate } = useClinicActions()
  const toast = useToast()

  const initialExisting = init.patientId ? patients.find((p) => p.id === init.patientId) : undefined

  const [pForm, setPForm] = useState<PatientFormState>(() => buildInitialPatientState(init, initialExisting))
  const [rForm, setRForm] = useState<RelativeFormState>(() => buildInitialRelativeState(initialExisting))
  const [vForm, setVForm] = useState<VisitFormState>(() => ({
    date: todayISO(),
    time: roundedNowTime(),
    serviceId: 's0',
    reason: '',
    symptoms: '',
    note: '',
  }))
  const [vitals, setVitals] = useState<VitalSigns>({
    heightCm: '',
    weightKg: '',
    temperatureC: '',
    bpSystolic: '',
    bpDiastolic: '',
    pulse: '',
    respiratoryRate: '',
    spo2: '',
    bmi: '',
  })
  const [orders, setOrders] = useState<ParaclinicalOrderItem[]>([])
  /** Thu trước tại quầy: `amount` là số tiền ĐÃ xác nhận thu (chốt tại thời điểm bấm Xác nhận thu) */
  const [prepay, setPrepay] = useState<{ paid: boolean; method: PaymentMethod; amount: number }>({
    paid: false,
    method: 'cash',
    amount: 0,
  })

  const [clsModalOpen, setClsModalOpen] = useState(false)
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  // Xác nhận huỷ thay đổi (khi bấm quay lại hoặc chuyển menu bên trái)
  const [discardTarget, setDiscardTarget] = useState<'back' | RouteKey | null>(null)

  const initialSnapshotRef = useRef<string>('')
  const currentSnapshot = JSON.stringify({ pForm, rForm, vForm, vitals, orders, prepay })
  if (!initialSnapshotRef.current) {
    initialSnapshotRef.current = currentSnapshot
  }
  const isDirty = currentSnapshot !== initialSnapshotRef.current

  // Chặn chuyển route trên Sidebar nếu đang nhập dở
  useEffect(() => {
    setNavigationGuard((nextRoute) => {
      if (!isDirty) return true
      setDiscardTarget(nextRoute)
      return false
    })
    return () => setNavigationGuard(null)
  }, [isDirty, setNavigationGuard])

  const requestBack = useCallback(() => {
    if (isDirty) setDiscardTarget('back')
    else onCancel()
  }, [isDirty, onCancel])

  // Gợi ý tìm kiếm nhanh người bệnh khi gõ Họ và tên / SĐT
  const [patientLookupOpen, setPatientLookupOpen] = useState(false)
  const patientNameWrapRef = useRef<HTMLDivElement>(null)
  const matchingPatients = useMemo(() => {
    const raw = pForm.fullName.trim()
    if (raw.length < 2 || pForm.existingPatientId) return []
    const q = normalizeText(raw)
    const digits = raw.replace(/\D/g, '')
    return patients
      .filter((p) => {
        const hay = normalizeText(`${p.fullName} ${p.phone}`)
        return hay.includes(q) || (digits.length >= 3 && p.phone.includes(digits))
      })
      .slice(0, 6)
  }, [pForm.fullName, pForm.existingPatientId, patients])

  const applyExistingPatient = (p: Patient) => {
    setPForm(buildInitialPatientState({ mode: 'existing', patientId: p.id }, p))
    setRForm(buildInitialRelativeState(p))
    setPatientLookupOpen(false)
    toast({ title: `Đã nạp hồ sơ ${p.fullName}`, description: `${p.code} · ${formatPhone(p.phone)}`, tone: 'info' })
  }

  // Gợi ý tìm kiếm cho Người thân
  const [relativeLookupOpen, setRelativeLookupOpen] = useState(false)
  const relativeNameWrapRef = useRef<HTMLDivElement>(null)
  const matchingRelatives = useMemo(() => {
    const raw = rForm.fullName.trim()
    if (raw.length < 2) return []
    const q = normalizeText(raw)
    const digits = raw.replace(/\D/g, '')
    return patients
      .filter((p) => {
        const hay = normalizeText(`${p.fullName} ${p.phone}`)
        return hay.includes(q) || (digits.length >= 3 && p.phone.includes(digits))
      })
      .slice(0, 5)
  }, [rForm.fullName, patients])

  // Tự tính BMI khi có chiều cao & cân nặng
  const updateVitals = (patch: Partial<VitalSigns>) => {
    setVitals((prev) => {
      const next = { ...prev, ...patch }
      const h = parseFloat((next.heightCm ?? '').replace(',', '.'))
      const w = parseFloat((next.weightKg ?? '').replace(',', '.'))
      if (h > 30 && w > 0) {
        const bmi = w / ((h / 100) * (h / 100))
        next.bmi = bmi.toFixed(1)
      } else {
        next.bmi = ''
      }
      return next
    })
  }

  // Tính tổng tiền dưới thanh cố định
  const medicationTotal = 0 // Th
  const clsTotal = useMemo(
    () => orders.reduce((sum, o) => sum + o.unitPrice * o.quantity, 0),
    [orders],
  )
  const ckTotal = serviceById(vForm.serviceId)?.price ?? 0
  const grandTotal = medicationTotal + clsTotal + ckTotal
  /** Đã xác nhận thu nhưng tổng chi phí đổi sau đó (thêm/bớt CLS, đổi công khám) */
  const prepayMismatch = prepay.paid && prepay.amount !== grandTotal

  const wardOptions = useMemo(() => {
    const prov = PROVINCES.find((p) => p.name === pForm.province)
    const list = prov ? prov.wards : []
    return list.map((w) => ({ value: w, label: w }))
  }, [pForm.province])

  const validateAll = useCallback((pf: PatientFormState, vf: VisitFormState) => {
    const e: Record<string, string> = {}
    if (pf.fullName.trim().split(/\s+/).filter(Boolean).length < 2) {
      e.fullName = 'Nhập đầy đủ họ và tên'
    }
    const cleanPhone = pf.phone.replace(/\D/g, '')
    if (!/^0\d{9}$/.test(cleanPhone)) {
      e.phone = 'SĐT gồm 10 chữ số (bắt đầu bằng 0)'
    }
    if (!pf.dob) {
      e.dob = 'Chọn ngày sinh'
    } else if (pf.dob > todayISO()) {
      e.dob = 'Ngày sinh không hợp lệ'
    }
    if (!pf.province) {
      e.province = 'Chọn tỉnh/thành phố'
    }
    if (!vf.date) {
      e.visitDate = 'Chọn ngày khám'
    }
    if (!/^\d{2}:\d{2}$/.test(vf.time)) {
      e.visitTime = 'Chọn giờ khám'
    }
    return e
  }, [])

  useEffect(() => {
    if (!submitted) return
    setErrors(validateAll(pForm, vForm))
  }, [submitted, pForm, vForm, validateAll])

  const handleSubmit = useCallback(
    (targetStatus: VisitStatus, opts?: { print?: boolean }) => {
      setSubmitted(true)
      const errs = validateAll(pForm, vForm)
      setErrors(errs)
      if (Object.keys(errs).length > 0) {
        toast({
          title: 'Vui lòng kiểm tra các trường bắt buộc (*)',
          description: Object.values(errs)[0],
          tone: 'warning',
        })
        return
      }

      const composedAddress = [pForm.streetAddress.trim(), pForm.ward, pForm.province]
        .filter(Boolean)
        .join(', ')

      const hasRelative = rForm.fullName.trim().length > 0 || rForm.phone.trim().length > 0
      const patientInput: PatientInput = {
        fullName: pForm.fullName.trim().replace(/\s+/g, ' '),
        dob: pForm.dob,
        gender: pForm.gender,
        phone: pForm.phone.replace(/\D/g, ''),
        address: composedAddress,
        cccd: pForm.cccd.trim(),
        email: pForm.email.trim(),
        bloodType: pForm.bloodType,
        insuranceNumber: pForm.insuranceNumber.trim().toUpperCase(),
        occupation: pForm.occupation,
        ethnicity: pForm.ethnicity || 'Kinh',
        nationality: pForm.nationality || 'Việt Nam',
        province: pForm.province,
        ward: pForm.ward,
        streetAddress: pForm.streetAddress.trim(),
        relative: hasRelative
          ? {
              fullName: rForm.fullName.trim(),
              phone: rForm.phone.replace(/\D/g, ''),
              dob: rForm.dob,
              gender: rForm.gender,
              relation: rForm.relation,
              address: rForm.address.trim(),
            }
          : undefined,
        guardianName: rForm.fullName.trim() || undefined,
        guardianRelation: hasRelative ? rForm.relation : undefined,
      }

      const defaultDoc = DOCTORS[0]
      const visitInput = {
        date: vForm.date,
        time: vForm.time,
        endTime: addMinutesToTime(vForm.time, 30),
        serviceId: vForm.serviceId,
        consultationFee: ckTotal,
        paraclinicalOrders: orders,
        fee: grandTotal,
        doctorId: defaultDoc.id,
        roomId: defaultDoc.defaultRoomId,
        category: 'walk_in' as const,
        source: 'direct' as const,
        reason: vForm.reason.trim(),
        symptoms: vForm.symptoms.trim(),
        note: vForm.note.trim(),
        vitals,
        visitKind: (orders.length > 0 && ckTotal === 0 && !vForm.reason.trim() ? 'Cận lâm sàng' : 'Lịch khám') as Visit['visitKind'],
        initialStatus: targetStatus,
        checkInNow: targetStatus !== 'registered',
        payNow: prepay.paid,
        // Chỉ ghi nhận đúng số đã xác nhận thu; nếu tổng tăng sau đó, phần chênh còn nợ (thu một phần)
        paidAmountNow: Math.min(prepay.amount, grandTotal),
        payMethod: prepay.method,
      }

      let createdVisit: Visit
      if (pForm.existingPatientId) {
        createdVisit = registerVisit(pForm.existingPatientId, visitInput, patientInput)
      } else {
        createdVisit = registerNewPatient(patientInput, visitInput).visit
      }

      toast({
        title:
          targetStatus === 'in_progress'
            ? `Đã chuyển ${patientInput.fullName} vào khám`
            : `Đã đăng ký khám: ${patientInput.fullName}`,
        description: `${createdVisit.code} · STT ${createdVisit.queueNumber} · ${formatDateVN(createdVisit.date)} ${createdVisit.time}`,
        tone: 'success',
      })
      onSaved(createdVisit, targetStatus, opts)
    },
    [
      validateAll,
      pForm,
      vForm,
      rForm,
      ckTotal,
      orders,
      grandTotal,
      vitals,
      prepay,
      registerVisit,
      registerNewPatient,
      toast,
      onSaved,
    ],
  )

  // Phím tắt trên màn hình Tiếp nhận: Shift+C, F3, F8, F9, F10
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (hasOpenOverlay()) return
      if (e.shiftKey && e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey && !e.altKey && !isTypingTarget(e.target)) {
        e.preventDefault()
        setClsModalOpen(true)
        return
      }
      if (e.key === 'F3') {
        e.preventDefault()
        setPayModalOpen(true)
      } else if (e.key === 'F8') {
        e.preventDefault()
        handleSubmit('registered', { print: true })
      } else if (e.key === 'F9') {
        e.preventDefault()
        handleSubmit('in_progress')
      } else if (e.key === 'F10') {
        e.preventDefault()
        handleSubmit('registered')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleSubmit])

  const updateOrderQty = (id: string, delta: number) => {
    setOrders((list) => list.map((o) => (o.id === id ? { ...o, quantity: Math.max(1, o.quantity + delta) } : o)))
  }

  return (
    <div className="flex h-full flex-col bg-slate-100/75">
      <PageHeader
        title="Lễ tân"
        subtitle={
          pForm.existingPatientId
            ? `Nhận bệnh cũ · ${pForm.fullName}`
            : 'Tiếp nhận người bệnh mới'
        }
        actions={
          <div className="flex items-center gap-2">
            {pForm.existingPatientId && (
              <button
                type="button"
                onClick={() => setPForm((f) => ({ ...f, existingPatientId: null }))}
                className="rounded-md bg-blue-50 px-2.5 py-1 text-[12px] font-medium text-blue-700 hover:bg-blue-100"
              >
                Tách thành hồ sơ mới
              </button>
            )}
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
              onClick={requestBack}
            >
              Danh sách lễ tân
            </Button>
          </div>
        }
      />

      {/* Nội dung cuộn 3 hàng thẻ */}
      <div className="thin-scroll flex-1 space-y-3 overflow-y-auto p-3">
        {/* HÀNG 1: THÔNG TIN (2/3) + THÔNG TIN NGƯỜI THÂN (1/3) */}
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[2fr_1fr]">
          {/* THÔNG TIN */}
          <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <CardSectionHeader title="Thông tin" accent="blue" />
            <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-12">
              {/* Họ và tên + gợi ý tìm kiếm */}
              <div ref={patientNameWrapRef} className="sm:col-span-6">
                <UnderlineInput
                  label="Họ và tên"
                  required
                  autoFocus
                  placeholder="HỌ VÀ TÊN"
                  value={pForm.fullName}
                  error={errors.fullName}
                  helper="Nhập tên hoặc số điện thoại để tìm kiếm."
                  onFocus={() => setPatientLookupOpen(true)}
                  onChange={(e) => {
                    setPForm((f) => ({
                      ...f,
                      existingPatientId: null,
                      fullName: e.target.value.toLocaleUpperCase('vi'),
                    }))
                    setPatientLookupOpen(true)
                  }}
                />
                <Popover
                  open={patientLookupOpen && matchingPatients.length > 0}
                  onClose={() => setPatientLookupOpen(false)}
                  anchorRef={patientNameWrapRef}
                  matchWidth
                  className="py-1"
                >
                  <p className="px-3 py-1 text-[11px] font-medium text-slate-500">
                    Hồ sơ người bệnh đã tồn tại — chọn để tự động điền:
                  </p>
                  {matchingPatients.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyExistingPatient(p)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[12.5px] hover:bg-slate-50"
                    >
                      <span className="font-semibold text-slate-900 uppercase">{p.fullName}</span>
                      <span className="text-slate-500 tabular-nums">
                        {formatPhone(p.phone)} · {formatDateVN(p.dob)}
                      </span>
                    </button>
                  ))}
                </Popover>
              </div>

              <UnderlineRadioGender
                className="sm:col-span-3"
                value={pForm.gender}
                onChange={(gender) => setPForm((f) => ({ ...f, gender }))}
              />

              <UnderlineInput
                wrapperClassName="sm:col-span-3"
                label="CCCD"
                placeholder="Số CCCD"
                inputMode="numeric"
                value={pForm.cccd}
                onChange={(e) => setPForm((f) => ({ ...f, cccd: e.target.value.replace(/\D/g, '').slice(0, 12) }))}
              />

              {/* Dòng 2 */}
              <UnderlineInput
                wrapperClassName="sm:col-span-3"
                label="Điện thoại"
                required
                inputMode="tel"
                placeholder="Số điện thoại liên hệ"
                value={pForm.phone}
                error={errors.phone}
                onChange={(e) =>
                  setPForm((f) => ({ ...f, phone: e.target.value.replace(/[^\d\s]/g, '').slice(0, 13) }))
                }
              />

              <UnderlineDateField
                className="sm:col-span-3"
                label="Ngày sinh"
                required
                max={todayISO()}
                value={pForm.dob}
                error={errors.dob}
                onChange={(dob) => setPForm((f) => ({ ...f, dob }))}
              />

              <UnderlineInput
                wrapperClassName="sm:col-span-3"
                label="Email"
                type="email"
                placeholder="Email"
                value={pForm.email}
                onChange={(e) => setPForm((f) => ({ ...f, email: e.target.value }))}
              />

              <UnderlineSelect
                className="sm:col-span-3"
                label="Nhóm máu"
                placeholder="Chọn nhóm máu"
                value={pForm.bloodType}
                options={BLOOD_TYPES.map((b) => ({ value: b, label: `Nhóm máu ${b}` }))}
                onChange={(bloodType) => setPForm((f) => ({ ...f, bloodType }))}
              />

              {/* Dòng 3 */}
              <UnderlineInput
                wrapperClassName="sm:col-span-3"
                label="Mã BHYT"
                placeholder="Mã BHYT"
                value={pForm.insuranceNumber}
                onChange={(e) =>
                  setPForm((f) => ({ ...f, insuranceNumber: e.target.value.toUpperCase().slice(0, 15) }))
                }
              />

              <UnderlineSelect
                className="sm:col-span-3"
                label="Nghề nghiệp"
                placeholder="Nghề nghiệp"
                searchable
                value={pForm.occupation}
                options={OCCUPATIONS.map((o) => ({ value: o, label: o }))}
                onChange={(occupation) => setPForm((f) => ({ ...f, occupation }))}
              />

              <UnderlineSelect
                className="sm:col-span-3"
                label="Dân tộc"
                searchable
                value={pForm.ethnicity}
                options={ETHNICITIES.map((et) => ({ value: et, label: et }))}
                onChange={(ethnicity) => setPForm((f) => ({ ...f, ethnicity }))}
              />

              <UnderlineSelect
                className="sm:col-span-3"
                label="Quốc gia"
                searchable
                value={pForm.nationality}
                options={NATIONALITIES.map((na) => ({ value: na, label: na }))}
                onChange={(nationality) => setPForm((f) => ({ ...f, nationality }))}
              />

              {/* Dòng 4 */}
              <UnderlineSelect
                className="sm:col-span-3"
                label="Tỉnh/Thành phố"
                required
                searchable
                placeholder="Chọn tỉnh/thành phố"
                value={pForm.province}
                error={errors.province}
                options={PROVINCES.map((p) => ({ value: p.name, label: p.name }))}
                onChange={(province) => setPForm((f) => ({ ...f, province, ward: '' }))}
              />

              <UnderlineSelect
                className="sm:col-span-3"
                label="Phường/Xã"
                searchable
                placeholder="Chọn phường/xã"
                disabled={!pForm.province}
                value={pForm.ward}
                options={wardOptions}
                onChange={(ward) => setPForm((f) => ({ ...f, ward }))}
              />

              <UnderlineInput
                wrapperClassName="sm:col-span-6"
                label="Địa chỉ"
                placeholder="Số nhà, tên đường...."
                value={pForm.streetAddress}
                onChange={(e) => setPForm((f) => ({ ...f, streetAddress: e.target.value }))}
              />
            </div>
          </section>

          {/* THÔNG TIN NGƯỜI THÂN */}
          <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <CardSectionHeader title="Thông tin người thân" accent="orange" />
            <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
              <div ref={relativeNameWrapRef} className="sm:col-span-2">
                <UnderlineInput
                  label="Họ và tên"
                  placeholder="HỌ VÀ TÊN"
                  helper="Nhập tên hoặc số điện thoại để tìm kiếm."
                  value={rForm.fullName}
                  onFocus={() => setRelativeLookupOpen(true)}
                  onChange={(e) => {
                    setRForm((f) => ({ ...f, fullName: e.target.value.toLocaleUpperCase('vi') }))
                    setRelativeLookupOpen(true)
                  }}
                  rightSlot={
                    <button
                      type="button"
                      title="Sao chép địa chỉ & SĐT của người bệnh"
                      onClick={() => {
                        const addr = [pForm.streetAddress, pForm.ward, pForm.province].filter(Boolean).join(', ')
                        setRForm((f) => ({
                          ...f,
                          phone: f.phone || pForm.phone,
                          address: f.address || addr,
                        }))
                        toast({ title: 'Đã sao chép liên hệ sang Người thân', tone: 'info' })
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    >
                      <IdCard className="h-3.5 w-3.5" />
                    </button>
                  }
                />
                <Popover
                  open={relativeLookupOpen && matchingRelatives.length > 0}
                  onClose={() => setRelativeLookupOpen(false)}
                  anchorRef={relativeNameWrapRef}
                  matchWidth
                  className="py-1"
                >
                  {matchingRelatives.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setRForm((f) => ({
                          ...f,
                          fullName: p.fullName.toLocaleUpperCase('vi'),
                          phone: p.phone,
                          dob: p.dob,
                          gender: p.gender,
                          address: p.address,
                        }))
                        setRelativeLookupOpen(false)
                      }}
                      className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[12.5px] hover:bg-slate-50"
                    >
                      <span className="font-medium text-slate-900 uppercase">{p.fullName}</span>
                      <span className="text-slate-500 tabular-nums">{formatPhone(p.phone)}</span>
                    </button>
                  ))}
                </Popover>
              </div>

              <UnderlineInput
                label="Điện thoại"
                inputMode="tel"
                placeholder="Số điện thoại liên hệ"
                value={rForm.phone}
                onChange={(e) =>
                  setRForm((f) => ({ ...f, phone: e.target.value.replace(/[^\d\s]/g, '').slice(0, 13) }))
                }
              />

              <UnderlineDateField
                label="Ngày sinh"
                max={todayISO()}
                value={rForm.dob}
                onChange={(dob) => setRForm((f) => ({ ...f, dob }))}
              />

              <UnderlineRadioGender
                value={rForm.gender}
                onChange={(gender) => setRForm((f) => ({ ...f, gender }))}
              />

              <UnderlineSelect
                label="Mối quan hệ"
                value={rForm.relation}
                options={toOptions(RELATION_LABEL)}
                onChange={(relation) => setRForm((f) => ({ ...f, relation }))}
              />

              <UnderlineInput
                wrapperClassName="sm:col-span-2"
                label="Địa chỉ"
                placeholder="Số nhà, tên đường...."
                value={rForm.address}
                onChange={(e) => setRForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
          </section>
        </div>

        {/* HÀNG 2: THÔNG TIN NHẬN BỆNH (2/3) + CHỈ SỐ SINH HIỆU (1/3) */}
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[2fr_1fr]">
          {/* THÔNG TIN NHẬN BỆNH */}
          <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <CardSectionHeader title="Thông tin nhận bệnh" accent="blue" />
            <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-12">
              <UnderlineDateField
                className="sm:col-span-4"
                label="Ngày khám"
                required
                value={vForm.date}
                error={errors.visitDate}
                onChange={(date) => setVForm((f) => ({ ...f, date }))}
              />

              <div className="sm:col-span-2">
                <FieldLabel label="Giờ khám" required />
                <input
                  type="time"
                  value={vForm.time}
                  onChange={(e) => setVForm((f) => ({ ...f, time: e.target.value }))}
                  className={cn(underlineBase, 'mt-0.5 tabular-nums', errors.visitTime && 'border-red-400')}
                />
                {errors.visitTime && <p className="mt-1 text-[11px] text-red-500">{errors.visitTime}</p>}
              </div>

              <UnderlineSelect
                className="sm:col-span-6"
                label="Công khám"
                required
                iconType="updown"
                value={vForm.serviceId}
                options={SERVICES.map((s) => ({
                  value: s.id,
                  label: `${s.name} (${formatNumber(s.price)} đ)`,
                }))}
                onChange={(serviceId) => setVForm((f) => ({ ...f, serviceId }))}
              />

              <UnderlineInput
                wrapperClassName="sm:col-span-12"
                label="Lý do khám"
                placeholder=""
                value={vForm.reason}
                onChange={(e) => setVForm((f) => ({ ...f, reason: e.target.value }))}
              />

              <UnderlineInput
                wrapperClassName="sm:col-span-6"
                label="Triệu chứng"
                placeholder=""
                value={vForm.symptoms}
                onChange={(e) => setVForm((f) => ({ ...f, symptoms: e.target.value }))}
              />

              <UnderlineInput
                wrapperClassName="sm:col-span-6"
                label="Ghi chú lượt khám"
                placeholder=""
                value={vForm.note}
                onChange={(e) => setVForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
          </section>

          {/* CHỈ SỐ SINH HIỆU */}
          <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <CardSectionHeader title="Chỉ số sinh hiệu" accent="orange" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
              <VitalUnderlineInput
                label="Chiều cao"
                unit="cm"
                value={vitals.heightCm ?? ''}
                onChange={(heightCm) => updateVitals({ heightCm })}
              />
              <VitalUnderlineInput
                label="Cân nặng"
                unit="kg"
                value={vitals.weightKg ?? ''}
                onChange={(weightKg) => updateVitals({ weightKg })}
              />
              <VitalUnderlineInput
                label="Nhiệt độ"
                unit="°C"
                value={vitals.temperatureC ?? ''}
                onChange={(temperatureC) => updateVitals({ temperatureC })}
              />

              {/* Huyết áp tâm thu / tâm trương */}
              <div>
                <FieldLabel label="Huyết áp" />
                <div className={cn(underlineBase, 'mt-0.5 flex items-center justify-between gap-1')}>
                  <div className="flex min-w-0 flex-1 items-center gap-1 text-[13px] tabular-nums">
                    <input
                      value={vitals.bpSystolic ?? ''}
                      inputMode="numeric"
                      placeholder=""
                      onChange={(e) => updateVitals({ bpSystolic: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                      className="w-9 bg-transparent text-slate-900 outline-none"
                    />
                    {(vitals.bpSystolic || vitals.bpDiastolic) && <span className="text-slate-400">/</span>}
                    <input
                      value={vitals.bpDiastolic ?? ''}
                      inputMode="numeric"
                      placeholder=""
                      onChange={(e) => updateVitals({ bpDiastolic: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                      className="w-9 bg-transparent text-slate-900 outline-none"
                    />
                  </div>
                  <span className="shrink-0 text-[11.5px] text-slate-500">mmHg / mmHg</span>
                </div>
              </div>

              <VitalUnderlineInput
                label="Mạch"
                unit="lần/phút"
                value={vitals.pulse ?? ''}
                onChange={(pulse) => updateVitals({ pulse })}
              />
              <VitalUnderlineInput
                label="Nhịp thở"
                unit="lần/phút"
                value={vitals.respiratoryRate ?? ''}
                onChange={(respiratoryRate) => updateVitals({ respiratoryRate })}
              />
              <VitalUnderlineInput
                label="SpO2"
                unit="%"
                value={vitals.spo2 ?? ''}
                onChange={(spo2) => updateVitals({ spo2 })}
              />
              <VitalUnderlineInput label="BMI" unit="kg/m²" value={vitals.bmi ?? ''} readOnly />
            </div>
          </section>
        </div>

        {/* HÀNG 3: CẬN LÂM SÀNG */}
        <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <CardSectionHeader
            title="Cận lâm sàng"
            accent="orange"
            rightSlot={
              orders.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setClsModalOpen(true)}
                  className="inline-flex h-8 items-center gap-2 rounded-lg bg-blue-50 px-3 text-[12.5px] font-semibold text-blue-600 transition hover:bg-blue-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Thêm chỉ định</span>
                  <kbd className="rounded bg-blue-600 px-1.5 py-0.5 font-sans text-[10.5px] font-semibold text-white">
                    Shift + C
                  </kbd>
                </button>
              ) : null
            }
          />

          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-slate-50/30 px-4 py-9 text-center">
              <DocumentsEmptyIllustration />
              <p className="mt-2 text-[13px] font-medium text-slate-700">
                Chưa có chỉ định cận lâm sàng. Thêm chỉ định để bắt đầu.
              </p>
              <button
                type="button"
                onClick={() => setClsModalOpen(true)}
                className="mt-3.5 inline-flex h-8.5 items-center gap-2 rounded-lg bg-blue-50 px-3.5 text-[12.5px] font-semibold text-blue-600 transition hover:bg-blue-100"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Thêm chỉ định</span>
                <kbd className="rounded bg-blue-600 px-1.5 py-0.5 font-sans text-[10.5px] font-semibold text-white">
                  Shift + C
                </kbd>
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-slate-50 text-[12px] text-slate-600">
                  <tr className="border-b border-slate-200">
                    <th className="px-3 py-2 font-semibold">Chỉ định</th>
                    <th className="px-3 py-2 font-semibold">Nơi thực hiện</th>
                    <th className="px-3 py-2 font-semibold">Hướng dẫn người bệnh</th>
                    <th className="w-28 px-3 py-2 text-center font-semibold">Số lượng</th>
                    <th className="w-32 px-3 py-2 text-right font-semibold">Thành tiền</th>
                    <th className="w-10 px-2 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                              item.category === 'imaging'
                                ? 'bg-sky-50 text-sky-600'
                                : 'bg-orange-50 text-orange-700',
                            )}
                          >
                            {item.category === 'imaging' ? (
                              <ScanLine className="h-3.5 w-3.5" />
                            ) : (
                              <FlaskConical className="h-3.5 w-3.5" />
                            )}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-900">{item.name}</p>
                            <p className="text-[11px] text-slate-500">{item.groupLabel}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-[12.5px] text-slate-600">{item.providerName}</td>
                      <td className="px-3 py-2.5">
                        <input
                          value={item.instruction}
                          onChange={(e) =>
                            setOrders((list) =>
                              list.map((o) => (o.id === item.id ? { ...o, instruction: e.target.value } : o)),
                            )
                          }
                          placeholder="Thêm hướng dẫn..."
                          className="h-7 w-full rounded border border-transparent bg-transparent px-2 text-[12.5px] text-slate-700 outline-none placeholder:text-slate-400 hover:border-slate-200 focus:border-blue-500 focus:bg-white"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="inline-flex h-7 items-center rounded-md border border-slate-200 bg-white">
                          <button
                            type="button"
                            disabled={item.quantity <= 1}
                            onClick={() => updateOrderQty(item.id, -1)}
                            aria-label="Giảm số lượng"
                            className="flex h-full w-6 items-center justify-center text-slate-500 hover:text-slate-900 disabled:opacity-35"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="min-w-5 text-center text-[12.5px] font-semibold tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateOrderQty(item.id, 1)}
                            aria-label="Tăng số lượng"
                            className="flex h-full w-6 items-center justify-center text-slate-500 hover:text-slate-900"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-emerald-700 tabular-nums">
                        {formatMoney(item.unitPrice * item.quantity)}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => setOrders((list) => list.filter((o) => o.id !== item.id))}
                          className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                          aria-label="Xoá"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* THANH CỐ ĐỊNH BÊN DƯỚI: Th / CLS / CK / TT + Thu tiền F3 | In phiếu F8 | Khám bệnh F9 | Đăng ký khám F10 */}
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-4 text-[13.5px] font-semibold text-slate-900 tabular-nums">
            <span>Th: {formatSummaryCounter(medicationTotal)}</span>
            <span>CLS: {formatSummaryCounter(clsTotal)}</span>
            <span>CK: {formatSummaryCounter(ckTotal)}</span>
            <span>TT: {formatSummaryCounter(grandTotal)}</span>
          </div>

          <button
            type="button"
            onClick={() => setPayModalOpen(true)}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] font-semibold transition',
              prepayMismatch
                ? 'border-amber-300 bg-amber-50 text-amber-700'
                : prepay.paid
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-blue-300 bg-white text-blue-600 hover:bg-blue-50/50',
            )}
            title={prepayMismatch ? 'Tổng chi phí đã thay đổi sau khi xác nhận thu. Mở lại để thu theo tổng mới.' : undefined}
          >
            {prepayMismatch ? <AlertTriangle className="h-3.5 w-3.5" /> : prepay.paid && <Check className="h-3.5 w-3.5" />}
            <span>
              {prepayMismatch
                ? `Đã thu ${formatMoney(prepay.amount)} · TT đổi`
                : prepay.paid
                  ? `Đã thu (${PAYMENT_METHOD_LABEL[prepay.method]})`
                  : 'Thu tiền'}
            </span>
            <kbd
              className={cn(
                'rounded px-1.5 py-0.5 font-sans text-[11px] font-semibold',
                prepayMismatch
                  ? 'bg-amber-200/70 text-amber-800'
                  : prepay.paid
                    ? 'bg-emerald-200/70 text-emerald-800'
                    : 'bg-blue-50 text-blue-600',
              )}
            >
              F3
            </kbd>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleSubmit('registered', { print: true })}
            title="Đăng ký khám và in phiếu tiếp nhận"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>In phiếu tiếp nhận</span>
            <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-sans text-[11px] text-slate-500">
              F8
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => handleSubmit('in_progress')}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3.5 text-[13px] font-semibold text-white shadow-xs transition hover:bg-blue-700"
          >
            <span>Khám bệnh</span>
            <kbd className="rounded bg-blue-800/70 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-white">
              F9
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => handleSubmit('registered')}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-3.5 text-[13px] font-semibold text-white shadow-xs transition hover:bg-emerald-600"
          >
            <span>Đăng ký khám</span>
            <kbd className="rounded bg-emerald-700/70 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-white">
              F10
            </kbd>
          </button>
        </div>
      </footer>

      {/* Modal chỉ định cận lâm sàng */}
      <ParaclinicalOrderModal
        open={clsModalOpen}
        initialOrders={orders}
        onClose={() => setClsModalOpen(false)}
        onConfirm={(nextOrders) => {
          setOrders(nextOrders)
          setClsModalOpen(false)
        }}
      />

      {/* Modal thu tiền ngay tại bước tiếp nhận (F3) */}
      <Modal
        open={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        size="sm"
        title="Thu tiền tiếp nhận"
        description="Xác nhận thu phí trước khi hoàn tất đăng ký khám"
        footer={
          <>
            {prepay.paid && (
              <Button
                variant="ghost"
                onClick={() => {
                  setPrepay((p) => ({ ...p, paid: false }))
                  setPayModalOpen(false)
                }}
              >
                Huỷ thu trước
              </Button>
            )}
            <Button variant="outline" onClick={() => setPayModalOpen(false)}>
              Đóng
            </Button>
            <Button
              variant="success"
              onClick={() => {
                setPrepay((p) => ({ ...p, paid: true, amount: grandTotal }))
                setPayModalOpen(false)
                toast({
                  title: `Đã ghi nhận thu ${formatMoney(grandTotal)}`,
                  description: `Hình thức: ${PAYMENT_METHOD_LABEL[prepay.method]}`,
                })
              }}
            >
              Xác nhận thu {formatMoney(grandTotal)}
            </Button>
          </>
        }
      >
        <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-[13px]">
          <div className="flex justify-between px-3 py-2">
            <dt className="text-slate-500">Công khám (CK)</dt>
            <dd className="font-medium text-slate-800 tabular-nums">{formatMoney(ckTotal)}</dd>
          </div>
          <div className="flex justify-between px-3 py-2">
            <dt className="text-slate-500">Cận lâm sàng (CLS · {orders.length} chỉ định)</dt>
            <dd className="font-medium text-slate-800 tabular-nums">{formatMoney(clsTotal)}</dd>
          </div>
          <div className="flex justify-between bg-slate-50 px-3 py-2.5">
            <dt className="font-semibold text-slate-800">Tổng phải thu (TT)</dt>
            <dd className="text-[15px] font-bold text-emerald-700 tabular-nums">{formatMoney(grandTotal)}</dd>
          </div>
        </dl>

        {prepayMismatch && (
          <div className="mt-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Đã xác nhận thu {formatMoney(prepay.amount)} trước khi tổng chi phí thay đổi. Bấm “Xác nhận thu” để thu theo tổng mới;
              nếu không, lượt khám sẽ được lưu với số đã thu{prepay.amount < grandTotal ? ' (thu một phần)' : ' (tối đa bằng tổng mới)'}.
            </span>
          </div>
        )}

        <div className="mt-4">
          <Segmented
            label="Hình thức thanh toán"
            value={prepay.method}
            onChange={(method) => setPrepay((p) => ({ ...p, method }))}
            options={[
              { value: 'cash', label: 'Tiền mặt', icon: <Banknote className="h-3.5 w-3.5" /> },
              { value: 'transfer', label: 'Chuyển khoản', icon: <Landmark className="h-3.5 w-3.5" /> },
              { value: 'card', label: 'Thẻ', icon: <CreditCard className="h-3.5 w-3.5" /> },
              { value: 'ewallet', label: 'Ví', icon: <Wallet className="h-3.5 w-3.5" /> },
            ]}
          />
        </div>
      </Modal>

      {/* Hộp thoại xác nhận huỷ thay đổi */}
      <ConfirmDiscardModal
        open={discardTarget !== null}
        onCancel={() => setDiscardTarget(null)}
        onConfirm={() => {
          const target = discardTarget
          setDiscardTarget(null)
          if (target === 'back') onCancel()
          else if (target) forceNavigate(target)
        }}
      />
    </div>
  )
}
