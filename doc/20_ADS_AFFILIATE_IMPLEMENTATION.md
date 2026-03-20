# Tài liệu Triển khai Quảng cáo & Shopee Affiliate (Revenue Model)

Tài liệu này chi tiết hóa mô hình kinh doanh, luồng doanh thu và các tính năng phân tầng (Tier-gated features) cho dự án DICO Scan.

## 1. Nguồn thu (Revenue Streams)

Chiến lược đa dạng hóa doanh thu để đảm bảo tính bền vững cho hệ thống:

### **Subscription Revenue (Phí đăng ký)**
*   **Premium Monthly:** 35.000đ / tháng
*   **Premium 3-Month:** 100.000đ / 3 tháng
*   **Premium Yearly:** 357.000đ / năm
*   **Premium Gold Yearly:** 420.000đ / năm (Mỏ neo giá trị cao nhất)

### **Advertising Revenue — Google AdMob (Ngắn hạn)**
*   **Banner Ads:** Hiển thị cố định ở đáy màn hình (FREE users). Kiếm tiền ngay từ đầu, nuôi tệp user miễn phí.
*   **Rewarded Video Ads:** User chọn xem quảng cáo (~30s) để nhận 1 Token. Tỉ lệ CPM cao nhất trong các định dạng AdMob.
*   **Interstitial Ads:** Hiển thị toàn màn hình tại các điểm chuyển cảnh quan trọng (VD: sau khi xem kết quả quét lần thứ 3). ⚠️ **Cần thận trọng** — gây ảnh hưởng UX nếu lạm dụng, chỉ trigger tối đa 1 lần/phiên.

### **Affiliate Revenue — Shopee Affiliate (Core — Dài hạn)**
> **Đây là nguồn thu chiến lược cốt lõi dài hạn của DICO Scan.**

Vòng lặp giá trị: *User Scan sản phẩm → Xem gợi ý thay thế an toàn → Click link Affiliate → Mua trên Shopee → DICO nhận hoa hồng 3-10%*
*   **Điểm hiển thị link:** Trên sản phẩm vừa quét VÀ tất cả sản phẩm gợi ý thay thế.
*   **Đối tác ưu tiên:** Shopee Affiliate Program (hoa hồng cao, lượng hàng lớn, phổ biến tại VN).

### **B2B Expansion (Lộ trình 2027-2028)**
*   **Scan-as-a-Service:** Cung cấp SDK/API quét mã vạch chuyên dụng cho các chuỗi bán lẻ (tương tự mô hình Hasaki đang áp dụng).

---

## 2. Phân cấp tính năng (Tier Comparison)

| Tính năng | FREE | PREMIUM | PREMIUM GOLD |
| :--- | :---: | :---: | :---: |
| Quét mã & Thành phần cơ bản | ✅ | ✅ | ✅ |
| Cảnh báo rủi ro tổng quát | ✅ | ✅ | ✅ |
| Đánh giá cộng đồng | ✅ | ✅ | ✅ |
| Gợi ý sản phẩm thay thế | Generic | Personalized | Specialized |
| Quảng cáo Banner | Có | ❌ | ❌ |
| Token / Xu (Dico Xu) | Có | ❌ (Mở khóa sẵn) | ❌ (Mở khóa sẵn) |
| Quét Offline | ❌ | ✅ | ✅ |
| Lịch sử quét không giới hạn | ❌ | ✅ | ✅ |
| Hồ sơ dị ứng cá nhân hóa | ❌ | ✅ | ✅ |
| So sánh / Bookmark sản phẩm | ❌ | ✅ | ✅ |
| Đa hồ sơ (Family Profiles) | ❌ | ❌ | ✅ |
| Routine Checker (AI Skincare) | ❌ | ❌ | ✅ |
| Advanced Filter (Tìm kiếm ngược) | ❌ | ❌ | ✅ |

---

## 3. Cơ chế Triển khai kỹ thuật

### 3.1. Google AdMob Integration

| Loại | Trigger | Mục đích | Lưu ý |
|------|---------|----------|-------|
| **Banner** | Luôn hiển thị (bottom) | Thu nhập thụ động | Ẩn hoàn toàn với Premium |
| **Rewarded** | User chủ động ấn "Nhận Xu" | Đổi thời gian lấy Token | CPM cao nhất |
| **Interstitial** | Sau mỗi ~3 lần quét | Tăng eCPM | ⚠️ Tối đa 1 lần/phiên |

**Rewarded Ads → Token Flow:**
```
User nhấn "Xem Ads → Nhận 1 Xu"
  → AdMob SDK play video (~30s)
  → onRewarded callback
  → Mobile gọi PUT /v1/users/me/tokens/reward
  → Backend cộng 1 Token vào UserWallet
  → UI hiển thị "Bạn nhận được 1 Xu"
```
**Token Usage (Dico Xu):** Người dùng FREE tiêu 1 Token để:
*   Mở khóa phân tích thành phần chuyên sâu (Gemini AI Insights).
*   Mở khóa 1 lần quét "Premium-lite" (hiển thị đầy đủ cảnh báo dị ứng cho sản phẩm đó).

