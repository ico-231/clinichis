/**
 * Giá trị dùng chung đọc lúc chạy, đồng bộ từ cài đặt Hệ thống (xem catalogSync.ts):
 * tên người dùng đang đăng nhập, tiền tố & độ dài mã phiếu.
 */
export const RUNTIME = {
  userName: 'Nguyễn Đắc Nghĩa',
  codePrefix: 'YMD',
  /** Số chữ số phần thứ tự của mã (độ dài tối thiểu − 1) */
  seqDigits: 7,
}

export const currentUser = () => RUNTIME.userName

/** Mã khám / mã phiếu: TIỀN_TỐ + yyyymmdd + số thứ tự */
export const runtimeCode = (dateIso: string, seq: number) => `${RUNTIME.codePrefix}${dateIso.replace(/-/g, '')}${String(seq).padStart(RUNTIME.seqDigits, '0')}`
