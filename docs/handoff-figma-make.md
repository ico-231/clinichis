> Tài liệu bàn giao ngữ cảnh từ Figma Make (tham khảo, không phải file hướng dẫn CLAUDE.md chuẩn). Bản AGENTS gốc: [agents-figma-make.md](agents-figma-make.md).
>
> **Cập nhật 17/11/2026:** phần lịch sử bên dưới mô tả trạng thái *lúc bàn giao* (chỉ có Lễ tân).
> Hiện trạng mới nhất xem [README](../README.md) (kiến trúc, tính năng, phím tắt, phạm vi) và
> [ROADMAP](ROADMAP.md) (từng giai đoạn A–J, I đã hoàn tất). Mục 11–12 đã được ghi chú lại theo hiện trạng.

# ClinicHIS — Bàn giao dự án từ Figma Make sang Claude Code

## 1. Đọc trước khi tiếp tục

Đây là tài liệu ngữ cảnh dự án, yêu cầu của người dùng và lịch sử phát triển
được tổng hợp từ hội thoại còn hiển thị, đối chiếu với mã nguồn hiện có.
Đây **không phải bản xuất nguyên văn toàn bộ lịch sử chat**, và không chứa
bộ nhớ riêng của nền tảng hay các dữ liệu không có trong repository.

- Người dùng giao tiếp bằng **tiếng Việt**.
- Dự án cá nhân phục vụ **portfolio**: ứng dụng Web Quản lý Phòng khám,
  còn gọi là **Clinic Management System / HIS**.
- Người dùng cung cấp ảnh chụp một hệ thống khác mà họ mô tả là mã nguồn mở,
  muốn dựng lại để tiếp tục phát triển từng phần. Chưa có URL hay thông tin
  giấy phép của hệ thống tham chiếu trong ngữ cảnh hiện có.
- Phải ưu tiên **bố cục, màu sắc, mật độ thông tin và luồng thao tác trong ảnh**;
  không tự đổi thành một dashboard marketing hay thiết kế khác.
- Hiện đang là **frontend demo**, không phải HIS đã đủ điều kiện vận hành thật.
- Đã xây App Shell và module Lễ tân; phần lớn mục Sidebar khác vẫn là trang chờ.
- Người dùng muốn chuyển công việc từ **Figma Make sang Claude Code**.
  Chưa có yêu cầu thực hiện migration sang Next.js ngay trong bước bàn giao.

### File hướng dẫn đã có trước lần bàn giao này

Repository có sẵn file viết hoa **`CLAUDE.md`**, với toàn bộ nội dung cũ là:

```md
@AGENTS.md
```

Dòng import này được giữ nguyên ở đầu file. Người dùng gọi file là `claude.md`
trong chat; sử dụng chính `CLAUDE.md` hiện có để Claude Code tự nạp theo quy ước,
không tạo thêm hai file chỉ khác chữ hoa/thường vì sẽ xung đột trên một số máy.

## 2. Yêu cầu gốc và phạm vi phải giữ

### Yêu cầu chức năng

1. App Shell cố định với Sidebar bên trái, có các mục chính: Tổng quan,
   Lịch hẹn, Lịch làm việc, Lễ tân, Khám bệnh, Cận lâm sàng, Báo cáo, Hệ thống.
2. Dựng hoàn chỉnh màn hình đầu tiên theo screenshot: bộ lọc, bảng dữ liệu
   mẫu tiếng Việt sát thực tế y tế, badge trạng thái và nút thao tác.
3. Tổ chức **state tập trung** để các màn hình tiếp theo cùng dùng dữ liệu
   người bệnh; chuyển Sidebar không làm mất hồ sơ/lượt khám đã lưu.
4. Tiếp tục theo từng lô ảnh do người dùng gửi; chưa có đủ thiết kế toàn bộ HIS.

### Ràng buộc kỹ thuật do người dùng yêu cầu

- **React thuần + Tailwind CSS + icon `lucide-react`.**
- Tự viết Modal, Tabs, Dropdown và các UI primitive; không đưa thêm thư viện
  UI như shadcn/ui, Radix, Ant Design, MUI chỉ để dựng các control này.
- Tổ chức component và dữ liệu để **dễ chuyển/nhúng vào Next.js sau này**.
- Không tự chuyển framework hay bổ sung backend chỉ vì ứng dụng mang tên HIS.
  Hãy xác nhận yêu cầu mới nếu cần tài khoản thật, dữ liệu nhiều người dùng,
  lưu trữ máy chủ, thanh toán thật hoặc tích hợp y tế.

### Những phần người dùng loại trừ

- **Không làm Nhà thuốc**, không bán lẻ thuốc, không quản lý bán theo toa
  hay hóa đơn nhà thuốc; chỉ giữ phạm vi **Kê đơn**.
- **Không làm Tin tức.**
- **Không làm Học / CME / khóa học.**

## 3. Lịch sử trao đổi rút gọn

### Giai đoạn 1 — App Shell và màn hình Lễ tân

Người dùng gửi lô đầu **10 ảnh**:

