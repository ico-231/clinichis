import type { ParaclinicalCombo, ParaclinicalProvider, ParaclinicalServiceItem } from './types.js'

export const PARACLINICAL_PROVIDERS: ParaclinicalProvider[] = [
  {
    id: 'lab_an_binh',
    name: 'Trung tâm Xét nghiệm An Bình - Chi nhánh số 3',
    address: '12 Đường số 7, Khu dân cư Ánh Dương, Tỉnh Gia Lai',
  },
  {
    id: 'lab_internal',
    name: 'Lab nội bộ',
    address: 'Tầng 2 - Phòng khám Nhi Khoa',
    isInternal: true,
  },
  {
    id: 'lab_hoa_sen',
    name: 'Phòng khám Đa khoa Hoa Sen',
    address: '48 Đường số 2, Khu phố Hoa Sen, Thành phố Hồ Chí Minh',
  },
  {
    id: 'lab_tan_phat',
    name: 'Trung tâm Y khoa Tân Phát',
    address: 'Lô B5, Đường số 9, Khu đô thị Tân Phát, Thành phố Cần Thơ',
  },
  {
    id: 'lab_viet_an',
    name: 'Phòng xét nghiệm Việt An - Công ty CP Xét nghiệm Việt An',
    address: 'Tầng 3 - Toà nhà Việt An, số 21 Đường số 4, Thành phố Hà Nội',
  },
  {
    id: 'lab_minh_tam',
    name: 'Phòng xét nghiệm chuyên khoa Minh Tâm',
    address: 'Số 7 Đường số 3, Khu dân cư Minh Tâm, Thành phố Cần Thơ',
  },
]

