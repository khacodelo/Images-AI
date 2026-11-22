# AI Image Saver

Tiện ích mở rộng Chrome (Manifest V3) giúp **tạo ảnh bằng AI từ một đoạn mô tả và tự động lưu vào thư mục Tải xuống**. Ảnh được tạo bởi mô hình `black-forest-labs/flux-3-image-klein` thông qua API của [Beeknoee](https://platform.beeknoee.com).

Dự án viết bằng JavaScript thuần, không dùng framework, không cần cài đặt thư viện hay biên dịch.

## Tính năng

- Nhập mô tả ảnh trong popup, chọn **tỉ lệ khung hình**, **độ phân giải** và **định dạng ảnh** rồi bấm **Tạo và lưu**.
- Hỗ trợ đầy đủ **15 tỉ lệ khung hình** của FLUX 3 Image Klein: `1:1`, `16:9`, `21:9`, `2:1`, `3:2`, `7:5`, `4:3`, `5:4`, `4:5`, `3:4`, `5:7`, `2:3`, `9:16`, `1:2`, `9:21`.
- Hỗ trợ **5 mức độ phân giải**: `768`, `1K`, `1.5K`, `2K`, `4K` (hiển thị giá tham khảo ngay trong danh sách chọn).
- Hỗ trợ **3 định dạng ảnh đầu ra**: `PNG`, `JPEG`, `WEBP` (tự động chuyển đổi qua `OffscreenCanvas` nếu máy chủ trả về định dạng khác).
- Theo dõi tiến trình qua 4 bước: **Kiểm tra → Tạo ảnh → Lưu tệp → Xong**; hiển thị thời gian đã chờ và nút **Hủy** khi đang tạo ảnh.
- Xem trước ảnh ngay trong popup, kèm đường dẫn tệp đã lưu và chi phí (nếu API trả về).
- Tự động lưu ảnh vào thư mục con trong Tải xuống (mặc định `AI-Images`), tên tệp lấy từ mô tả.
- **Lịch sử** tối đa 50 ảnh gần nhất: ảnh thu nhỏ, thời gian, tỉ lệ, độ phân giải, định dạng, chi phí; có tìm kiếm theo mô tả, nút **Dùng lại** (khôi phục cả tỉ lệ, độ phân giải, định dạng), **Xóa**, **Xóa tất cả lịch sử** và bấm vào ảnh thu nhỏ để mở tệp trong thư mục.
- **Menu chuột phải**: bôi đen văn bản trên trang web, chọn *Tạo ảnh AI từ đoạn đã chọn* để tạo ảnh ngay (tối đa 4000 ký tự).
- Huy hiệu (badge) trên biểu tượng extension cho biết trạng thái: `…` đang xử lý, `✓` hoàn tất, `!` lỗi.
- Tự lưu nháp mô tả, tỉ lệ khung hình, độ phân giải và định dạng ảnh, mở lại popup vẫn còn.
- Giao diện popup có chế độ tối.

## Yêu cầu

- Trình duyệt Chromium (Google Chrome, Microsoft Edge, Brave…) phiên bản **110 trở lên**.
- Tài khoản Beeknoee và **API key** (dạng `sk-bee-...`).

## Cài đặt

Extension chưa có trên Chrome Web Store nên được nạp ở chế độ nhà phát triển:

1. Tải mã nguồn về và giải nén (hoặc `git clone`).
2. Mở `chrome://extensions`.
3. Bật **Developer mode** (Chế độ dành cho nhà phát triển) ở góc trên bên phải.
4. Bấm **Load unpacked** (Tải tiện ích đã giải nén) và chọn thư mục `ai-image-saver` (thư mục chứa `manifest.json`).
5. Ghim biểu tượng extension lên thanh công cụ để mở popup nhanh.

## Sử dụng

1. Mở popup, mở mục **Cài đặt API (Beeknoee)**, nhập **API key** rồi bấm **Lưu cài đặt**. Lần đầu chưa có khóa, mục này tự mở.
2. Nhập mô tả ảnh, ví dụ: `chợ nổi buổi sáng trên sông Hậu, màu nước`.
3. Chọn **Tỉ lệ khung hình**, **Độ phân giải** (`768` / `1K` / `1.5K` / `2K` / `4K`) và **Định dạng** (`PNG` / `JPEG` / `WEBP`), sau đó bấm **Tạo và lưu**.
4. Chờ ảnh hiện ở phần xem trước. Tệp được lưu tại `Tải xuống/<thư mục>/<tên>-<thời gian>.<png|jpg|webp>`.
5. Bấm **Tạo ảnh khác** để làm mới và tạo ảnh tiếp.

### Cài đặt

| Mục | Mặc định | Ý nghĩa |
|---|---|---|
| API key | (trống) | Khóa API Beeknoee, hiển thị dạng mật khẩu |
| Base URL | `https://platform.beeknoee.com` | Địa chỉ máy chủ API; bắt buộc dùng `https` |
| Model | `black-forest-labs/flux-3-image-klein` | Mô hình tạo ảnh FLUX 3 Image Klein |
| Thư mục lưu | `AI-Images` | Thư mục con trong Tải xuống; chỉ giữ chữ, số, `_`, `-` và khoảng trắng |

Nếu đổi Base URL sang một tên miền khác Beeknoee, Chrome sẽ hỏi cấp quyền truy cập tên miền đó khi bấm **Lưu cài đặt** (quyền tùy chọn `optional_host_permissions`).

### Quy tắc đặt tên tệp

```
<thư-mục>/<mô-tả-không-dấu-tối-đa-40-ký-tự>-<YYYYMMDD-HHMMSS>.<png|jpg|webp|svg>
```

Mô tả được chuyển sang không dấu và nối bằng dấu gạch ngang. Nếu trùng tên, Chrome tự thêm số (`conflictAction: uniquify`). Đuôi tệp khớp với định dạng ảnh đã chọn.

## Cách hoạt động

Toàn bộ logic nằm trong service worker `background.js`; popup chỉ hiển thị trạng thái và gửi lệnh `START`, `CANCEL`, `RESET`. Hai phần trao đổi qua `chrome.runtime.sendMessage` và `chrome.storage`.

Luồng xử lý khi tạo ảnh:

1. **Kiểm tra đầu vào**: có API key và model; mô tả dài 3–4000 ký tự; tỉ lệ khung hình, độ phân giải và định dạng hợp lệ; Base URL dùng `https` và đã được cấp quyền.
2. **Gửi yêu cầu** `POST {baseUrl}/v1/image/generations` với `model`, `prompt`, `aspect_ratio`, `resolution`, `output_format` và header `Authorization: Bearer <API key>`.
3. Nếu máy chủ trả trạng thái `PROCESSING`, extension **hỏi lại mỗi 5 giây** qua `GET {baseUrl}/v1/image/generations/{job_id}` cho tới khi `COMPLETED` hoặc `FAILED`. Tối đa chờ **5 phút**.
4. **Tải ảnh** từ `b64_json` hoặc từ đường dẫn `url` trong phản hồi (tự chuyển đổi định dạng qua `OffscreenCanvas` nếu MIME phản hồi khác định dạng người dùng chọn).
5. **Lưu tệp** bằng `chrome.downloads`, chờ tải xong, rồi ghi một mục vào lịch sử (kèm ảnh thu nhỏ JPEG khoảng 160 px).
