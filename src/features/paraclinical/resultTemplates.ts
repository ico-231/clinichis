import type { ResultTemplate } from '@/store/types'

/** Mẫu kết quả soạn sẵn (demo) – người dùng có thể thêm mẫu riêng ở Cận lâm sàng › Thiết lập */
export const RESULT_TEMPLATES: ResultTemplate[] = [
  {
    id: 'rt_abdomen_normal',
    name: 'Siêu âm bụng tổng quát – bình thường',
    description:
      '<ul><li>Gan: không to, bờ đều, nhu mô đồng nhất.</li><li>Đường mật trong và ngoài gan không giãn.</li><li>Túi mật: thành mỏng, không sỏi.</li><li>Lách, tuỵ: kích thước bình thường.</li><li>Hai thận: không sỏi, không ứ nước.</li><li>Bàng quang: thành đều, không sỏi.</li><li>Không thấy dịch tự do ổ bụng.</li></ul>',
    conclusion: '<b>Hiện tại chưa phát hiện bất thường trên siêu âm.</b>',
    recommendation: 'Theo dõi lâm sàng.',
  },
  {
    id: 'rt_chest_xray_normal',
    name: 'X-quang ngực thẳng – bình thường',
    description: '<ul><li>Hai phế trường sáng đều, không thấy tổn thương nhu mô.</li><li>Rốn phổi hai bên không đậm.</li><li>Bóng tim không to.</li><li>Góc sườn hoành hai bên nhọn.</li></ul>',
    conclusion: '<b>Hình ảnh X-quang ngực chưa ghi nhận bất thường.</b>',
    recommendation: '',
  },
  {
    id: 'rt_bronchitis',
    name: 'X-quang ngực – viêm phế quản',
    description: '<ul><li>Hai rốn phổi đậm, tăng tập trung tuần hoàn phế quản.</li><li>Không thấy đám mờ khu trú.</li><li>Bóng tim không to.</li></ul>',
    conclusion: '<b>Hình ảnh viêm phế quản.</b>',
    recommendation: 'Đối chiếu lâm sàng.',
  },
]
