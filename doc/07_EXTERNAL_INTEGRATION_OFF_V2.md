# Chính sách Tích hợp 3rd Party Provider (iCheck / Verified Data)

Tài liệu này chuẩn hóa và đưa ra các quy ước kỹ thuật bắt buộc khi kết nối backend DICO Scan với các đối tác cung cấp dữ liệu sản phẩm trả phí (như iCheck, GS1 VN). Do OpenFoodFacts có dữ liệu không đồng nhất và thiếu kiểm chứng tại thị trường Việt Nam, hệ thống đã chuyển sang sử dụng API trả phí. Dù trả phí, API Provider gặp sự cố mạng vẫn có thể xảy ra, API Backend của chúng ta vẫn phải đảm bảo hoạt động an toàn trước Mobile App (không bao giờ sập dây chuyền).

## 1. REST Client (Resilience Configuration)
Backend (Spring Boot) sẽ gọi Data từ endpoint của đối tác thông qua `RestTemplate` hoặc `WebClient`.

**Cấu hình bắt buộc (Bảo vệ API của chúng ta & Tối ưu hóa chi phí):**
- **Connection Timeout:** Giao tiếp TCP kết nối: `1000ms`.
- **Read Timeout:** Quá trình tải dữ liệu body từ OFF: Tối đa `3000ms` là hủy bỏ luồng cắt đứt để bảo vệ Thread Pool.
- **Retry Policy:**
  - Max Attempts: `2`.
  - Delay: `500 ms` (Fixed Backoff).
  - Điều kiện Retry: Chỉ retry nếu dính các lỗi hệ thống của Provider `5xx (500, 502, 503, 504)` hoặc `ReadTimeout`. KHÔNG bao giờ bị lừa retry lỗi `4xx` (Vd 404 là product ko có, phải accept luôn để không tốn tiền API).
- **Circuit Breaker state:**
  - Nếu gặp lỗi Timeout liên tiếp >= 50% trong 10 requests qua API Provider => Mở ngắt mạch (Open). Mọi request sau đó trong vòng 30s tới Provider sẽ bị failfast mà không cần tốn thời gian gọi Provider, giảm tải.

## 2. Payload Extraction (Data Parsing & Normalization)
Dữ liệu của các API trả phí có cấu trúc chuẩn hơn nhưng vẫn cần Normalizer để map về DICO format. Mọi xử lý phải áp dụng null safety 100%.

Yêu cầu lấy các trường:
- `product_name`
- `brands` (hoặc `manufacturer`)
- `image_url`
- `ingredients_text`: Đây là dữ liệu gốc AI sẽ đọc. Nếu API trả phí đã tách riêng các chất phụ gia, nối chúng lại thành text hoặc truyền qua mảng đặc biệt cho Scorer. NẾU NULL -> Phải handle để chấm Confidence Score < 1.0 bên Deterministic.
- `nutriments`: Lấy thông tin dinh dưỡng (nếu có):
  - `energy-kcal_100g` -> Bắt fallback double = 0.
  - `sugars_100g` -> Bắt fallback double = 0.
  - `salt_100g` -> Bắt fallback double = 0.
- `additives_tags`: Chuyển đổi từ danh sách phụ gia (E-number hoặc mã địa phương) của đối tác.
- `allergens_hierarchy`: Dùng để check O2 (Allergy rules). Nếu empty/null -> Chuyển match string nguyên mảng `ingredients_text` qua Index.

## 3. Quản trị Chi phí & Authentication
Các Provider như iCheck tính tiền trên MỖI request thành công.
- BẮT BUỘC lưu trữ Cache: Backend chỉ fetch 1 lần duy nhất khi DB trống Barcode này. Toàn bộ người quét thứ 2, thứ 3 sẽ được đọc Cache từ CSDL PostgreSQL (Trường JSONB `vendor_payload`).
- **Thời gian sống của Cache (TTL):** Đối với dữ liệu trả phí, nên tăng TTL lên 180 ngày hoặc mức tối đa cho phép theo hợp đồng dịch vụ để cực kỳ tiết kiệm tiền gọi API. Không gọi Provider cho request cache-hit.
- **Authenticaton:** API Key hoặc Bearer Token phải được inject qua Biến môi trường (`API_VENDOR_KEY`), không bao giờ được hardcode trong source code. Xoay vòng key (Key Rotation) định kỳ.