- Trang Tổng quan với thẻ doanh thu, lượt người bệnh, khách mới/cũ.
- Trang Lễ tân trống, bộ lọc ngày, trạng thái, thanh toán.
- Calendar, menu ẩn/hiện cột, ngăn Tìm kiếm nâng cao.
- Các đoạn Sidebar để thấy nhóm chức năng.

Đã triển khai:

- App Shell, Sidebar thu gọn/mở rộng, header.
- Store Context + reducer, dữ liệu mẫu tiếng Việt, lưu localStorage.
- Lễ tân: lọc, sắp xếp, phân trang, chi tiết lượt khám, thu tiền, hủy/hoàn tiền.
- Bộ UI primitive tự viết bằng React/Tailwind.
- Ban đầu thêm bệnh mới/cũ bằng modal hai cột.

Khi người dùng hỏi “xong chưa”, đã báo kiểm tra kiểu và build thành công.
Chưa có kiểm thử trình duyệt hay xác nhận đối chiếu hình ảnh hoàn chỉnh.

### Giai đoạn 2 — Luồng Lễ tân theo lô ảnh tiếp theo

Người dùng nói: **“tiếp tục nhé đây là flow lễ tân thêm bệnh nhân mới”**
và gửi thêm **10 ảnh**:

- Spotlight tìm bệnh cũ.
- Màn hình nhận bệnh toàn trang với thông tin hành chính, người thân, sinh hiệu.
- Cận lâm sàng trống và modal thêm chỉ định.
- Chọn nơi thực hiện, chọn dịch vụ, hướng dẫn người bệnh.
- Xác nhận hủy các thay đổi.
- Bảng Lễ tân có người bệnh vừa đăng ký.

Đã thay luồng modal đăng ký cũ bằng:

- `F1` → Spotlight tìm người bệnh → trang tiếp nhận điền sẵn.
- `F2` → trang tiếp nhận người bệnh mới toàn trang.
- Modal chọn chỉ định CLS, lưu combo, thiết lập nơi thực hiện mặc định.
- Bổ sung schema hành chính/người thân/sinh hiệu/chỉ định.
- Đổi bảng về dạng hàng gọn, trạng thái inline và mã `YMD...`.
- Xóa `RegisterModals.tsx` vì không dùng nữa.

### Giai đoạn 3 — Bàn giao sang Claude Code

Người dùng cho biết định chuyển từ Figma Make qua Claude Code, nhiều lần
yêu cầu lưu lịch sử/ngữ cảnh/yêu cầu và nội dung file Claude hiện có vào
một file Markdown; cuối cùng hỏi “bạn nhớ gì về dự án hiện tại”.

Tài liệu này thực hiện việc bàn giao đó. Lần cập nhật tài liệu này không
thay đổi chức năng ứng dụng.

### Về ảnh tham chiếu

- Tổng cộng đã thấy **hai lô, mỗi lô 10 ảnh** trong hội thoại.
- Không được giả định các ảnh đính kèm chat đã tự xuất thành file trong repo.
- Khi chuyển sang Claude Code, nên mang theo ảnh gốc và đặt vào một thư mục
  tài liệu do người dùng lựa chọn; gửi lại ảnh nếu tác vụ cần đối chiếu trực tiếp.
- Mô tả trong tài liệu này không thay thế ảnh gốc khi cần khớp thiết kế.

## 4. Stack, công cụ và quy ước repository

### Stack hiện tại

| Thành phần         | Hiện trạng                                                    |
| ------------------ | ------------------------------------------------------------- |
| React / React DOM  | `^19.0.0`                                                     |
| Ngôn ngữ           | TypeScript, chế độ `strict`                                   |
| Bundler            | Vite `^8.0.5`                                                 |
| CSS                | Tailwind CSS `^4.0.0`, `@tailwindcss/vite`                    |
| Icon               | `lucide-react ^1.73.0`                                        |
| Định dạng mã       | `oxfmt ^0.76.0`                                               |
| Node               | `22`, theo `.mise.toml`                                       |
| pnpm               | `10.34.3`, theo `.mise.toml`                                  |
| Font               | Inter từ Google Fonts qua `src/index.css`                     |
| Alias              | `@` trỏ vào `src`                                             |
| Router             | Chưa có thư viện router, chuyển màn hình bằng state           |
| Backend / database | Chưa có                                                       |
| Test runner        | Chưa có script/test runner được cấu hình trong `package.json` |

Các lệnh hiện có:

```sh
pnpm install
pnpm exec tsc --noEmit -p .
pnpm build
pnpm format
```

`pnpm format` gọi `oxfmt`; truyền đường dẫn khi chỉ muốn format file đang sửa,
tránh vô tình đổi định dạng toàn repo.

### Quy tắc Tailwind và entrypoint

- `src/main.tsx` import `src/index.css` và mount `src/App.tsx` vào `#root`.
- `src/index.css` import Tailwind v4; không cần thêm Tailwind config hay PostCSS.
- Đặt CSS `@import` trước các khai báo khác.
- Global element styles/reset bổ sung nên nằm trong `@layer base` để không
  đè Tailwind utilities.
- Reuse UI component và icon Lucide hiện có.
- Đọc thêm `AGENTS.md` trước khi sửa; không overwrite thay đổi của người dùng.

### Khác biệt Figma Make và môi trường local

