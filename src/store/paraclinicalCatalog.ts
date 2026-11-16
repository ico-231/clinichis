import type { ParaclinicalCombo, ParaclinicalProvider, ParaclinicalServiceItem } from './types'

export const PARACLINICAL_PROVIDERS: ParaclinicalProvider[] = [
  {
    id: 'lab_medlatec_qn',
    name: 'Phòng xét nghiệm MEDLATEC Quy Nhơn - Bình Định số 28',
    address: '553 Nguyễn Thái Học, Phường Quy Nhơn Nam, Tỉnh Gia Lai',
  },
  {
    id: 'lab_internal',
    name: 'Lab nội bộ',
    address: 'Khu 2 Thanh Lũng, Xã Quảng Oai, TP Hà Nội',
    isInternal: true,
  },
  {
    id: 'lab_pk_minh',
    name: 'PK BS Minh Test',
    address: '3/1 Thành Thái, Phường Hòa Hưng, Thành phố Hồ Chí Minh',
  },
  {
    id: 'lab_ung_buou_ct',
    name: 'Y KHOA UNG BƯỚU CẦN THƠ',
    address: 'NS10, ĐƯỜNG SỐ 5, Phường Long Tuyến, Thành phố Cần Thơ',
  },
  {
    id: 'lab_open_hc',
    name: 'Phòng xét nghiệm trực thuộc Công ty Cổ Phần Open Healthcare Việt Nam',
    address: 'Tầng 2 - Toà nhà Huyndai, số 987 Tam Trinh, Phường Hoàng Mai, Thành phố Hà Nội',
  },
  {
    id: 'lab_ck_ung_buou_ct',
    name: 'Phòng Xét Nghiệm Chuyên Khoa Ung Bướu Cần Thơ',
    address: 'Số 10 đường số 5, khu dân cư Mặt Trời Đỏ, tổ 17, khu vực Bình Thường B, TP. Cần Thơ',
  },
]

