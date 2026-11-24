export type ErrorCode = 'bad_request' | 'validation' | 'not_found' | 'conflict' | 'method_not_allowed' | 'server_error'

const STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  validation: 422,
  not_found: 404,
  conflict: 409,
  method_not_allowed: 405,
  server_error: 500,
}

/** Lỗi nghiệp vụ có mã HTTP; thông điệp tiếng Việt hiển thị được cho người dùng */
export class ApiError extends Error {
  readonly status: number
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message)
    this.status = STATUS[code]
  }
}
