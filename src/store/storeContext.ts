import { createContext } from 'react'
import type { ClinicState } from './types'
import type { ClinicActions } from './ClinicStore'

/**
 * Context của store tách khỏi ClinicStore.tsx để Vite HMR giữ nguyên đối tượng context
 * khi sửa reducer / actions (trước đây phải tải lại trang vì lỗi "phải nằm trong <ClinicProvider>").
 */
export const StateContext = createContext<ClinicState | null>(null)
export const ActionsContext = createContext<ClinicActions | null>(null)
