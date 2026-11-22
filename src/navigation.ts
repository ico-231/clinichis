import {
  Activity,
  BarChart3,
  CalendarCheck2,
  CalendarClock,
  ClipboardPlus,
  FileHeart,
  FlaskConical,
  LayoutDashboard,
  LayoutGrid,
  NotebookPen,
  ScanLine,
  Settings2,
  Stethoscope,
  UserRoundCheck,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import type { RouteKey } from '@/store/types'

export interface NavItem {
  key: RouteKey
  label: string
  icon: LucideIcon
  /** màu biểu tượng (Tailwind text-*) */
  color: string
  /** Mô tả ngắn cho trang chờ */
  description: string
}

export interface NavSection {
  title?: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [{ key: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard, color: 'text-blue-600', description: 'Báo cáo tổng quan doanh thu, lượt khám và tỉ lệ khách mới/cũ.' }],
  },
  {
    title: 'Phòng khám',
    items: [
      { key: 'reception', label: 'Lễ tân', icon: UserRoundCheck, color: 'text-emerald-600', description: 'Tiếp nhận, xếp hàng đợi và thu phí người bệnh.' },
      { key: 'examination', label: 'Khám bệnh', icon: Stethoscope, color: 'text-blue-600', description: 'Danh sách chờ khám của bác sĩ, ghi nhận sinh hiệu, chẩn đoán ICD-10.' },
      { key: 'prescriptions', label: 'Kê đơn', icon: NotebookPen, color: 'text-sky-600', description: 'Kê đơn thuốc điện tử, mẫu đơn và lịch sử đơn của người bệnh.' },
    ],
  },
  // Đã bỏ khỏi menu theo yêu cầu: Tư vấn trực tuyến (Cuộc gọi, Tin nhắn), Thông tin phòng khám, Phát triển thương hiệu
  {
    title: 'Đặt khám thông minh',
    items: [
      { key: 'appointments', label: 'Lịch hẹn', icon: CalendarClock, color: 'text-amber-500', description: 'Lịch hẹn đặt trước qua website, ứng dụng, Zalo và tổng đài.' },
      { key: 'schedule', label: 'Lịch làm việc', icon: CalendarCheck2, color: 'text-blue-600', description: 'Ca làm việc của bác sĩ theo phòng khám và khung giờ.' },
    ],
  },
  {
    title: 'Hồ sơ',
    items: [
      { key: 'emr', label: 'Bệnh án điện tử', icon: FileHeart, color: 'text-emerald-600', description: 'Bệnh án điện tử theo từng lượt khám của người bệnh.' },
      { key: 'patients', label: 'Người bệnh', icon: UsersRound, color: 'text-indigo-500', description: 'Danh bạ người bệnh, thông tin hành chính và người giám hộ.' },
    ],
  },
  {
    title: 'Cận lâm sàng',
    items: [
      { key: 'imaging', label: 'Chẩn đoán hình ảnh', icon: ScanLine, color: 'text-blue-700', description: 'Chỉ định và trả kết quả siêu âm, X-quang.' },
      { key: 'lab', label: 'Xét nghiệm', icon: FlaskConical, color: 'text-red-500', description: 'Chỉ định, lấy mẫu và trả kết quả xét nghiệm.' },
      { key: 'paraclinical-reports', label: 'Báo cáo CLS', icon: Activity, color: 'text-green-600', description: 'Thống kê chỉ định và doanh thu cận lâm sàng.' },
      { key: 'paraclinical-settings', label: 'Thiết lập', icon: Settings2, color: 'text-slate-600', description: 'Danh mục dịch vụ cận lâm sàng, chỉ số và mẫu kết quả.' },
    ],
  },
  {
    title: 'Quản lý',
    items: [
      { key: 'reports', label: 'Báo cáo', icon: BarChart3, color: 'text-green-600', description: 'Báo cáo doanh thu, lượt khám và hiệu suất bác sĩ.' },
      { key: 'system', label: 'Hệ thống', icon: LayoutGrid, color: 'text-slate-700', description: 'Người dùng, phân quyền, danh mục và cấu hình hệ thống.' },
    ],
  },
]

export const NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items.map((item) => ({ ...item, section: s.title })))

export const findNav = (key: RouteKey) => NAV_ITEMS.find((i) => i.key === key)

/** Route còn trên menu – route đã bỏ (vd. lưu từ phiên cũ) được đưa về Lễ tân khi tải dữ liệu */
export const isNavRoute = (key: unknown): key is RouteKey => NAV_ITEMS.some((i) => i.key === key)

export const PlaceholderIcon = ClipboardPlus
