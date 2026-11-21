import type { ReactNode } from 'react'
import { PaymentStatusInline } from '@/components/clinic/StatusBadges'
import { CATEGORY_LABEL, doctorLabel, PAYMENT_STATUS_ORDER, roomById, SOURCE_LABEL } from '@/store/catalog'
import type { VisitRow } from '@/store/selectors'
import type { ReceptionColumnKey } from '@/store/types'
import { ageLabel, formatDateVN, formatTimeRange } from '@/lib/date'
import { formatNumber, formatPhone, normalizeText } from '@/lib/format'

export interface ReceptionColumn {
  key: ReceptionColumnKey
  label: string
  /** Nhãn trong menu ẩn/hiện cột */
  menuLabel: string
  width: number
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  render: (row: VisitRow) => ReactNode
  sortValue?: (row: VisitRow) => string | number
}

/** Tên tiếng Việt sắp xếp theo tên (chữ cuối) rồi họ đệm */
const vnNameKey = (name: string) => {
  const parts = normalizeText(name).split(/\s+/)
  return `${parts[parts.length - 1]} ${parts.slice(0, -1).join(' ')}`
}

export const RECEPTION_COLUMNS: ReceptionColumn[] = [
  {
    key: 'stt',
    label: 'STT',
    menuLabel: 'STT',
    width: 68,
    sortable: true,
    align: 'center',
    render: (r) => <span className="font-medium text-orange-700 tabular-nums">{r.visit.queueNumber}</span>,
    sortValue: (r) => r.visit.queueNumber,
  },
  {
    key: 'fullName',
    label: 'Họ và tên',
    menuLabel: 'Họ Và Tên',
    width: 196,
    sortable: true,
    render: (r) => (
      <span className="block truncate font-medium text-slate-900 uppercase">
        {r.patient.fullName}
      </span>
    ),
    sortValue: (r) => vnNameKey(r.patient.fullName),
  },
  {
    key: 'dob',
    label: 'Ngày sinh',
    menuLabel: 'Ngày Sinh',
    width: 164,
    sortable: true,
    render: (r) => (
      <span className="whitespace-nowrap text-slate-800 tabular-nums">
        {formatDateVN(r.patient.dob)}
        {r.patient.dob ? `  -  ${ageLabel(r.patient.dob, r.visit.date)}` : ''}
      </span>
    ),
    sortValue: (r) => r.patient.dob,
  },
  {
    key: 'gender',
    label: 'Giới tính',
    menuLabel: 'Giới Tính',
    width: 92,
    render: (r) =>
      r.patient.gender === 'male' ? (
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-slate-800">
          <span className="text-[13.5px] font-semibold text-blue-600">♂</span> Nam
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-slate-800">
          <span className="text-[13.5px] font-semibold text-pink-500">♀</span> Nữ
        </span>
      ),
  },
  {
    key: 'phone',
    label: 'Điện thoại',
    menuLabel: 'Điện Thoại',
    width: 124,
    render: (r) => <span className="whitespace-nowrap text-slate-900 tabular-nums">{formatPhone(r.patient.phone)}</span>,
  },
  {
    key: 'address',
    label: 'Địa chỉ',
    menuLabel: 'Địa Chỉ',
    width: 240,
    render: (r) => (
      <span className="block truncate" title={r.patient.address}>
        {r.patient.address}
      </span>
    ),
  },
  {
    key: 'visitDate',
    label: 'Ngày khám',
    menuLabel: 'Ngày Khám',
    width: 112,
    sortable: true,
    render: (r) => <span className="text-slate-900 tabular-nums">{formatDateVN(r.visit.date)}</span>,
    sortValue: (r) => r.visit.date + r.visit.time,
  },
  {
    key: 'visitTime',
    label: 'Giờ khám',
    menuLabel: 'Giờ Khám',
    width: 126,
    sortable: true,
    render: (r) => (
      <span className="whitespace-nowrap text-slate-900 tabular-nums">
        {formatTimeRange(r.visit.time, r.visit.endTime)}
      </span>
    ),
    sortValue: (r) => r.visit.time,
  },
  {
    key: 'doctor',
    label: 'Bác sĩ',
    menuLabel: 'Bác Sĩ',
    width: 190,
    sortable: true,
    render: (r) => <span className="block truncate">{doctorLabel(r.visit.doctorId)}</span>,
    sortValue: (r) => doctorLabel(r.visit.doctorId),
  },
  {
    key: 'fee',
    label: 'Phí',
    menuLabel: 'Phí',
    width: 90,
    sortable: true,
    align: 'right',
    render: (r) => <span className="font-medium text-slate-900 tabular-nums">{formatNumber(r.visit.fee)}</span>,
    sortValue: (r) => r.visit.fee,
  },
  {
    key: 'payment',
    label: 'Thanh toán',
    menuLabel: 'Thanh Toán',
    width: 150,
    sortable: true,
    render: (r) => <PaymentStatusInline status={r.visit.paymentStatus} />,
    sortValue: (r) => PAYMENT_STATUS_ORDER.indexOf(r.visit.paymentStatus),
  },
  {
    key: 'note',
    label: 'Ghi chú',
    menuLabel: 'Ghi Chú',
    width: 160,
    sortable: true,
    render: (r) =>
      r.visit.note ? (
        <span className="block truncate text-slate-700" title={r.visit.note}>
          {r.visit.note}
        </span>
      ) : null,
    sortValue: (r) => r.visit.note || '\uffff',
  },
  {
    key: 'patientType',
    label: 'Loại',
    menuLabel: 'Loại',
    width: 110,
    sortable: true,
    render: (r) => (
      <span className="font-semibold whitespace-nowrap text-slate-900">
        {r.visit.visitKind ?? 'Lịch khám'}
      </span>
    ),
    sortValue: (r) => r.visit.visitKind ?? 'Lịch khám',
  },
  {
    key: 'room',
    label: 'Phòng khám',
    menuLabel: 'Phòng Khám',
    width: 168,
    sortable: true,
    render: (r) => <span className="block truncate">{roomById(r.visit.roomId)?.name}</span>,
    sortValue: (r) => r.visit.roomId,
  },
  {
    key: 'category',
    label: 'Phân loại',
    menuLabel: 'Phân Loại',
    width: 124,
    sortable: true,
    render: (r) => CATEGORY_LABEL[r.visit.category],
    sortValue: (r) => r.visit.category,
  },
  {
    key: 'source',
    label: 'Nguồn',
    menuLabel: 'Nguồn',
    width: 150,
    sortable: true,
    render: (r) => <span className="block truncate">{SOURCE_LABEL[r.visit.source]}</span>,
    sortValue: (r) => r.visit.source,
  },
]
