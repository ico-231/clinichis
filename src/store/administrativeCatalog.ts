export interface ProvinceItem {
  name: string
  wards: string[]
}

export const PROVINCES: ProvinceItem[] = [
  {
    name: 'TP. Hồ Chí Minh',
    wards: [
      'Phường Bến Nghé, Quận 1',
      'Phường Bến Thành, Quận 1',
      'Phường Võ Thị Sáu, Quận 3',
      'Phường 11, Quận 5',
      'Phường Hòa Hưng, Quận 10',
      'Phường Tân Phong, Quận 7',
      'Phường 10, Quận Gò Vấp',
      'Phường 9, Quận Tân Bình',
      'Phường Bình Trị Đông B, Quận Bình Tân',
      'Phường Linh Chiểu, TP. Thủ Đức',
    ],
  },
  {
    name: 'TP. Hà Nội',
    wards: [
      'Phường Hàng Bài, Quận Hoàn Kiếm',
      'Phường Láng Hạ, Quận Đống Đa',
      'Phường Dịch Vọng, Quận Cầu Giấy',
      'Phường Hoàng Mai, Quận Hoàng Mai',
      'Xã Quảng Oai, Huyện Ba Vì',
      'Phường Mỹ Đình 1, Quận Nam Từ Liêm',
    ],
  },
  {
    name: 'Tỉnh An Giang',
    wards: ['Xã Châu Phú', 'Phường Mỹ Bình, TP. Long Xuyên', 'Phường Châu Phú A, TP. Châu Đốc', 'Thị trấn Phú Mỹ'],
  },
  {
    name: 'Tỉnh Gia Lai',
    wards: ['Phường Quy Nhơn Nam', 'Phường Hội Thương, TP. Pleiku', 'Phường Diên Hồng, TP. Pleiku', 'Phường Yên Đỗ'],
  },
  {
    name: 'Tỉnh Bình Định',
    wards: ['Phường Nguyễn Văn Cừ, TP. Quy Nhơn', 'Phường Trần Phú, TP. Quy Nhơn', 'Phường Ghềnh Ráng, TP. Quy Nhơn'],
  },
  {
    name: 'TP. Cần Thơ',
    wards: ['Phường Long Tuyến, Quận Bình Thủy', 'Phường Xuân Khánh, Quận Ninh Kiều', 'Phường An Hòa, Quận Ninh Kiều'],
  },
  {
    name: 'TP. Đà Nẵng',
    wards: ['Phường Hải Châu 1, Quận Hải Châu', 'Phường Thạc Gián, Quận Thanh Khê', 'Phường Mỹ An, Quận Ngũ Hành Sơn'],
  },
  {
    name: 'Tỉnh Bình Dương',
    wards: ['Phường Phú Cường, TP. Thủ Dầu Một', 'Phường Đông Hòa, TP. Dĩ An', 'Phường Lái Thiêu, TP. Thuận An'],
  },
  {
    name: 'Tỉnh Đồng Nai',
    wards: ['Phường Tân Hiệp, TP. Biên Hòa', 'Phường Trảng Dài, TP. Biên Hòa', 'Thị trấn Long Thành'],
  },
  {
    name: 'Tỉnh Khánh Hòa',
    wards: ['Phường Lộc Thọ, TP. Nha Trang', 'Phường Phước Hải, TP. Nha Trang', 'Phường Cam Nghĩa, TP. Cam Ranh'],
  },
]

export const BLOOD_TYPES = ['A', 'B', 'AB', 'O', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

export const OCCUPATIONS = [
  'Trẻ em (còn nhỏ)',
  'Học sinh',
  'Sinh viên',
  'Nhân viên văn phòng',
  'Giáo viên',
  'Kinh doanh / Tự do',
  'Công nhân',
  'Nội trợ',
  'Khác',
]

export const ETHNICITIES = ['Kinh', 'Tày', 'Thái', 'Hoa', 'Khmer', 'Mường', 'Nùng', "H'Mông", 'Dao', 'Gia Rai', 'Ê Đê', 'Khác']

export const NATIONALITIES = ['Việt Nam', 'Hàn Quốc', 'Nhật Bản', 'Hoa Kỳ', 'Trung Quốc', 'Úc', 'Singapore', 'Khác']