export const PARACLINICAL_SERVICES: ParaclinicalServiceItem[] = [
  // Danh mục MEDLATEC Quy Nhơn (khớp ảnh chụp màn hình + mở rộng thực tế)
  { id: 'cls_m1', providerId: 'lab_medlatec_qn', name: 'Normetanephrine/Plasma', groupLabel: 'MIỄN DỊCH (lần)', category: 'lab', price: 700_000 },
  { id: 'cls_m2', providerId: 'lab_medlatec_qn', name: 'NSE', groupLabel: 'TẦM SOÁT UNG THƯ (lần)', category: 'lab', price: 210_000 },
  { id: 'cls_m3', providerId: 'lab_medlatec_qn', name: 'NT-proBNP', groupLabel: 'SINH HÓA (lần)', category: 'lab', price: 600_000 },
  { id: 'cls_m4', providerId: 'lab_medlatec_qn', name: 'Nhiễm sắc thể đồ', groupLabel: 'TẾ BÀO HỌC (lần)', category: 'lab', price: 1_000_000 },
  { id: 'cls_m5', providerId: 'lab_medlatec_qn', name: 'Nhóm máu Gelcard', groupLabel: 'HUYẾT HỌC (lần)', category: 'lab', price: 145_000 },
  { id: 'cls_m6', providerId: 'lab_medlatec_qn', name: 'Osteocalcin', groupLabel: 'MIỄN DỊCH (lần)', category: 'lab', price: 225_000 },
  { id: 'cls_m7', providerId: 'lab_medlatec_qn', name: 'Panel dị ứng 1', groupLabel: 'HUYẾT HỌC (lần)', category: 'lab', price: 1_200_000 },
  { id: 'cls_m8', providerId: 'lab_medlatec_qn', name: 'Panel dị ứng 60', groupLabel: 'HUYẾT HỌC (lần)', category: 'lab', price: 1_660_000 },
  { id: 'cls_m9', providerId: 'lab_medlatec_qn', name: 'Paragonimus IgG (Sán lá phổi)', groupLabel: 'KÝ SINH TRÙNG (lần)', category: 'lab', price: 110_000 },
  { id: 'cls_m10', providerId: 'lab_medlatec_qn', name: 'Tổng phân tích tế bào máu ngoại vi (24 thông số)', groupLabel: 'HUYẾT HỌC (lần)', category: 'lab', price: 85_000 },
  { id: 'cls_m11', providerId: 'lab_medlatec_qn', name: 'CRP định lượng (hs-CRP)', groupLabel: 'SINH HÓA (lần)', category: 'lab', price: 95_000 },
  { id: 'cls_m12', providerId: 'lab_medlatec_qn', name: 'Test nhanh Cúm A/B (Influenza A/B)', groupLabel: 'VI SINH (lần)', category: 'lab', price: 180_000 },
  { id: 'cls_m13', providerId: 'lab_medlatec_qn', name: 'Dengue NS1 + IgM/IgG combo', groupLabel: 'VI SINH (lần)', category: 'lab', price: 240_000 },
  { id: 'cls_m14', providerId: 'lab_medlatec_qn', name: 'Ferritin huyết thanh', groupLabel: 'SINH HÓA (lần)', category: 'lab', price: 160_000 },
  { id: 'cls_m15', providerId: 'lab_medlatec_qn', name: '25-OH Vitamin D tổng', groupLabel: 'MIỄN DỊCH (lần)', category: 'lab', price: 320_000 },
  { id: 'cls_m16', providerId: 'lab_medlatec_qn', name: 'Tổng phân tích nước tiểu 10 thông số', groupLabel: 'NƯỚC TIỂU (lần)', category: 'lab', price: 60_000 },
  { id: 'cls_m17', providerId: 'lab_medlatec_qn', name: 'Soi phân tìm hồng cầu, bạch cầu, ký sinh trùng', groupLabel: 'VI SINH (lần)', category: 'lab', price: 75_000 },
  { id: 'cls_m18', providerId: 'lab_medlatec_qn', name: 'Siêu âm ổ bụng tổng quát', groupLabel: 'SIÊU ÂM (lần)', category: 'imaging', price: 180_000 },
  { id: 'cls_m19', providerId: 'lab_medlatec_qn', name: 'X-quang ngực thẳng kỹ thuật số', groupLabel: 'X-QUANG (lần)', category: 'imaging', price: 150_000 },
  { id: 'cls_m20', providerId: 'lab_medlatec_qn', name: 'Siêu âm tim Doppler màu', groupLabel: 'SIÊU ÂM (lần)', category: 'imaging', price: 350_000 },
  { id: 'cls_m21', providerId: 'lab_medlatec_qn', name: 'Siêu âm tuyến giáp & hạch cổ', groupLabel: 'SIÊU ÂM (lần)', category: 'imaging', price: 180_000 },
  { id: 'cls_m22', providerId: 'lab_medlatec_qn', name: 'Nội soi tai mũi họng ống mềm', groupLabel: 'NỘI SOI (lần)', category: 'imaging', price: 250_000 },

  // Danh mục Open Healthcare (một số dịch vụ nhi khoa)
  { id: 'cls_o1', providerId: 'lab_open_hc', name: 'Công thức máu 18 thông số', groupLabel: 'HUYẾT HỌC (lần)', category: 'lab', price: 80_000 },
  { id: 'cls_o2', providerId: 'lab_open_hc', name: 'AST (GOT) & ALT (GPT)', groupLabel: 'SINH HÓA (lần)', category: 'lab', price: 90_000 },
  { id: 'cls_o3', providerId: 'lab_open_hc', name: 'Test nhanh RSV dịch tỵ hầu', groupLabel: 'VI SINH (lần)', category: 'lab', price: 220_000 },
  { id: 'cls_o4', providerId: 'lab_open_hc', name: 'Siêu âm bụng nhi khoa', groupLabel: 'SIÊU ÂM (lần)', category: 'imaging', price: 160_000 },
  { id: 'cls_o5', providerId: 'lab_open_hc', name: 'X-quang tim phổi thẳng', groupLabel: 'X-QUANG (lần)', category: 'imaging', price: 140_000 },

  // Y khoa Ung Bướu Cần Thơ
  { id: 'cls_u1', providerId: 'lab_ung_buou_ct', name: 'AFP (Alpha-fetoprotein)', groupLabel: 'TẦM SOÁT UNG THƯ (lần)', category: 'lab', price: 190_000 },
  { id: 'cls_u2', providerId: 'lab_ung_buou_ct', name: 'CEA định lượng', groupLabel: 'TẦM SOÁT UNG THƯ (lần)', category: 'lab', price: 190_000 },
  { id: 'cls_u3', providerId: 'lab_ung_buou_ct', name: 'Siêu âm phần mềm / hạch ngoại vi', groupLabel: 'SIÊU ÂM (lần)', category: 'imaging', price: 170_000 },
]

export const INITIAL_COMBOS: ParaclinicalCombo[] = [
  {
    id: 'combo_sot_nhi',
    name: 'Combo Sốt cấp nhi khoa (CTM + CRP + Dengue)',
    providerId: 'lab_medlatec_qn',
    items: [
      { serviceId: 'cls_m10', quantity: 1 },
      { serviceId: 'cls_m11', quantity: 1 },
      { serviceId: 'cls_m13', quantity: 1 },
    ],
  },
]

export const providerById = (id: string) => PARACLINICAL_PROVIDERS.find((p) => p.id === id)