- **Trong Figma Make:** server preview đã được host chạy sẵn trên `$PORT`
  (mặc định `8443`); không tự khởi động thêm server.
- **Sau khi xuất sang máy local:** nếu chưa có server, có thể dùng
  `pnpm dev` theo script của repo. Đây không phải chỉ dẫn chạy thêm server
  bên trong phiên Figma Make hiện tại.
- `vite.config.ts` có các plugin tích hợp Figma và import
  `.figma/make/site.json`; giữ các file này khi xuất source để tránh thiếu
  dependency cấu hình. Không tự xóa `.figma/` trước khi kiểm tra tác động.
- `.figma/README.md` giải thích các file do Figma quản lý.
- Có thể cần chỉnh cấu hình Vite khi thực sự tách khỏi Figma, nhưng chưa
  thực hiện việc đó trong lần viết tài liệu này.

## 5. Bản đồ mã nguồn

```text
AGENTS.md
CLAUDE.md
package.json
pnpm-lock.yaml
vite.config.ts
.mise.toml
src/
  main.tsx
  App.tsx
  index.css
  navigation.ts
  lib/
    cn.ts
    date.ts
    format.ts
  store/
    types.ts
    ClinicStore.tsx
    selectors.ts
    seed.ts
    catalog.ts
    administrativeCatalog.ts
    paraclinicalCatalog.ts
  components/
    layout/
      AppShell.tsx
      Sidebar.tsx
      PageHeader.tsx
    clinic/
      StatusBadges.tsx
    ui/
      Badge.tsx
      Button.tsx
      ConfirmDiscardModal.tsx
      DatePicker.tsx
      DropdownMenu.tsx
      EmptyState.tsx
      Field.tsx
      Modal.tsx
      Pagination.tsx
      Popover.tsx
      Portal.tsx
      Select.tsx
      Tabs.tsx
      Toast.tsx
  features/
    placeholder/
      PlaceholderPage.tsx
    reception/
      ReceptionPage.tsx
      ReceptionToolbar.tsx
      ReceptionTable.tsx
      columns.tsx
      useReceptionData.ts
      ExistingPatientSpotlightModal.tsx
      ReceptionIntakeView.tsx
      UnderlineControls.tsx
      ParaclinicalOrderModal.tsx
      PaymentModals.tsx
      VisitDetailDrawer.tsx
      forms.tsx
      visitFlow.ts
```

### Chỗ bắt đầu theo tác vụ

| Muốn sửa                        | Đọc trước                                                         |
| ------------------------------- | ----------------------------------------------------------------- |
| Điều hướng / thêm màn hình      | `src/navigation.ts`, `AppShell.tsx`, `types.ts`                   |
| Danh sách Lễ tân                | `ReceptionPage.tsx`, `ReceptionToolbar.tsx`, `ReceptionTable.tsx` |
| Bộ lọc / sort / phân trang      | `useReceptionData.ts`, `columns.tsx`, `ReceptionViewState`        |
| Tìm bệnh cũ                     | `ExistingPatientSpotlightModal.tsx`                               |
| Thêm người bệnh mới / tiếp nhận | `ReceptionIntakeView.tsx`, `UnderlineControls.tsx`                |
| Chỉ định CLS                    | `ParaclinicalOrderModal.tsx`, `paraclinicalCatalog.ts`            |
| Thu tiền / hủy / hoàn tiền      | `PaymentModals.tsx`, `ClinicStore.tsx`                            |
| Chi tiết hồ sơ / lượt khám      | `VisitDetailDrawer.tsx`, `forms.tsx`                              |
| Dữ liệu và quan hệ dùng chung   | `types.ts`, `ClinicStore.tsx`, `selectors.ts`                     |

## 6. App Shell và Sidebar

Luồng component:

```text
App
  ClinicProvider
    ToastProvider
      AppShell
        Sidebar
        ReceptionPage hoặc PlaceholderPage
```

Sidebar cấu hình trong `src/navigation.ts`:

- Tổng quan.
- **Phòng khám:** Lễ tân, Khám bệnh, Kê đơn.
- **Tư vấn trực tuyến:** Cuộc gọi, Tin nhắn.
- **Đặt khám thông minh:** Lịch hẹn, Lịch làm việc, Thông tin phòng khám,
  Phát triển thương hiệu.
- **Hồ sơ:** Bệnh án điện tử, Người bệnh.
- **Cận lâm sàng:** Chẩn đoán hình ảnh, Xét nghiệm, Báo cáo, Thiết lập.
- **Quản lý:** Báo cáo, Hệ thống.

Chi tiết:

- Sidebar rộng khoảng `230px`, thu gọn còn `64px`.
- Nhận diện demo là **Phòng khám Nhi Khoa**, logo chữ **PK** màu hồng đỏ.
- Header có nút PanelLeft để thu gọn/mở rộng.
- Số đếm cạnh Lễ tân / Khám bệnh lấy từ store.
- Chân Sidebar có thẻ Standard, tài khoản demo, thao tác khôi phục dữ liệu mẫu.
- **Chỉ `reception` có màn hình nghiệp vụ trong bảng `SCREENS`.**
  Tổng quan, Khám bệnh, Kê đơn và các route khác vẫn dùng `PlaceholderPage`.