### 3.2. Shopee Affiliate Integration

**Luồng kỹ thuật đầy đủ:**
```
User quét barcode
  → Backend lookup Barcode trong Affiliate DB (hoặc gọi Shopee Open Platform API)
  → Nếu có kết quả: Gắn tracking link (sub_id = DICO_userId)
  → Trả về affiliateLink trong response
  → Mobile hiển thị nút "Mua ngay trên Shopee 🛒"
  → User click → mở Shopee App (Deep Link) hoặc WebView
  → Shopee track hoa hồng về DICO account
```

**Response fields cần bổ sung:**
*   `ProductEvaluationResponse`: thêm `String affiliateLink` (sản phẩm vừa quét)
*   `AlternativeProductResponse`: thêm `String affiliateLink` (các gợi ý thay thế)

**Matching Logic:** Dùng Barcode/EAN-13 làm key tra cứu → query Shopee Product API → lấy `item_id` → build affiliate link với Tracking ID của DICO.

---

## 4. Logic Gợi ý Sản phẩm Thay thế (Recommendation Engine)

Hệ thống sử dụng chiến lược **Hybrid Recommendation** để đảm bảo luôn có kết quả hữu ích cho người dùng:

### **4.1. Nguồn dữ liệu (Sources)**
1.  **Database (Sản phẩm cộng đồng):** Ưu tiên các sản phẩm đã được quét và xác minh bởi hệ thống (có Barcode thực).
2.  **Gemini AI (Fallback):** Nếu dữ liệu trong DB ít hơn 3 kết quả, AI sẽ tự động gợi ý các sản phẩm nổi tiếng trong cùng danh mục (chưa có barcode trong DB).

### **4.2. Tiêu chí lựa chọn (Selection Criteria)**
*   **Cùng danh mục (Same Category):** Ví dụ: Sữa tắm sẽ gợi ý sữa tắm, không gợi ý dầu gội.
*   **Tiêu chí An toàn là tiên quyết (Safety First):** 
    *   Sản phẩm thay thế không nhất thiết phải có điểm số cao hơn sản phẩm hiện tại, nhưng **bắt buộc** phải thuộc nhóm an toàn: Rating **GREEN** (Rất an toàn) hoặc **YELLOW** (An toàn).
    *   Hệ thống ưu tiên các sản phẩm có thành phần "Lành tính" nhất trong cùng phân khúc giá và danh mục.
*   **Loại trừ:** Không gợi ý lại chính sản phẩm người dùng vừa quét.

### **4.3. Cá nhân hóa theo Gói dịch vụ (Tier Personalization)**
*   **FREE Users:** Nhận các gợi ý an toàn chung chung trong cùng danh mục.
*   **PREMIUM/GOLD Users:**
    *   **Bộ lọc dị ứng (Allergy Filter):** Tự động loại bỏ các sản phẩm thay thế chứa thành phần mà người dùng bị dị ứng (dựa trên Safety Profile).
    *   AI Prompt sẽ được bổ sung context cá nhân để đưa ra lý do gợi ý thuyết phục hơn (VD: "Sản phẩm này không chứa Cồn khô, phù hợp với da nhạy cảm của bạn").

---

## 5. Đề xuất nâng cấp Premium GOLD (Strengthening Gold Tier)

Để tăng sức hút cho gói GOLD ("Mỏ neo giá trị"), đề xuất bổ sung các "Smart Features" sau:

1.  **Routine Checker (Bác sĩ AI kê toa):** Chụp/Scan cùng lúc 5-6 sản phẩm đang sử dụng. AI phân tích xung đột chéo (VD: AHA/BHA kỵ với Retinol nồng độ cao).
2.  **Safety Profile Chuyên biệt:**
    *   **Mother & Baby Mode:** Kích hoạt bộ quy tắc đánh giá khắt khe theo tiêu chuẩn Nhi khoa.
    *   **Pregnancy Mode:** Cảnh báo các chất nguy hại tiềm ẩn cho thai nhi.
3.  **Advanced Ingredient Filter:** Tìm kiếm sản phẩm không chỉ theo tên, mà theo đặc tính thành phần (VD: "Tìm serum dưỡng trắng không chứa Niacinamide").
4.  **Health Dashboard Integration:** Báo cáo định kỳ tháng về các chỉ số an toàn của các sản phẩm đã sử dụng.
5.  **Priority Verification:** Các sản phẩm do User Gold đóng góp (Contribute) sẽ được AI và Chuyên gia xác minh ưu tiên nhanh nhất.
