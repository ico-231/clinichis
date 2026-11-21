# ClinicHIS

Dự án đang làm dở, chuyển từ phiên/tài khoản trước. **Trước khi làm gì, đọc `docs/HANDOFF.md`**
(trạng thái, quyết định đã chốt, cách người dùng muốn làm việc), rồi `docs/ROADMAP.md`.

- Trả lời người dùng bằng tiếng Việt.
- Không push / deploy. Chỉ commit khi người dùng bảo.
- Không có trong ảnh tham chiếu (`docs/reference/`) thì không làm; yêu cầu mơ hồ thì hỏi lại trước khi sửa.
- Mỗi thay đổi: `npx tsc -b --noEmit`, `npx vitest run`, thử trên trình duyệt (dev server cổng 8443),
  ghi lại vào ROADMAP nếu là hạng mục mới.
- Không commit `docs/reference/screenshots/`; không dùng tên/logo của sản phẩm tham chiếu.