## 7. Store tập trung và mô hình dữ liệu

### Cơ chế state

- `ClinicProvider` dùng React Context + `useReducer`.
- Tách context dữ liệu và actions.
- Actions đọc state mới nhất qua ref.
- LocalStorage key: **`clinic-his:state`**.
- Phiên bản schema hiện tại: **`STATE_VERSION = 2`** trong `seed.ts`.
- Hydrate localStorage sau mount; ghi lại khi state thay đổi sau hydrate.
- Khi mở lại ứng dụng, khoảng ngày bộ lọc quay về hôm nay, trang quay về 1.

`ClinicState` gồm:

- `version`
- `patients`
- `visits`
- `paraclinicalCombos`
- `defaultProviderId`
- `ui`: active route, Sidebar, bộ lọc/cột/sort/trang Lễ tân.

**Lưu ý quan trọng:** chỉ hồ sơ/lượt khám và state đưa vào store được giữ chung.
Draft tiếp nhận, chỉ định chưa xác nhận và trạng thái modal vẫn là state cục bộ
ở component, không phải tất cả dữ liệu nhập dở đều được lưu xuyên màn hình.

### Mô hình chính

- `Patient`: mã BN, họ tên, ngày sinh, giới tính, SĐT, địa chỉ; CCCD, email,
  nhóm máu, nghề nghiệp, dân tộc, quốc gia, tỉnh/phường/đường, BHYT, dị ứng;
  `relative` và các trường legacy `guardianName` / `guardianRelation`.
- `PatientRelative`: họ tên, SĐT, ngày sinh, giới tính, quan hệ, địa chỉ.
- `Visit`: liên kết `patientId`, STT, mã KB, ngày/giờ đầu-cuối, dịch vụ,
  bác sĩ/phòng, phí công khám, phí thuốc, chỉ định CLS, tổng phí, giao dịch,
  trạng thái khám/thanh toán, phân loại/nguồn, lý do, triệu chứng, ghi chú, sinh hiệu.
- `VitalSigns`: chiều cao, cân nặng, nhiệt độ, huyết áp, mạch, nhịp thở, SpO2, BMI.
- `ParaclinicalOrderItem`: snapshot tên/giá dịch vụ và nơi thực hiện,
  số lượng, hướng dẫn người bệnh.
- `ParaclinicalCombo`: nhóm dịch vụ thường dùng theo nơi thực hiện.
- `PaymentRecord`: giao dịch thu hoặc hoàn, số tiền, phương thức, thời điểm, ghi chú.

Đừng nhầm các khái niệm:

- `patientType`: `new` / `returning` — khách mới/cũ.
- `visitKind`: `Lịch khám` / `Cận lâm sàng` — chữ hiển thị ở cột **Loại**.
- `category`: `booked` / `walk_in` / `referral` — **Phân loại**.
- `source`: trực tiếp / website / app / Zalo / tổng đài / giới thiệu.
- Tên key cột `patientType` hiện được giữ lại nhưng render `visitKind`.

### Quy ước dữ liệu

- Ngày: chuỗi local **`YYYY-MM-DD`**.
- Giờ: **`HH:mm`**; mặc định khoảng khám 30 phút.
- Timestamp giao dịch/trạng thái: ISO datetime.
- Tiền: số nguyên VND; format kiểu Việt Nam, không lưu chuỗi tiền đã format.
- Mã người bệnh: dạng `BN001201`.
- Mã lượt khám: `YMD` + ngày `YYYYMMDD` + STT 7 chữ số,
  ví dụ **`YMD202611130000001`**.
- STT tăng theo ngày, không zero-pad khi hiển thị bảng.
- Tuổi nhi khoa hiển thị ngày / tháng / tuổi qua `ageLabel`.
- Tìm kiếm bỏ dấu tiếng Việt bằng `normalizeText`.

### API đang có

Hooks:

- `useClinicState()`
- `useClinicActions()`
- `useVisitRows()` — ghép Visit với Patient.
- `usePatient(id)`
- `usePatientVisits(patientId)`

Actions:

- `navigate`, `forceNavigate`, `setNavigationGuard`
- `setUI`, `setReceptionView`
- `registerNewPatient(patientInput, visitInput)`
- `registerVisit(patientId, visitInput, patientPatch?)`
- `updatePatient`, `updateVisit`, `setVisitStatus`
- `collectPayment`, `cancelVisit`
- `setDefaultProvider`, `saveParaclinicalCombo`
- `resetDemoData`

Helpers tiền:

- `paidAmount(visit)`: tổng thu trừ tổng hoàn.
- `remainingAmount(visit)`: phần còn thiếu, tối thiểu 0.

### Dữ liệu mẫu

- 40 hồ sơ bệnh nhi Việt Nam, bổ sung một hồ sơ người lớn khớp ảnh Spotlight.
- Lượt khám sinh quanh ngày hiện tại: từ 7 ngày trước đến 2 ngày sau,
  có nhiều trạng thái, bác sĩ, dịch vụ và thanh toán khác nhau.
- Hồ sơ **Hoàng Minh Lộc**, năm sinh 2000, địa chỉ Xã Châu Phú, Tỉnh An Giang
  là bản ghi tham chiếu demo từ ảnh, không phải dữ liệu cần dùng trong sản phẩm thật.
