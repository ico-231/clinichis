import type { Drug, PrescriptionTemplate } from './types.js'

/**
 * Danh mục thuốc MẪU phục vụ kê đơn nhi khoa (demo).
 * Không phải danh mục dược chính thức; liều dùng do bác sĩ quyết định.
 */
export const DRUGS: Drug[] = [
  { id: 'dr01', name: 'Paracetamol 80mg', activeIngredient: 'Paracetamol', strength: '80mg', form: 'Gói bột pha hỗn dịch', route: 'Uống', unit: 'Gói', manufacturer: 'Dược phẩm mẫu A' },
  { id: 'dr02', name: 'Paracetamol 150mg', activeIngredient: 'Paracetamol', strength: '150mg', form: 'Gói bột pha hỗn dịch', route: 'Uống', unit: 'Gói', manufacturer: 'Dược phẩm mẫu A' },
  { id: 'dr03', name: 'Paracetamol 250mg', activeIngredient: 'Paracetamol', strength: '250mg', form: 'Gói bột pha hỗn dịch', route: 'Uống', unit: 'Gói', manufacturer: 'Dược phẩm mẫu A' },
  { id: 'dr04', name: 'Paracetamol 500mg', activeIngredient: 'Paracetamol', strength: '500mg', form: 'Viên nén', route: 'Uống', unit: 'Viên', manufacturer: 'Dược phẩm mẫu B' },
  { id: 'dr05', name: 'Ibuprofen 100mg/5ml', activeIngredient: 'Ibuprofen', strength: '100mg/5ml', form: 'Hỗn dịch uống', route: 'Uống', unit: 'ml', manufacturer: 'Dược phẩm mẫu C' },
  { id: 'dr06', name: 'Amoxicillin 250mg', activeIngredient: 'Amoxicillin', strength: '250mg', form: 'Gói bột pha hỗn dịch', route: 'Uống', unit: 'Gói', manufacturer: 'Dược phẩm mẫu B' },
  { id: 'dr07', name: 'Amoxicillin + Acid clavulanic 250mg/31,25mg', activeIngredient: 'Amoxicillin; Acid clavulanic', strength: '250mg/31,25mg', form: 'Gói bột pha hỗn dịch', route: 'Uống', unit: 'Gói', manufacturer: 'Dược phẩm mẫu D' },
  { id: 'dr08', name: 'Cefuroxim 125mg', activeIngredient: 'Cefuroxim', strength: '125mg', form: 'Gói cốm', route: 'Uống', unit: 'Gói', manufacturer: 'Dược phẩm mẫu D' },
  { id: 'dr09', name: 'Azithromycin 200mg/5ml', activeIngredient: 'Azithromycin', strength: '200mg/5ml', form: 'Bột pha hỗn dịch', route: 'Uống', unit: 'ml', manufacturer: 'Dược phẩm mẫu C' },
  { id: 'dr10', name: 'Oresol 245', activeIngredient: 'Natri clorid; Kali clorid; Natri citrat; Glucose', strength: '4,22g', form: 'Gói bột pha dung dịch', route: 'Uống', unit: 'Gói', manufacturer: 'Dược phẩm mẫu A' },
  { id: 'dr11', name: 'Kẽm gluconat 10mg', activeIngredient: 'Kẽm gluconat', strength: '10mg', form: 'Siro', route: 'Uống', unit: 'ml', manufacturer: 'Dược phẩm mẫu E' },
  { id: 'dr12', name: 'Men vi sinh Bacillus clausii', activeIngredient: 'Bacillus clausii', strength: '2 tỷ bào tử/5ml', form: 'Hỗn dịch uống (ống)', route: 'Uống', unit: 'Ống', manufacturer: 'Dược phẩm mẫu E' },
  { id: 'dr13', name: 'Diosmectit 3g', activeIngredient: 'Diosmectit', strength: '3g', form: 'Gói bột pha hỗn dịch', route: 'Uống', unit: 'Gói', manufacturer: 'Dược phẩm mẫu B' },
  { id: 'dr14', name: 'Desloratadin 0,5mg/ml', activeIngredient: 'Desloratadin', strength: '0,5mg/ml', form: 'Siro', route: 'Uống', unit: 'ml', manufacturer: 'Dược phẩm mẫu C' },
  { id: 'dr15', name: 'Cetirizin 1mg/ml', activeIngredient: 'Cetirizin', strength: '1mg/ml', form: 'Siro', route: 'Uống', unit: 'ml', manufacturer: 'Dược phẩm mẫu A' },
  { id: 'dr16', name: 'Ambroxol 15mg/5ml', activeIngredient: 'Ambroxol', strength: '15mg/5ml', form: 'Siro', route: 'Uống', unit: 'ml', manufacturer: 'Dược phẩm mẫu D' },
  { id: 'dr17', name: 'Acetylcystein 100mg', activeIngredient: 'Acetylcystein', strength: '100mg', form: 'Gói bột', route: 'Uống', unit: 'Gói', manufacturer: 'Dược phẩm mẫu B' },
  { id: 'dr18', name: 'Salbutamol 2mg/5ml', activeIngredient: 'Salbutamol', strength: '2mg/5ml', form: 'Siro', route: 'Uống', unit: 'ml', manufacturer: 'Dược phẩm mẫu E' },
  { id: 'dr19', name: 'Salbutamol 2,5mg/2,5ml', activeIngredient: 'Salbutamol', strength: '2,5mg/2,5ml', form: 'Dung dịch khí dung', route: 'Khí dung', unit: 'Ống', manufacturer: 'Dược phẩm mẫu C' },
  { id: 'dr20', name: 'Budesonid 0,5mg/2ml', activeIngredient: 'Budesonid', strength: '0,5mg/2ml', form: 'Hỗn dịch khí dung', route: 'Khí dung', unit: 'Ống', manufacturer: 'Dược phẩm mẫu D' },
  { id: 'dr21', name: 'Natri clorid 0,9%', activeIngredient: 'Natri clorid', strength: '0,9%', form: 'Dung dịch nhỏ mũi', route: 'Nhỏ mũi', unit: 'Lọ', manufacturer: 'Dược phẩm mẫu A' },
  { id: 'dr22', name: 'Vitamin D3 400IU', activeIngredient: 'Cholecalciferol', strength: '400IU/giọt', form: 'Dung dịch nhỏ giọt', route: 'Uống', unit: 'Giọt', manufacturer: 'Dược phẩm mẫu E' },
  { id: 'dr23', name: 'Sắt (III) hydroxyd polymaltose 50mg/5ml', activeIngredient: 'Sắt (III) hydroxyd polymaltose', strength: '50mg/5ml', form: 'Siro', route: 'Uống', unit: 'ml', manufacturer: 'Dược phẩm mẫu B' },
  { id: 'dr24', name: 'Domperidon 1mg/ml', activeIngredient: 'Domperidon', strength: '1mg/ml', form: 'Hỗn dịch uống', route: 'Uống', unit: 'ml', manufacturer: 'Dược phẩm mẫu C' },
  { id: 'dr25', name: 'Hydrocortison 1%', activeIngredient: 'Hydrocortison acetat', strength: '1%', form: 'Kem bôi da', route: 'Bôi ngoài da', unit: 'Tuýp', manufacturer: 'Dược phẩm mẫu D' },
  { id: 'dr26', name: 'Tobramycin 0,3%', activeIngredient: 'Tobramycin', strength: '0,3%', form: 'Dung dịch nhỏ mắt', route: 'Nhỏ mắt', unit: 'Lọ', manufacturer: 'Dược phẩm mẫu E' },
]

