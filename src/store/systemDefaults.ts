import type { SystemSettings } from './types.js'
import { SEED_STAFF } from './seedExtras.js'
import { ROOMS } from './catalog.js'

const iso = new Date().toISOString()
const item = (id: string, name: string, description = '') => ({ id, name, description, updatedAt: iso })

export function defaultSystem(): SystemSettings {
  return {
    account: {
      email: 'quantri@phongkham.demo',
      lastName: 'Nguyễn Đắc',
      firstName: 'Nghĩa',
      signProvider: 'Viettel',
      signUsername: '',
      alwaysSignExam: false,
      requireSignRx: false,
    },
    general: {
      accountPrefix: 'pknhi',
      printTicketOnCheckIn: false,
      defaultLabId: 'lab_internal',
      rxInsuranceCode: '',
      rxFacilityCode: '',
      codePrefix: 'YMD',
      codeMinLength: 8,
    },
    org: {
      specialties: [item('sp1', 'Nhi khoa', 'Khám và điều trị bệnh trẻ em'), item('sp2', 'Dinh dưỡng')],
      areas: [item('ar1', 'Khu khám tầng 1'), item('ar2', 'Khu khám tầng 2')],
      // Cùng mã với danh mục phòng dùng ở Lễ tân / Khám bệnh (đồng bộ qua catalogSync)
      rooms: ROOMS.map((r) => item(r.id, r.name, r.floor)),
      visitTypes: [],
      subjects: [],
    },
    staff: SEED_STAFF,
  }
}