- Có danh mục bác sĩ/phòng/dịch vụ, tỉnh-phường mẫu và xét nghiệm/CĐHA mẫu.
- Không coi danh mục địa giới là danh mục hành chính toàn quốc đầy đủ hay đã cập nhật.

## 8. Màn hình danh sách Lễ tân hiện tại

### Header và bộ lọc

- `Thêm bệnh cũ` màu xanh lá, `F1`.
- `Thêm bệnh mới` màu xanh dương, `F2`.
- Tìm theo tên/SĐT/mã bệnh nhân/mã khám/người giám hộ theo logic từng control.
  Tìm kiếm danh sách chính áp dụng khi bấm **Tìm** hoặc Enter.
- Ngày Từ / Đến với calendar tự viết.
- Trạng thái khám và thanh toán.
- **Nâng cao:** Phân loại, Nguồn, Bác sĩ, Phòng khám, Loại khách.
- Menu ẩn/hiện cột và nút khôi phục cột mặc định.

### Bảng

- Trạng thái khám là pill/dropdown đổi trực tiếp trên dòng.
- Chọn trạng thái Hủy mở modal xác nhận/lý do thay vì chỉ đổi chữ.
- Mã KB là link màu xanh; click dòng mở chi tiết.
- STT màu cam đỏ; họ tên in hoa; ngày sinh kèm tuổi; có ký hiệu giới tính.
- Giờ khám hiển thị khoảng đầu-cuối, phí là số format Việt Nam.
- Thanh toán hiển thị vòng tròn màu và chữ; ô chưa thanh toán/một phần có thể
  mở modal thu tiền.
- Cột Loại hiện `Lịch khám` hoặc `Cận lâm sàng`.
- Phân trang 10 / 20 / 50 / 100 dòng, có sort theo các cột hỗ trợ.
- Mặc định sort ngày mới trước và STT trong ngày tăng dần.
- Chân bảng: `Tổng X kết quả`, `Trang 1/1`; có trạng thái trống minh họa.

### Drawer chi tiết

4 tab:

1. Lượt khám: dịch vụ, phí, bác sĩ/phòng, lý do, triệu chứng, sinh hiệu,
   chỉ định CLS, sửa ghi chú.
2. Hành chính: thông tin người bệnh, sửa hồ sơ bằng form hiện có.
3. Thanh toán: tổng phí, đã thu, còn lại, lịch sử giao dịch.
4. Lịch sử khám: các lượt của cùng người bệnh.

Có thao tác chuyển bước khám, thu tiền, hủy lượt. Nút in hiện chưa kết nối
chức năng in thật; xem phần hạn chế bên dưới.

## 9. Luồng tiếp nhận người bệnh mới/cũ

### Tìm bệnh cũ

`F1` / **Thêm bệnh cũ** mở Spotlight chính giữa màn hình:

- Tìm theo tên/SĐT và các dữ liệu được hỗ trợ trong component.
- Mũi tên lên/xuống đổi dòng chọn, Enter để nạp bệnh nhân.
- `Shift + Enter` chuyển sang bệnh mới, mang theo tên/SĐT vừa gõ.
- Chọn bệnh nhân mở trang tiếp nhận toàn trang, điền sẵn hành chính/người thân.

### Bệnh mới

`F2` / **Thêm bệnh mới** mở `ReceptionIntakeView`.
Sidebar tự thu gọn để có chỗ cho form.

Giao diện nền xám xanh nhạt, thẻ trắng, input gạch chân:

#### Khối THÔNG TIN — nhấn màu xanh

- Họ và tên bắt buộc, tự viết hoa, có gợi ý chọn hồ sơ đã tồn tại.
- Giới tính Nam/Nữ, CCCD.
- Điện thoại bắt buộc, ngày sinh bắt buộc, email, nhóm máu.
- Mã BHYT, nghề nghiệp, dân tộc mặc định Kinh, quốc gia mặc định Việt Nam.
- Tỉnh/Thành phố bắt buộc; Phường/Xã phụ thuộc tỉnh; địa chỉ đường.

#### Khối THÔNG TIN NGƯỜI THÂN — nhấn màu cam

- Họ tên, SĐT, ngày sinh, giới tính, quan hệ mặc định Khác, địa chỉ.
- Có gợi ý tìm và nút sao chép liên hệ từ người bệnh.

#### Khối THÔNG TIN NHẬN BỆNH — nhấn màu xanh

- Ngày khám, giờ khám, công khám.
- Công khám mặc định **Mặc định (0 đ)**, có thể chọn dịch vụ có giá.
- Lý do khám, triệu chứng, ghi chú lượt khám.

#### Khối CHỈ SỐ SINH HIỆU — nhấn màu cam

- Chiều cao cm, cân nặng kg, nhiệt độ °C.
- Huyết áp tâm thu/tâm trương mmHg.
- Mạch, nhịp thở lần/phút, SpO2 %, BMI kg/m².
- BMI tính từ cân nặng / bình phương chiều cao tính theo mét.

#### Khối CẬN LÂM SÀNG — toàn chiều rộng, nhấn màu cam

