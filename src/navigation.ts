import {
  Activity,
  BarChart3,
  Building2,
  CalendarCheck2,
  CalendarClock,
  ClipboardPlus,
  FileHeart,
  FlaskConical,
  LayoutDashboard,
  LayoutGrid,
  MessageSquareText,
  NotebookPen,
  PhoneCall,
  ScanLine,
  Settings2,
  Sparkles,
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
  {
    title: 'Tư vấn trực tuyến',
    items: [
      { key: 'calls', label: 'Cuộc gọi', icon: PhoneCall, color: 'text-green-600', description: 'Lịch sử và hàng đợi cuộc gọi tư vấn video/thoại.' },
      { key: 'messages', label: 'Tin nhắn', icon: MessageSquareText, color: 'text-lime-600', description: 'Hộp thư tư vấn với người bệnh và người nhà.' },
    ],
  },
  {
    title: 'Đặt khám thông minh',
    items: [
      { key: 'appointments', label: 'Lịch hẹn', icon: CalendarClock, color: 'text-amber-500', description: 'Lịch hẹn đặt trước qua website, ứng dụng, Zalo và tổng đài.' },
      { key: 'schedule', label: 'Lịch làm việc', icon: CalendarCheck2, color: 'text-blue-600', description: 'Ca làm việc của bác sĩ theo phòng khám và khung giờ.' },
      { key: 'clinic-info', label: 'Thông tin phòng khám', icon: Building2, color: 'text-emerald-600', description: 'Hồ sơ phòng khám, chuyên khoa, dịch vụ và bảng giá.' },
      { key: 'branding', label: 'Phát triển thương hiệu', icon: Sparkles, color: 'text-orange-500', description: 'Trang đặt khám, đánh giá và chiến dịch chăm sóc khách hàng.' },
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
      { key: 'paraclinical-reports', label: 'Báo cáo', icon: Activity, color: 'text-green-600', description: 'Thống kê chỉ định và doanh thu cận lâm sàng.' },
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

export const findNav = (key: RouteKey) => NAV_ITEMS.find((i) => i.key === key)!

export const PlaceholderIcon = ClipboardPlus