export const PARACLINICAL_SERVICES: ParaclinicalServiceItem[] = [
  // Danh mục Trung tâm Xét nghiệm An Bình (tên đơn vị là tên giả)
  { id: 'cls_m1', providerId: 'lab_an_binh', name: 'Normetanephrine/Plasma', groupLabel: 'MIỄN DỊCH (lần)', category: 'lab', price: 700_000 },
  { id: 'cls_m2', providerId: 'lab_an_binh', name: 'NSE', groupLabel: 'TẦM SOÁT UNG THƯ (lần)', category: 'lab', price: 210_000 },
  { id: 'cls_m3', providerId: 'lab_an_binh', name: 'NT-proBNP', groupLabel: 'SINH HÓA (lần)', category: 'lab', price: 600_000 },
  { id: 'cls_m4', providerId: 'lab_an_binh', name: 'Nhiễm sắc thể đồ', groupLabel: 'TẾ BÀO HỌC (lần)', category: 'lab', price: 1_000_000 },
  { id: 'cls_m5', providerId: 'lab_an_binh', name: 'Nhóm máu Gelcard', groupLabel: 'HUYẾT HỌC (lần)', category: 'lab', price: 145_000 },
  { id: 'cls_m6', providerId: 'lab_an_binh', name: 'Osteocalcin', groupLabel: 'MIỄN DỊCH (lần)', category: 'lab', price: 225_000 },
  { id: 'cls_m7', providerId: 'lab_an_binh', name: 'Panel dị ứng 1', groupLabel: 'HUYẾT HỌC (lần)', category: 'lab', price: 1_200_000 },
  { id: 'cls_m8', providerId: 'lab_an_binh', name: 'Panel dị ứng 60', groupLabel: 'HUYẾT HỌC (lần)', category: 'lab', price: 1_660_000 },
  { id: 'cls_m9', providerId: 'lab_an_binh', name: 'Paragonimus IgG (Sán lá phổi)', groupLabel: 'KÝ SINH TRÙNG (lần)', category: 'lab', price: 110_000 },
  { id: 'cls_m10', providerId: 'lab_an_binh', name: 'Tổng phân tích tế bào máu ngoại vi (24 thông số)', groupLabel: 'HUYẾT HỌC (lần)', category: 'lab', price: 85_000 },
  { id: 'cls_m11', providerId: 'lab_an_binh', name: 'CRP định lượng (hs-CRP)', groupLabel: 'SINH HÓA (lần)', category: 'lab', price: 95_000 },
  { id: 'cls_m12', providerId: 'lab_an_binh', name: 'Test nhanh Cúm A/B (Influenza A/B)', groupLabel: 'VI SINH (lần)', category: 'lab', price: 180_000 },
  { id: 'cls_m13', providerId: 'lab_an_binh', name: 'Dengue NS1 + IgM/IgG combo', groupLabel: 'VI SINH (lần)', category: 'lab', price: 240_000 },
  { id: 'cls_m14', providerId: 'lab_an_binh', name: 'Ferritin huyết thanh', groupLabel: 'SINH HÓA (lần)', category: 'lab', price: 160_000 },
  { id: 'cls_m15', providerId: 'lab_an_binh', name: '25-OH Vitamin D tổng', groupLabel: 'MIỄN DỊCH (lần)', category: 'lab', price: 320_000 },
  { id: 'cls_m16', providerId: 'lab_an_binh', name: 'Tổng phân tích nước tiểu 10 thông số', groupLabel: 'NƯỚC TIỂU (lần)', category: 'lab', price: 60_000 },
  { id: 'cls_m17', providerId: 'lab_an_binh', name: 'Soi phân tìm hồng cầu, bạch cầu, ký sinh trùng', groupLabel: 'VI SINH (lần)', category: 'lab', price: 75_000 },
  { id: 'cls_m18', providerId: 'lab_an_binh', name: 'Siêu âm ổ bụng tổng quát', groupLabel: 'SIÊU ÂM (lần)', category: 'imaging', price: 180_000 },
  { id: 'cls_m19', providerId: 'lab_an_binh', name: 'X-quang ngực thẳng kỹ thuật số', groupLabel: 'X-QUANG (lần)', category: 'imaging', price: 150_000 },
  { id: 'cls_m20', providerId: 'lab_an_binh', name: 'Siêu âm tim Doppler màu', groupLabel: 'SIÊU ÂM (lần)', category: 'imaging', price: 350_000 },
  { id: 'cls_m21', providerId: 'lab_an_binh', name: 'Siêu âm tuyến giáp & hạch cổ', groupLabel: 'SIÊU ÂM (lần)', category: 'imaging', price: 180_000 },
  { id: 'cls_m22', providerId: 'lab_an_binh', name: 'Nội soi tai mũi họng ống mềm', groupLabel: 'NỘI SOI (lần)', category: 'imaging', price: 250_000 },

  // Danh mục Phòng xét nghiệm Việt An (một số dịch vụ nhi khoa)
  { id: 'cls_o1', providerId: 'lab_viet_an', name: 'Công thức máu 18 thông số', groupLabel: 'HUYẾT HỌC (lần)', category: 'lab', price: 80_000 },
  { id: 'cls_o2', providerId: 'lab_viet_an', name: 'AST (GOT) & ALT (GPT)', groupLabel: 'SINH HÓA (lần)', category: 'lab', price: 90_000 },
  { id: 'cls_o3', providerId: 'lab_viet_an', name: 'Test nhanh RSV dịch tỵ hầu', groupLabel: 'VI SINH (lần)', category: 'lab', price: 220_000 },
  { id: 'cls_o4', providerId: 'lab_viet_an', name: 'Siêu âm bụng nhi khoa', groupLabel: 'SIÊU ÂM (lần)', category: 'imaging', price: 160_000 },
  { id: 'cls_o5', providerId: 'lab_viet_an', name: 'X-quang tim phổi thẳng', groupLabel: 'X-QUANG (lần)', category: 'imaging', price: 140_000 },

  // Trung tâm Y khoa Tân Phát
  { id: 'cls_u1', providerId: 'lab_tan_phat', name: 'AFP (Alpha-fetoprotein)', groupLabel: 'TẦM SOÁT UNG THƯ (lần)', category: 'lab', price: 190_000 },
  { id: 'cls_u2', providerId: 'lab_tan_phat', name: 'CEA định lượng', groupLabel: 'TẦM SOÁT UNG THƯ (lần)', category: 'lab', price: 190_000 },
  { id: 'cls_u3', providerId: 'lab_tan_phat', name: 'Siêu âm phần mềm / hạch ngoại vi', groupLabel: 'SIÊU ÂM (lần)', category: 'imaging', price: 170_000 },
]

export const INITIAL_COMBOS: ParaclinicalCombo[] = [
  {
    id: 'combo_sot_nhi',
    name: 'Combo Sốt cấp nhi khoa (CTM + CRP + Dengue)',
    providerId: 'lab_an_binh',
    items: [
      { serviceId: 'cls_m10', quantity: 1 },
      { serviceId: 'cls_m11', quantity: 1 },
      { serviceId: 'cls_m13', quantity: 1 },
    ],
  },
]

/** Đơn vị có sẵn danh mục xét nghiệm & CĐHA đầy đủ (gợi ý khi đơn vị đang chọn chưa có dịch vụ) */
export const SAMPLE_PROVIDER_ID = 'lab_an_binh'

export const providerById = (id: string) => PARACLINICAL_PROVIDERS.find((p) => p.id === id)
