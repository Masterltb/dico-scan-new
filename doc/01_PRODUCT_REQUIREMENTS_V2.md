# Business Requirements Document - MVP V2 (Cập nhật)

## 1. Tổng quan MVP
**DICO Scan MVP** nhằm mục đích rút ngắn thời gian cảnh báo rủi ro sản phẩm cho người tiêu dùng xuống **dưới 2 giây** thông qua cơ chế quét Barcode. Hệ thống hỗ trợ **đa danh mục sản phẩm** (Thực phẩm, Đồ chơi, Mỹ phẩm, Thời trang) với **2 gói dịch vụ** (FREE/PREMIUM).

## 2. In-Scope / Out-of-Scope
| Tiêu chí | MVP (Đã Triển khai) | Tương lai (Phase 2+) | Ghi chú |
| :--- | :--- | :--- | :--- |
| Nguồn Dữ liệu | BÊN THỨ 3 (iCheck API, GS1 VN) có trả phí + Cache DB. | Mở rộng Crawler nội bộ. | Dịch chuyển từ OpenFoodFacts sang dữ liệu có verify. |
| Cơ chế Scorer | Deterministic Scoring: N_score/Nova/Additives + Multi-category. | ML phân tích mức sống. | |
| Vai trò LLM | Tóm tắt rủi ro < 50 từ (JSON). Category-specific prompts. | Chatbot tương tác AI Coach. | |
| Hồ sơ người dùng | Bản thân. Family Profiles (Premium Gold). | Apple Health/Google Fit. | PREMIUM / GOLD only |
| Đăng ký/Đăng nhập | Email + Password, JWT token, BCrypt hash. | OAuth2 (Google/Apple). | |
| Gói dịch vụ | FREE (Ads/Tokens) / PREMIUM / PREMIUM GOLD. | In-App Purchase integration. | `SubscriptionTier` enum |
| Đa danh mục | FOOD, TOY, BEAUTY, FASHION, GENERAL. | Thêm categories mới. | `ProductCategory` enum |
| Đóng góp dữ liệu | Upload ảnh → 202 Accepted (stub). | GCS + async OCR Pub/Sub. | |

## 2.5 Nguồn thu (Revenue Streams) & Gói Dịch Vụ
1. **Subscription Tiers (Mô hình Trả phí):**
   - **FREE (Miễn phí):** Quét mã vạch cơ bản, cảnh báo tổng quát, đánh giá cộng đồng, gợi ý thay thế chung. Kèm Quảng cáo Banner & Cho phép xem Video Ads (Rewarded Ads) để nhận **Token (Xu)** mở khóa tính năng quét sâu (Premium-lite).
   - **PREMIUM (35k/tháng \| 100k/3 tháng \| 357k/năm):** Không quảng cáo, Scan offline, Lưu lịch sử không giới hạn, Hồ sơ cá nhân hóa (dị ứng), Cảnh báo theo hồ sơ, Bookmark, So sánh sản phẩm.
   - **PREMIUM GOLD (420k/năm - Mỏ neo giá trị):** Toàn bộ Premium + **Family Profiles** + **Chế độ Mẹ & Bé/Mẹ Bầu** + **Routine Checker** (Phân tích xung đột skincare) + **Advanced Filter** (Tìm kiếm ngược) + **Exclusive Affiliate Deals** (Voucher hoàn vốn chia sẻ).
2. **Advertising (Quảng cáo):** CPM Banner Ads và CPM Rewarded Video Ads (định hướng cho tập FREE users đổi thời gian lấy giá trị).
3. **Affiliate (Tiếp thị liên kết):** Gắn link mua hàng thay thế trực tiếp dưới sản phẩm (ví dụ Shopee, Hasaki), hưởng hoa hồng 3-10%.
4. **Enterprise / B2B (Giải pháp Doanh nghiệp):** Cung cấp giải pháp quét mã vạch (SDK/API) cho các chuỗi bán lẻ mỹ phẩm/siêu thị. Lộ trình bắt đầu từ giữa 2027 và đóng vai trò chủ lực vào 2028.

## 3. Core Workflow

### Luồng 1: Scan Barcode (Đa danh mục + Tier-gated)
- Trigger: Người dùng quét mã EAN-8 đến EAN-14.
- Action: `GET /v1/products/{barcode}` với header `X-User-Id`.
- System process (7 bước Orchestrator):
  1. Load User → xác định Tier (FREE/PREMIUM/GOLD) và kiểm tra Profile/Tokens.
  2. Cache Check trong DB PostgreSQL → nếu fresh → trả ngay (< 200ms)
  3. Cache Miss → gọi 3rd Party API (iCheck/GS1)
  4. Phát hiện danh mục sản phẩm (CategoryDetector)
  5. Deterministic Scoring (0-100) + Overrides
  6. Persist kết quả vào DB
  7. Gọi AI Gemini → lấy summary → cập nhật DB → trả response

### Luồng 2: Đăng ký / Đăng nhập
- `POST /v1/auth/register` → Tạo user (FREE mặc định) → JWT token
- `POST /v1/auth/login` → Xác thực → JWT token

### Luồng 3: Safety Profile (PREMIUM)
- `PUT /v1/users/me/safety-profile` → Lưu questionnaire 8 bước
- `GET /v1/users/me/safety-profile` → Xem hồ sơ hiện tại

## 4. Acceptance Criteria

### 4.1. Performance Objectives (SLOs)
- `P95` Latency Cache Hit `/v1/products/{barcode}`: `< 200ms`.
- `P95` Latency Cache Miss (3rd Party API + AI): `< 2500ms`.
- Fallback Timeout: AI > 2000ms → trả Score không có AI summary.

### 4.2. Functional Objectives
- **AC_01**: PREMIUM user có "Peanut" trong safety profile → sản phẩm chứa peanut phải trả `RED` + `override_reasons`.
- **AC_02**: Sản phẩm có `Final_Score < 40` → màu `RED`.
- **AC_03**: FREE user → không thấy personal allergy conflicts trong `overrideReasons`.
- **AC_04**: Sản phẩm TOY → hiển thị categoryWarning về giới hạn tuổi.
- **AC_05**: Sản phẩm BEAUTY → hiển thị cảnh báo thành phần kích ứng.

### 4.3. Security & Compliance
- **SEC_01**: Password → BCrypt hash. JWT token (HS256).
- **SEC_02**: Safety Profile inputs → sanitize HTML, strip dangerous chars, limit length.
- **SEC_03**: PREMIUM-gated endpoints (preferences, safety-profile) → 403 cho FREE users.