export const drugById = (id: string) => DRUGS.find((d) => d.id === id)

/** Đơn vị liều thường dùng khi kê */
export const DOSE_UNITS = ['Viên', 'Gói', 'ml', 'Ống', 'Giọt', 'Lọ', 'Tuýp', 'Lần', 'Nhát xịt']

/**
 * Đơn vị cấp phát dạng "cả hộp/lọ" (lọ nhỏ mũi, tuýp kem…): liều tính bằng giọt / lần bôi,
 * số lượng cấp là số lọ/tuýp (mặc định 1), không nhân theo liều × ngày.
 */
export const CONTAINER_UNITS = ['Lọ', 'Tuýp', 'Chai']
export const isContainerUnit = (unit: string) => CONTAINER_UNITS.includes(unit)

/** Đơn vị liều mặc định theo đường dùng: nhỏ mũi/mắt tính giọt, bôi da tính lần */
export function defaultDoseUnit(d: Pick<Drug, 'unit' | 'route'>) {
  if (!isContainerUnit(d.unit)) return d.unit
  if (/nhỏ/i.test(d.route)) return 'Giọt'
  return 'Lần'
}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()

/** Hoạt chất cùng nhóm dị ứng chéo hay gặp (ghi "Penicillin" thì Amoxicillin cũng phải cảnh báo) */
const ALLERGY_GROUPS: Record<string, string[]> = {
  penicillin: ['amoxicillin', 'ampicillin'],
  'beta-lactam': ['amoxicillin', 'ampicillin', 'cefuroxim'],
  nsaid: ['ibuprofen'],
}

