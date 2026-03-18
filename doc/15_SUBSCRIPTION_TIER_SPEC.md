# Subscription Tier Specification

## 1. Tổng quan Gói dịch vụ (Subscription Tiers)
DICO Scan hỗ trợ 3 gói dịch vụ chính với các tính năng chuyên vùng nhằm phục vụ đa dạng nhu cầu của người tiêu dùng, từ cơ bản đến chuyên sâu:

### **FREE (Miễn phí)**
Dành cho người dùng phổ thông, làm quen với ứng dụng:
- Quét mã vạch (Barcode scan) để xem thông tin thành phần cơ bản.
- Xem cảnh báo rủi ro tổng quát.
- Xem đánh giá cơ bản của cộng đồng chuyên gia và người dùng.
- Hiển thị quảng cáo Banner.
- Xem video quảng cáo (Rewarded Ads) để nhận **Token (Xu)**.
- Gợi ý sản phẩm thay thế chung chung.
- **Dùng Token/Xu để:**
  - Tiêu Token mở phân tích thành phần ưu tiên (sâu hơn).
  - Tiêu Token để mở khóa 1 lần quét Premium-lite (đầy đủ tính năng Premium cho sản phẩm đó).

### **PREMIUM (35.000đ/tháng | 100.000đ/3 tháng | 357.000đ/năm)**
Dành cho tín đồ chăm sóc cá nhân mong muốn trải nghiệm tối ưu:
- **Toàn bộ tính năng FREE** (Không bao gồm quảng cáo Banner & Rewarded Ads).
- **Quét Offline (Offline Scan):** Quản lý Database thu gọn local để quét nhanh không cần mạng.
- Ghi nhận và lưu lịch sử quét **không giới hạn** (Bản Free bị giới hạn hiển thị).
- **Hồ sơ dị ứng/Ingredient profile cá nhân hóa** (Personal Allergy alerts).
- Cảnh báo thành phần chuyên sâu và khắc nghiệt theo đúng hồ sơ cá nhân.
- Gợi ý sản phẩm thay thế an toàn dựa trên hồ sơ bản thân.
- So sánh sản phẩm cùng loại.
- Yêu thích / Lưu trữ sản phẩm (Bookmark / Save).

### **PREMIUM GOLD (420.000đ/năm - Gói Giá Trị Nhất)**
Đóng vai trò "Mỏ neo" giá trị (Anchor Pricing) với chênh lệch siêu nhỏ nhưng mang lại siêu tính năng độc quyền:
- **Toàn bộ tính năng PREMIUM.**
- **Quản lý đa hồ sơ (Family Profiles/Multi-profiles):** Chỉ một Account để quản lý việc quét mã cho cả gia đình.
- **Chế độ Mẹ và Bé & Mẹ Bầu:** Tự động kích hoạt bộ Rule đánh giá khắt khe nhất theo tiêu chuẩn Y khoa (VD: cảnh báo các chất dễ gây Eczema ở trẻ nhỏ, nguy hại cho Phụ nữ mang thai).
- **Routine Checker (Bác sĩ AI kê toa):** Chụp/Scan cùng lúc 5-6 sản phẩm đang sử dụng chung trong chu trình chăm sóc (Routine). AI phân tích xung đột thành phần chéo (VD: AHA/BHA đánh nhau với Retinol, Vitamin C & Niacinamide phản ứng vỡ...).
- **Advanced Filter (Tìm kiếm Đảo ngược):** Quyền năng search nội bộ Database với các truy vấn cực sâu như: *"Tìm kem dưỡng da < 500k, an toàn cho da mụn mủ, không cồn khô, không dầu."*
- **Exclusive Affiliate Deals:** Hoàn vốn Subscription qua các đợt phát tặng voucher giảm giá độc quyền 5-10% liên kết (Affiliate) qua sàn (Shopee, Hasaki...).

---

