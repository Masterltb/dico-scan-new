# 10 – Mobile Product Specification V2

Tài liệu này định nghĩa toàn bộ yêu cầu sản phẩm cho **DICO Scan Mobile App** (React Native / Expo). Đây là nguồn sự thật duy nhất (single source of truth) cho frontend developers.

---

## 1. Mục tiêu sản phẩm

| Chỉ số | Mục tiêu |
|---|---|
| Thời gian phản hồi từ scan đến thấy kết quả | **< 2 giây** (cache hit) |
| Thời gian phản hồi cache miss (gọi OFF + AI) | **< 3 giây** |
| Ngôn ngữ hiển thị | **Tiếng Việt** (primary), English (fallback) |
| Nền tảng | iOS 16+, Android 10+ |

---

## 2. Màn hình & Luồng Nghiệp vụ

### Screen 01 – HomeScreen (`/`)

**Mục đích:** Điểm khởi đầu chính. Hiển thị Camera scanner và lịch sử quét gần đây.

**Components:**
- `CameraScanner` — full-screen camera với overlay hướng dẫn frame barcode
- `RecentHistoryList` — 5 sản phẩm gần nhất (barcode, tên, màu nhãn)
- `SettingsIconButton` — điều hướng sang PreferencesScreen
- `TokenBadge` (Dành cho FREE) — Nút/Huy hiệu góc màn hình hiển thị số **Dico Xu** đang có. Bấm vào ra popup mời xem Rewarded Ad.
- `ProfileSelector` (Dành cho GOLD) — Dropdown nằm trên camera, hiển thị "Đang quét cho: [Tên Profile]". Mặc định là Bản thân. Mở ra danh sách Family Profiles.

**Luồng:**
```
HomeScreen
  → [Quét barcode thành công] → apiClient.getProduct(barcode)
    → [200 OK] → ResultScreen
    → [404 Not Found] → ContributeScreen
    → [503 Lỗi] → Hiển thị inline error toast
```

**Acceptance Criteria:**
- [ ] AC_HOME_01: Camera preview render trong vòng 500ms khi mở app
- [ ] AC_HOME_02: Debounce scan event: 1 scan / 2 giây để tránh spam API
- [ ] AC_HOME_03: Khi app ở nền (background) → tắt Camera để tiết kiệm pin

---

### Screen 02 – ResultScreen (`/result/:barcode`)

**Mục đích:** Hiển thị kết quả đánh giá sản phẩm.

**Components:**
- `RatingBadge` — Hiển thị màu GREEN / YELLOW / RED với icon và text mô tả
- `ScoreBar` — Thanh điểm 0–100 (lấy data từ `score` field)
- `AiSummaryCard` — Khung trắng chứa text tóm tắt AI (tiếng Việt, < 50 từ)
- `OverrideWarningCard` — Hiển thị khi `override_reasons` không rỗng (màu đỏ nổi bật)
- `ProductInfoHeader` — Ảnh sản phẩm, tên, thương hiệu
- `ContributeButton` — Chỉ hiển thị khi rating = `UNKNOWN`
- `UnlockPremiumLiteButton` (Dành cho FREE) — Nếu FREE user quét và bị ẩn lý do Allergy Conflict, hiển thị nút "Dùng 1 Xu để xem Cảnh báo Dị ứng!". Nút này dùng API với `?useToken=true`.

**Luồng:**
```
ResultScreen
  → [Pull to refresh] → gọi lại API, bỏ qua cache local
  → [Nút Quét tiếp] → back to HomeScreen
  → [Override warning hiển thị] → Không cho phép bỏ qua, highlight đỏ
```

**Acceptance Criteria:**
- [ ] AC_RESULT_01: Màu nền của `RatingBadge` phải khớp: GREEN=#22C55E, YELLOW=#EAB308, RED=#EF4444, UNKNOWN=#6B7280
- [ ] AC_RESULT_02: `AiSummaryCard` hiển thị text fallback "Đang phân tích..." nếu `aiSummary` là null
- [ ] AC_RESULT_03: `OverrideWarningCard` PHẢI hiển thị nếu `override_reasons.length > 0` — không được ẩn
- [ ] AC_RESULT_04: Mobile KHÔNG tự tính màu từ điểm, chỉ đọc `rating` field trả về từ API

---

### Screen 03 – PreferencesScreen (`/preferences`)

**Mục đích:** Cho phép người dùng khai báo dị ứng và chế độ ăn.