- Trống: minh họa hồ sơ, lời nhắc và nút Thêm chỉ định.
- Đã chọn: danh sách chỉ định, nơi thực hiện, hướng dẫn, số lượng,
  thành tiền; có thể chỉnh/xóa.

### Thanh tác vụ cố định phía dưới

| Phím / nút              | Hành vi hiện có                                                   |
| ----------------------- | ----------------------------------------------------------------- |
| F3 / Thu tiền           | Xác nhận thu trước trong draft, chọn tiền mặt/chuyển khoản/thẻ/ví |
| Shift + C               | Mở modal chọn chỉ định cận lâm sàng                               |
| F8 / In phiếu tiếp nhận | Nút đang disabled trên form; chưa có xử lý in thật                |
| F9 / Khám bệnh          | Lưu lượt khám trạng thái `in_progress`, quay về danh sách         |
| F10 / Đăng ký khám      | Lưu lượt khám trạng thái `registered`, quay về danh sách          |

Tổng ở thanh dưới:

- `Th`: tiền thuốc, hiện là 0 ở màn hình tiếp nhận.
- `CLS`: tổng `unitPrice × quantity` của chỉ định.
- `CK`: công khám đã chọn.
- `TT`: tổng chi phí.

Lưu ý:

- F9 **chưa mở giao diện bác sĩ khám bệnh**, vì route Khám bệnh còn là trang chờ.
- Lượt mới mặc định **Chưa thanh toán**, kể cả 0đ nếu chưa xác nhận thu.
- Chọn F3 rồi lưu lượt mới sẽ ghi giao dịch thu vào store.
- Khi lưu bệnh cũ, có thể cập nhật luôn hồ sơ hành chính hiện có.
- Nút quay lại và navigation guard cảnh báo khi form thay đổi chưa lưu.

## 10. Modal thêm chỉ định cận lâm sàng

Component chính: `ParaclinicalOrderModal.tsx`.

### Bên trái

- **Nơi thực hiện** có tìm theo tên lab/địa chỉ và nút đặt Mặc định.
- Các đơn vị mẫu gồm:
  - Lab nội bộ.
  - PK BS Minh Test.
  - MEDLATEC Quy Nhơn - Bình Định số 28.
  - Open Healthcare.
  - Các phòng xét nghiệm ung bướu Cần Thơ.
- Tìm tên dịch vụ/combo.
- Tab Tất cả / Chẩn đoán hình ảnh / Xét nghiệm / Combo kèm số đếm thực.
- Dịch vụ có icon theo loại, nhóm, giá; chọn bằng nút `+`, đã chọn thành dấu check.
- Lab nội bộ mặc định chưa có dịch vụ; có shortcut chuyển sang MEDLATEC
  để khám phá danh mục mẫu. Đây không nhất thiết là lỗi tải dữ liệu.

### Bên phải

- Số chỉ định đang chọn, Xóa tất cả.
- Nhóm chỉ định theo nơi thực hiện, có tổng từng nhóm và địa chỉ.
- Tăng/giảm số lượng, xóa dòng, nhập hướng dẫn người bệnh.
- Chọn **Lưu thành combo thường dùng**, nhập tên combo.
- Tổng dự kiến, nút **Tạo chỉ định**, phím **Shift + T**.

### Xác nhận hủy

Đóng khi đã đổi lựa chọn bật:

- Tiêu đề: **Huỷ các thay đổi?**
- Nội dung: **Các thay đổi bạn vừa thực hiện sẽ không được lưu.**
- Nút **Không** / **Có**.

`ConfirmDiscardModal` dùng chung cho cảnh báo rời trang tiếp nhận.
Modal/Drawer có overlay stack để Escape xử lý lớp đang ở trên; Popover
dùng portal và định vị theo anchor để không bị cắt bởi bảng cuộn.

## 11. Những gì chưa hoàn chỉnh — đừng báo là đã xong

Các điểm này được ghi nhận từ mã nguồn; không phải tất cả đã được tái hiện
trong trình duyệt. Khi sửa phải kiểm chứng và giữ phạm vi người dùng yêu cầu.

### Chưa triển khai

> Cập nhật 17/11/2026: các màn có ảnh tham chiếu đều đã có giao diện và luồng (xem README).
> Gạch đầu dòng nào đã xử lý được ghi chú **[ĐÃ LÀM]**.

- Backend, database, API, auth/roles, đồng bộ nhiều máy/người dùng. *(vẫn chưa — app là demo localStorage)*
- **[ĐÃ LÀM]** Giao diện thật cho các route ngoài Lễ tân, kể cả Tổng quan và Khám bệnh.
  Route chưa có ảnh vẫn là trang chờ: Kê đơn, Cuộc gọi, Tin nhắn, Phát triển thương hiệu.
- **[ĐÃ LÀM]** Kê đơn trong màn khám, kết quả xét nghiệm/CĐHA, lịch hẹn/lịch làm việc.
- **[ĐÃ LÀM]** In phiếu: phiếu tiếp nhận nhiệt (F8), đơn thuốc, phiếu chỉ định, phiếu thu,
  phiếu kết quả, bệnh án — qua hộp xem trước và hộp in của trình duyệt.