## 1.5. Kế hoạch Nguồn Thu (Revenue Streams)
Chiến lược Monetization kết hợp linh hoạt cho phát triển đường dài:
- **Subscription Revenue:** Cốt lõi duy trì dòng tiền từ các gói Premium (35k/tháng, 100k/3 tháng, 357k/năm) & Premium Gold (420k/năm).
- **Advertising Revenue:**
  - **CPM Banner Ads:** Hiển thị tự nhiên luân phiên trên màn hình của FREE Users.
  - **CPM Rewarded Video Ads:** Nguồn thu cao đến từ việc user dùng thời gian đổi lấy Token.
- **Affiliate Revenue:**
  - Nhận hoa hồng 3-10% thông qua việc gắn Link Affiliate trực tiếp dưới các sản phẩm "Gợi ý thay thế", tập trung vào sàn TMĐT (Shopee, Lazada).
- **Enterprise / B2B Revenue:**
  - Cung cấp mô hình Scan (như Hasaki đang sử dụng trên App của họ), SDK hóa DICO Engine bán cho mạng lưới Pharmacy, Siêu thị mỹ phẩm. Target bắt đầu từ giữa 2027 và tăng mạnh vào năm 2028.

## 2. Phân quyền theo Endpoint

| Endpoint | FREE | PREMIUM | PREMIUM GOLD |
|----------|------|---------|--------------|
|----------|------|---------|
| `POST /v1/auth/register` | ✅ | ✅ | ✅ |
| `POST /v1/auth/login` | ✅ | ✅ | ✅ |
| `GET /v1/products/{barcode}` | ✅ Generic (hoặc Premium-lite nếu dùng Dico Xu) | ✅ Personalized | ✅ Family Profile Selectable |
| `PUT /v1/users/me/preferences` | ❌ 403 | ✅ | ✅ |
| `PUT /v1/users/me/safety-profile` | ❌ 403 | ✅ | ✅ |
| `GET /v1/users/me/safety-profile` | ✅ | ✅ | ✅ |
| `POST /v1/contribute` | ✅ | ✅ | ✅ |
| `POST /v1/users/me/tokens/reward` (Xem Ads nhận xu)| ✅ | ❌ | ❌ |
| `CRUD /v1/users/me/family-profiles` | ❌ 403 | ❌ 403 | ✅ |

## 3. Gating Logic trong Product Evaluation

### FREE Users (Chưa dùng Dico Xu)
- Giao diện có quảng cáo (Banner). Option xem Rewarded Ads để nhận Xu.
- `userAllergies` = empty → Override O2 (Allergy Conflict) **không kích hoạt**.
- AI prompt **không có** personal context → summary chung chung.
- `overrideReasons` lọc bỏ "Allergy conflict" entries.
- Nếu gửi yêu cầu quét kèm `?useToken=true` (và còn Xu), sẽ bị trừ 1 Xu và xử lý như PREMIUM (Premium-lite scan).

### PREMIUM Users
- Không quảng cáo, Scan offline.
- Load `preferences`, `safety_profile` từ DB.
- `extractAllAllergies()` gộp từ: `preferences.allergies` + `safetyProfile.foodAllergies` + `safetyProfile.customFoodAllergies`.
- AI prompt append `buildPersonalContext()`.
- `overrideReasons` trả đầy đủ.
- Có thể lưu bookmark (save sản phẩm), so sánh.

### PREMIUM GOLD Users
- Kế thừa toàn bộ quyền lợi của PREMIUM.
- Nếu gửi yêu cầu quét kèm `?profileId={id}`, sẽ dùng dị ứng/sức khoẻ của `Family Profile` đó để chấm điểm và hỏi AI, thay vì dùng profile của tài khoản chính.

## 4. Enforcement
- `UserController.updatePreferences()` → check `user.getSubscriptionTier() != PREMIUM` → throw `PremiumRequiredException`.
- `SafetyProfileService.saveSafetyProfile()` → check tier → throw `PremiumRequiredException`.
- `PremiumRequiredException` → `GlobalExceptionHandler` → `403 Forbidden`.

## 5. Trạng thái hiện tại & Kế hoạch
- ✅ Tier gating cho scoring + preferences + safety profile.
- ❌ **Chưa có**: API nâng cấp FREE → PREMIUM (cần endpoint mới).
- ❌ **Chưa có**: In-App Purchase integration (Phase 2+).
