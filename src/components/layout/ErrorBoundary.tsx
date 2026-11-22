import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  /** Gọi khi người dùng chọn khôi phục dữ liệu mẫu (dữ liệu đã lưu có thể bị hỏng) */
  onResetData: () => void
}

interface State {
  error: Error | null
  confirmReset: boolean
}

/**
 * Chặn lỗi khi hiển thị một màn để cả ứng dụng không bị trắng trang.
 * Đặt key theo route ở nơi dùng để chuyển màn là thử lại từ đầu.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, confirmReset: false }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Lỗi hiển thị màn hình', error, info.componentStack)
  }

  render() {
    const { error, confirmReset } = this.state
    if (!error) return this.props.children
    const btn = 'inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[13px] font-medium transition'
    return (
      <div className="flex h-full items-center justify-center p-6" role="alert">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <h2 className="mt-3 text-[16px] font-semibold text-slate-900">Màn hình này gặp lỗi</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
            Dữ liệu đã lưu không bị thay đổi. Bạn có thể tải lại trang; nếu lỗi lặp lại, dữ liệu lưu trên trình duyệt có thể đã hỏng.
          </p>
          <details className="mt-3 text-left text-[12px] text-slate-500">
            <summary className="cursor-pointer select-none">Chi tiết kỹ thuật</summary>
            <pre className="thin-scroll mt-1.5 max-h-32 overflow-auto rounded-md bg-slate-50 p-2 whitespace-pre-wrap">{error.message}</pre>
          </details>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => window.location.reload()} className={`${btn} bg-blue-600 text-white hover:bg-blue-700`}>
              <RefreshCw className="h-4 w-4" /> Tải lại trang
            </button>
            {confirmReset ? (
              <button
                type="button"
                onClick={() => {
                  this.props.onResetData()
                  this.setState({ error: null, confirmReset: false })
                }}
                className={`${btn} bg-rose-600 text-white hover:bg-rose-700`}
              >
                <RotateCcw className="h-4 w-4" /> Xác nhận xoá & dùng dữ liệu mẫu
              </button>
            ) : (
              <button type="button" onClick={() => this.setState({ confirmReset: true })} className={`${btn} border border-slate-200 text-slate-700 hover:bg-slate-50`}>
                <RotateCcw className="h-4 w-4" /> Khôi phục dữ liệu mẫu
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }
}