- Thanh toán hiện chỉ là ghi nhận số liệu demo, không tích hợp ngân hàng/cổng thanh toán.
  Hoá đơn điện tử chỉ ghi nhận thông tin, không phát hành thật.
- Nút "Nâng cấp ngay" trên Sidebar vẫn là control trang trí.
- Bộ danh mục hành chính/lab/thuốc/ICD-10 là dữ liệu mẫu giới hạn.
- **[ĐÃ LÀM một phần]** Có unit test Vitest (billing, migration, bộ lọc, tính liều/BMI, mã);
  chưa có integration/E2E tự động — luồng chính được kiểm tra thủ công trên trình duyệt.

### Rủi ro và điểm nên kiểm tra tiếp

1. **[ĐÃ SỬA — `store/migrations.ts`: v2→v3 giữ dữ liệu; phiên bản lạ được sao lưu vào `clinic-his:backup-v<n>` trước khi dùng seed]** **Version localStorage chưa có migration:** `loadPersisted()` trả null khi
   version không khớp, rồi dùng seed mới. Tăng `STATE_VERSION` có thể làm dữ
   liệu cũ không còn xuất hiện. Sao lưu và viết migration nếu muốn giữ dữ liệu.
2. **Dữ liệu trình duyệt không đi theo source code:** chuyển origin/domain
   từ Figma sang local không chuyển `clinic-his:state`. Chưa có UI export/import.
3. **Draft intake là state cục bộ:** thoát trang, reload hoặc chấp nhận hủy
   có thể mất nội dung chưa lưu; chưa có auto-save draft hay browser unload guard.
4. **Khôi phục Sidebar:** trạng thái cũ được restore trong `closeIntake()`;
   cần kiểm tra nhánh thoát bằng navigation guard/forceNavigate.
5. **[ĐÃ SỬA 2026-11-16 — `filtersRevealingVisit` nới bộ lọc trong một lần cập nhật, xoá tìm kiếm]** **Bộ lọc sau khi tạo lượt:** `onCreated()` có nhiều lần cập nhật filters
   từ cùng snapshot; search và bộ lọc nâng cao có thể vẫn che lượt vừa tạo.
   Cần kiểm tra trường hợp ngày và trạng thái cùng khác bộ lọc.
6. **[ĐÃ SỬA 2026-11-16 — `prepay.amount` chốt số đã thu; tổng đổi thì cảnh báo và lưu "thu một phần"]** **Thu trước trong draft:** hiện chỉ lưu cờ paid và method, số tiền dùng
   grandTotal lúc submit. Nếu đổi dịch vụ/CLS sau xác nhận thu, cần xử lý
   chênh lệch thay vì mặc nhiên coi tổng mới đã được thu.
7. **Combo nhiều nơi thực hiện:** khi lưu combo hiện chỉ lấy các dòng thuộc
   provider của chỉ định đầu tiên. Nên làm rõ giới hạn này trong UI hoặc đổi model.
8. **Combo/mặc định lưu riêng:** chúng được ghi vào store ngay; hủy draft tiếp
   nhận không nhất thiết rollback các thay đổi cấu hình/combo đó.
9. **Sửa hành chính bằng form legacy:** `forms.tsx` còn dùng cho Drawer,
   khác form intake mở rộng. Kiểm tra đồng bộ `relative` với `guardianName`,
   và địa chỉ tổng với `province`/`ward`/`streetAddress`.
10. **Validation:** form intake và form legacy có luật khác nhau; intake
    chưa kiểm tra đầy đủ CCCD, email, BHYT, sinh hiệu và giới hạn giờ.
    Date input có thể revert về giá trị cũ khi gõ sai; cần kiểm thử.
11. **[CẢI THIỆN — phím tắt chữ bị chặn khi đang gõ, ngăn xếp lớp phủ cho Esc/phím F, ô chọn có ↑/↓/Enter]** **Khả năng sử dụng:** kiểm tra focus trap, label liên kết input, thao tác
    bàn phím, Escape với nhiều lớp phủ, shortcut khi confirmation đang mở,
    bố cục tablet/mobile. Chưa có bằng chứng kiểm thử đầy đủ.
12. **Bảo toàn dữ liệu y tế:** đây là demo localStorage, không phù hợp lưu hồ
    sơ thật; không đưa dữ liệu cá nhân/sức khỏe thật hay secrets vào repo.

## 12. Tình trạng kiểm tra và độ tin cậy của thông tin

Ở cuối lần triển khai flow Lễ tân trước bàn giao, hai lệnh đã chạy thành công:

```sh
pnpm exec tsc --noEmit -p .
pnpm build
```

- Build trước đó cảnh báo bundle JavaScript lớn hơn 500 kB
  (khoảng 627 kB minified / 174 kB gzip); cảnh báo, không phải build failure.
- Chưa có xác minh bằng ảnh chụp trình duyệt/E2E.
- Build/TypeScript thành công **không đồng nghĩa mọi luồng đã đúng**.
- Bản bàn giao này chỉ chỉnh tài liệu; không tự nhận đã chạy lại kiểm thử ứng
  dụng nếu chưa thực sự chạy lệnh.
- Những lời báo “hoàn thiện trọn bộ”, “khớp 100%”, “SSR an toàn” trước đây
  không phải chứng nhận; dùng mã nguồn, ảnh và kiểm thử làm căn cứ thực tế.

