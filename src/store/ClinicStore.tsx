import { useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { createSeedState, defaultReceptionView } from './seed'
import { ActionsContext, StateContext } from './storeContext'
import { migrateState } from './migrations'
import { INITIAL_COMBOS } from './paraclinicalCatalog'
import { INITIAL_PRESCRIPTION_TEMPLATES } from './drugCatalog'
import { syncCatalogs, syncRuntime } from './catalogSync'
import { todayISO } from '@/lib/date'
import { isNavRoute } from '@/navigation'
import { createActions, reducer, type Action } from './storeLogic'
import type { ClinicState } from './types'

export type { ClinicActions } from './storeLogic'
export { paidAmount, remainingAmount } from './billing'

const STORAGE_KEY = 'clinic-his:state'

/** Khôi phục state đã lưu; bộ lọc ngày luôn quay về hôm nay khi mở lại ứng dụng */
function loadPersisted(): ClinicState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = migrateState(JSON.parse(raw), (key, value) => {
      try {
        window.localStorage.setItem(key, value)
      } catch {
        /* không đủ chỗ sao lưu – bỏ qua */
      }
    })
    if (!parsed) return null
    const today = todayISO()
    const defaults = defaultReceptionView()
    return {
      ...parsed,
      paraclinicalCombos: parsed.paraclinicalCombos ?? INITIAL_COMBOS,
      prescriptionTemplates: parsed.prescriptionTemplates ?? INITIAL_PRESCRIPTION_TEMPLATES,
      defaultProviderId: parsed.defaultProviderId ?? 'lab_internal',
      ui: {
        ...parsed.ui,
        // Mục đã bỏ khỏi menu (Cuộc gọi, Tin nhắn, Thông tin phòng khám, Phát triển thương hiệu) => về Lễ tân
        activeRoute: isNavRoute(parsed.ui.activeRoute) ? parsed.ui.activeRoute : 'reception',
        reception: {
          ...defaults,
          ...parsed.ui.reception,
          filters: {
            ...defaults.filters,
            ...parsed.ui.reception.filters,
            // Bộ lọc Nguồn cũ (theo từng kênh) => đổi sang 2 nhóm Tại phòng khám / Bên ngoài
            source: ['all', 'onsite', 'external'].includes(parsed.ui.reception.filters?.source) ? parsed.ui.reception.filters.source : 'all',
            doctorId: 'all',
            roomId: 'all',
            patientType: 'all',
            dateFrom: today,
            dateTo: today,
          },
          page: 1,
        },
      },
    }
  } catch {
    return null
  }
}


// Context nằm ở module riêng (storeContext.ts): sửa file này khi dev (HMR) không tạo context mới làm vỡ cây component

export function ClinicProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createSeedState)
  // Danh mục chỉnh sửa được phải có hiệu lực trước khi các màn con render
  syncCatalogs(state.services, state.clsServices)
  syncRuntime(state.system, state.clinicProfile)
  // Bản state mới nhất kể cả khi React chưa render lại: mỗi dispatch chạy reducer ngay tại đây,
  // để hai thao tác liên tiếp trong cùng một sự kiện (vd. thu tiền hai lần) không đọc state cũ
  const stateRef = useRef(state)
  const lastRendered = useRef(state)
  if (lastRendered.current !== state) {
    lastRendered.current = state
    stateRef.current = state
  }
  const [hydrated, setHydrated] = useState(false)

  // Hydrate trên client (an toàn khi chuyển sang Next.js SSR)
  useEffect(() => {
    const persisted = loadPersisted()
    if (persisted) dispatch({ type: 'HYDRATE', state: persisted })
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Bộ nhớ trình duyệt đầy (thường do ảnh / tệp kết quả lớn) – báo cho giao diện hiển thị cảnh báo
      window.dispatchEvent(new CustomEvent('clinic:storage-full'))
    }
  }, [state, hydrated])

  const actions = useMemo(() => {
    const syncDispatch: React.Dispatch<Action> = (action) => {
      stateRef.current = reducer(stateRef.current, action)
      dispatch(action)
    }
    return createActions(syncDispatch, () => stateRef.current)
  }, [])

  return (
    <StateContext.Provider value={state}>
      <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
    </StateContext.Provider>
  )
}

export function useClinicState() {
  const ctx = useContext(StateContext)
  if (!ctx) throw new Error('useClinicState phải nằm trong <ClinicProvider>')
  return ctx
}

export function useClinicActions() {
  const ctx = useContext(ActionsContext)
  if (!ctx) throw new Error('useClinicActions phải nằm trong <ClinicProvider>')
  return ctx
}