**Components:**
- `AllergyTagSelector` — Danh sách tags có thể bật/tắt (tối đa 5 tags)
- `DietPicker` — Dropdown: Không giới hạn / Chay / Thuần chay / Ít đường / Ít muối
- `SaveButton` — Gọi `PUT /v1/users/me/preferences`

**Danh sách Allergens mặc định:**
`Gluten`, `Peanut`, `Shellfish`, `Milk`, `Egg`, `Soy`, `Tree Nut`, `Fish`

**Acceptance Criteria:**
- [ ] AC_PREF_01: Không cho phép chọn quá 5 allergen tags (disabled sau khi đủ 5)
- [ ] AC_PREF_02: Preferences được lưu vào `AsyncStorage` (offline-first) và đồng bộ lên server
- [ ] AC_PREF_03: Khi quét barcode, allergies từ store được tự động đính kèm vào query params

---

### Screen 04 – ContributeScreen (`/contribute/:barcode`)

**Mục đích:** Cho phép upload ảnh khi sản phẩm không có trong hệ thống (404).

**Components:**
- `CameraCapture` hoặc `ImagePicker` — chụp ảnh nhãn sản phẩm
- `ImagePreview` — Xem trước ảnh trước khi gửi
- `SubmitButton` — Gọi `POST /v1/contribute` (multipart/form-data)

**Acceptance Criteria:**
- [ ] AC_CONTRIB_01: Chỉ cho phép ảnh JPG/PNG, tối đa 10MB
- [ ] AC_CONTRIB_02: Hiển thị progress indicator khi upload đang chạy
- [ ] AC_CONTRIB_03: Khi nhận 202 Accepted → hiển thị màn hình cảm ơn và back về Home

---

### Screen 05 – HistoryScreen (`/history`)

**Mục đích:** Xem lịch sử tất cả các lần quét.

**Components:**
- `ScanHistoryList` — Danh sách vô hạn (infinite scroll), mỗi item: tên, ngày, màu nhãn
- `FilterBar` — Lọc theo màu: ALL / GREEN / YELLOW / RED

**Acceptance Criteria:**
- [ ] AC_HIST_01: Infinite scroll — gọi API theo trang, 20 items/page
- [ ] AC_HIST_02: Mỗi item có thể click → điều hướng sang ResultScreen với barcode tương ứng

---

### Screen 06 – FamilyProfilesScreen (`/family-profiles`) (NEW)

**Mục đích:** Quản lý hồ sơ người thân (chỉ dành cho tài khoản `PREMIUM_GOLD`).

**Components:**
- `ProfileList` — Hiển thị danh sách người thân đã tạo (Tên, Mối quan hệ, Số dị ứng).
- `AddProfileForm` — Form nhập: Tên, Mối quan hệ, Selector 5 tags Allergy, Chế độ ăn.
- `PaywallBanner` — Hiển thị overlay khoá tính năng nếu User là FREE hoặc PREMIUM (kèm nút "Nâng cấp Gold 420k").

**Acceptance Criteria:**
- [ ] AC_FP_01: Chỉ hiển thị nội dung CRUD khi user.subscriptionTier === 'PREMIUM_GOLD'. Nếu không, block bằng PaywallBanner.
- [ ] AC_FP_02: Đồng bộ list profiles này xuống `HomeScreen` để hiển thị ở component `ProfileSelector`.

---

### Feature – Token / Rewarded Ads (Feature)
**Mục đích:** Hệ thống thưởng "xu" cho Free User xem quảng cáo.

**Luồng:**
1. User bấm vào `TokenBadge` ở trang Home → Popup: "Xem 1 video quảng cáo ngắn để nhận 1 Dico Xu".
2. Khởi tạo Rewarded Video Ad (AdMob/Expo).
3. `onAdClosed(reward=true)` → App gọi `POST /v1/users/me/tokens/reward`.
4. Cộng 1 Dico Xu vào Global State.

---

## 3. Global UX Rules

| Rule | Mô tả |
|---|---|
| **UX_01** | Tất cả các màn hình phải hiển thị loading skeleton khi đang fetch data |
| **UX_02** | Lỗi network → Hiển thị `ErrorBanner` với nút "Thử lại" |
| **UX_03** | Dark mode bắt buộc hỗ trợ (hệ thống) |
| **UX_04** | Font chính: `Inter` (Google Fonts) |
| **UX_05** | Mọi button có touch feedback (scale animation `0.97`) |
