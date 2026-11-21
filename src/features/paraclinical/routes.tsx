import { ParaclinicalListPage } from './ParaclinicalListPage'

/** Hai route dùng chung một trang danh sách, khác loại chỉ định */
export const ImagingPage = () => <ParaclinicalListPage category="imaging" />
export const LabPage = () => <ParaclinicalListPage category="lab" />