/**
 * Thuốc có trùng chất người bệnh bị dị ứng không (so ghi chú dị ứng với hoạt chất / tên thuốc, bỏ dấu).
 * Chỉ để cảnh báo bác sĩ, không chặn kê.
 */
export function allergyConflict(drug: { name: string; activeIngredient?: string }, allergyNote?: string): boolean {
  if (!allergyNote?.trim()) return false
  const note = fold(allergyNote)
  const ingredients = fold(`${drug.activeIngredient ?? ''};${drug.name}`)
    .split(/[;,+/()]/)
    .map((s) => s.trim().split(/\s+/)[0])
    .filter((w) => w.length >= 4)
  if (ingredients.some((w) => note.includes(w))) return true
  return Object.entries(ALLERGY_GROUPS).some(([group, members]) => note.includes(group) && members.some((m) => ingredients.includes(m)))
}

const item = (
  drugId: string,
  days: number,
  dose: [number, number, number, number],
  usage: string,
): PrescriptionTemplate['items'][number] => {
  const d = drugById(drugId)!
  const perDay = dose.reduce((s, n) => s + n, 0)
  return {
    drugId,
    name: d.name,
    activeIngredient: d.activeIngredient,
    strength: d.strength,
    days,
    doseUnit: defaultDoseUnit(d),
    morning: dose[0],
    noon: dose[1],
    afternoon: dose[2],
    evening: dose[3],
    // Lọ / tuýp: cấp 1 đơn vị, không nhân liều (2 giọt × 3 lần × 5 ngày không phải 30 lọ)
    quantity: isContainerUnit(d.unit) ? 1 : Math.ceil(days * perDay),
    quantityUnit: d.unit,
    usage,
  }
}

export const INITIAL_PRESCRIPTION_TEMPLATES: PrescriptionTemplate[] = [
  {
    id: 'tpl_fever',
    name: 'Sốt siêu vi (trẻ 10–15kg)',
    advice: 'Uống nhiều nước, lau mát khi sốt. Tái khám ngay nếu sốt cao liên tục > 48 giờ, co giật, li bì.',
    items: [item('dr02', 3, [1, 1, 1, 1], 'Uống khi sốt ≥ 38,5°C, cách nhau tối thiểu 4–6 giờ'), item('dr10', 3, [1, 0, 1, 0], 'Pha đúng 200ml nước chín, uống rải rác trong ngày')],
  },
  {
    id: 'tpl_pharyngitis',
    name: 'Viêm họng cấp do liên cầu (trẻ 10–15kg)',
    advice: 'Uống đủ 10 ngày kháng sinh kể cả khi đã hết sốt. Súc họng / vệ sinh mũi bằng nước muối sinh lý. Ăn thức ăn mềm, dễ nuốt.',
    items: [item('dr06', 10, [1, 0, 1, 0], 'Uống sau ăn, đủ 10 ngày'), item('dr02', 3, [1, 0, 1, 0], 'Uống khi sốt ≥ 38,5°C'), item('dr21', 5, [2, 2, 2, 0], 'Nhỏ mũi 2–3 giọt mỗi bên')],
  },
  {
    id: 'tpl_cough',
    name: 'Ho, sổ mũi do virus (trẻ 10–15kg)',
    advice: 'Không cần kháng sinh. Vệ sinh mũi bằng nước muối sinh lý, cho uống ấm, nằm cao đầu. Tái khám ngay nếu thở nhanh, rút lõm ngực, tím tái, bỏ bú.',
    items: [item('dr21', 5, [2, 2, 2, 0], 'Nhỏ mũi 2–3 giọt mỗi bên'), item('dr02', 3, [1, 0, 1, 0], 'Uống khi sốt ≥ 38,5°C')],
  },
  {
    id: 'tpl_diarrhea',
    name: 'Tiêu chảy cấp không mất nước',
    advice: 'Tiếp tục cho bú / ăn bình thường. Tái khám ngay nếu tiêu chảy nhiều lần, nôn liên tục, có máu trong phân.',
    items: [item('dr10', 3, [1, 1, 1, 0], 'Pha 200ml nước chín, uống sau mỗi lần đi ngoài'), item('dr11', 10, [5, 0, 0, 0], 'Uống sau ăn sáng'), item('dr12', 5, [1, 0, 1, 0], 'Uống trước ăn')],
  },
]