**Cập nhật 17/11/2026:** `tsc -b` sạch, `vitest run` 19/19 đạt, `vite build` thành công
(các màn tải theo nhu cầu, bundle chính ~336 kB / 97 kB gzip). Luồng Lễ tân → Khám → CLS →
Thu tiền → Kết quả → Hoàn thành → Báo cáo đã chạy thủ công trên trình duyệt (ROADMAP I1).

## 13. Lộ trình chuyển sang Claude Code / Next.js

### Mang gì sang Claude Code

1. Toàn bộ source repo, lockfile, `CLAUDE.md`, `AGENTS.md` và cấu hình liên quan.
2. Ảnh screenshot gốc từ hai lô và các ảnh sau đó nếu có.
3. Nếu cần giữ dữ liệu nhập thử, sao lưu localStorage ở origin cũ;
   mã nguồn đơn thuần không mang dữ liệu đó sang máy mới.
4. Đừng mang secrets hay `node_modules`/`dist` như dữ liệu nguồn.

### Chạy ở máy local

```sh
pnpm install
pnpm exec tsc --noEmit -p .
pnpm build
# Chỉ khởi động nếu không có dev server đang chạy:
pnpm dev
```

Kiểm tra Node/pnpm theo `.mise.toml`, cấu hình port và `.figma/make/site.json`.
Nếu cần tách plugin Figma, làm riêng và kiểm tra lại thay vì xóa hàng loạt.

### Nếu sau này người dùng yêu cầu Next.js

- Hiện `package.json` **không có Next.js**; chưa migrate.
- Provider/state cần đặt trong layout/client boundary chung để không reset
  khi chuyển route.
- Đưa từng `RouteKey` sang route tương ứng khi đã quyết định cấu trúc App Router.
- Các component có hook/event/browser API cần client boundary.
- `localStorage` và Portal có xử lý sau mount, nhưng seed dựa thời gian/random
  và toàn bộ cây component vẫn cần kiểm tra hydration/SSR; chưa thể gọi
  ứng dụng hiện tại là “sẵn sàng Next.js” chỉ nhờ cách chia component.
- Giữ model Patient/Visit/Orders khi thay persistence sang backend.
- Không thêm lại Nhà thuốc, Tin tức, CME trong quá trình chuyển.

## 14. Checklist kiểm thử khi tiếp tục phát triển

- [ ] Sidebar không làm mất hồ sơ/lượt khám đã lưu.
- [ ] F1 tìm không dấu, chọn bằng mũi tên/Enter; Shift+Enter mang đúng prefill.
- [ ] F2 mở form mới; form bệnh cũ điền đủ thông tin.
- [ ] Ngày sinh gõ tay và chọn lịch đều lưu đúng, không lệch ngày/múi giờ.
- [ ] Tỉnh đổi thì phường phụ thuộc được reset đúng.
- [ ] Chiều cao/cân nặng tính BMI đúng.
- [ ] Đổi công khám/CLS/số lượng cập nhật đúng CK/CLS/TT.
- [ ] Modal CLS lọc đúng provider, tìm kiếm, tab, số lượng, hướng dẫn, combo.
- [ ] Hủy thay đổi giữ/bỏ đúng draft, không đóng nhầm lớp phủ khác.
- [ ] F3 không ghi thanh toán sai khi tổng thay đổi.
- [ ] F10 tạo một lượt `registered`; F9 tạo một lượt `in_progress`.
- [ ] Lưu bệnh cũ không tạo trùng Patient; cập nhật hành chính không mất trường khác.
- [ ] Mã KB/STT không trùng, format đúng.
- [ ] Lượt vừa tạo hiển thị với các tổ hợp bộ lọc.
- [ ] Thu một phần, thu đủ, xác nhận 0đ, hủy/hoàn tiền cập nhật đúng.
- [ ] Drawer hiển thị được sinh hiệu/CLS và các thông tin đã nhập.
- [ ] Reload đọc đúng state; version mismatch có phương án bảo toàn dữ liệu.
- [ ] Kiểm tra TypeScript, build và test nghiệp vụ thích hợp sau thay đổi mã.

## 15. Gợi ý prompt mở đầu cho phiên Claude Code mới

> Đây là dự án ClinicHIS cá nhân phục vụ portfolio, chuyển từ Figma Make.
> Hãy đọc CLAUDE.md và AGENTS.md, kiểm tra mã nguồn hiện tại trước khi sửa.
> Giữ React + Tailwind v4 + lucide-react và UI component tự viết; không thêm
> Nhà thuốc, Tin tức hoặc CME. App Shell và flow Lễ tân đã có; các màn hình
> tiếp theo tôi sẽ gửi ảnh dần. Đừng dựng lại từ đầu, đừng coi control demo
> là chức năng thật, và phải giữ chung dữ liệu Patient/Visit giữa các màn hình.

Khi có thay đổi đáng kể, cập nhật lại tài liệu này với yêu cầu mới, file quan
trọng, phần còn thiếu và kiểm tra đã thực sự chạy; tránh lưu những khẳng định
hoàn thành không còn đúng với mã nguồn.
