# 13 – Mobile Component Specification (Gen Z Wellness Edition)

Tài liệu này định nghĩa hệ thống Design System và Component UI của DICO Scan Mobile. Giao diện được thiết kế theo phong cách **Mềm mại, Thân thiện, Pastel (giống app Elfie)**, hướng đến tập người dùng Gen Z, mẹ bỉm sữa và người quan tâm sức khỏe. 

*Triết lý thiết kế: AI-first (thông minh), Thấu cảm (thân thiện, không dùng tông màu lạnh lẽo/technical), Card-based (gọn gàng), và Quyết định nhanh (< 5s).*

---

## 1. Design Tokens (Light-Mode First)

Sử dụng thư viện NativeWind v4 kết hợp trực tiếp với Tailwind classes, hoặc custom variables.

### 1.1 Colors (Pastel-Driven & Semantics)
Bảng màu uỷ thác ánh sáng (Light-mode first), sử dụng nền siêu nhạt (Off-white/Soft gray) và các Card màu trắng (Pure White).

```typescript
// src/constants/theme.ts
export const COLORS = {
  // Brand & Background
  background: "#F9FAFB", // Nền chính của app (Gray-50)
  surface: "#FFFFFF",    // Nền của các Card (Trắng tinh)
  primary: "#818CF8",    // Indigo-400 (Mềm hơn bản cũ)
  primaryLight: "#EEF2FF", // Màu nền cho chip/button nhạt
  
  // Accents (Gen Z Wellness Pastel)
  peach: "#FFDDBF",
  lavender: "#E0E7FF",
  mint: "#D1FAE5",

  // Typography
  textMain: "#1E293B",   // Slate-800 (Không dùng đen thui)
  textMuted: "#64748B",  // Slate-500
  border: "#E2E8F0",     // Slate-200
  
  // Semantic / Safety levels (Vẫn giữ độ tương phản cao nhưng không quá chói)
  success:    { bg: "#22C55E", lightBg: "#DCFCE7", text: "#14532D", icon: "#16A34A" }, // An toàn (Green)
  warning:    { bg: "#F59E0B", lightBg: "#FEF3C7", text: "#78350F", icon: "#D97706" }, // Cẩn thận (Yellow/Amber)
  danger:     { bg: "#EF4444", lightBg: "#FEE2E2", text: "#7F1D1D", icon: "#DC2626" }, // Nguy hiểm (Red)
  unknown:    { bg: "#94A3B8", lightBg: "#F1F5F9", text: "#334155", icon: "#64748B" }, // Chưa rõ
};
```

### 1.2 Border Radius, Spacing & Shadows (Soft UI)
UI bo tròn, tránh các góc nhọn sắc bén.

```typescript
export const RADIUS = {
  sm: 8,
  md: 16,     // Mặc định cho Tags, Chips
  lg: 24,     // Mặc định cho Card
  xl: 32,
  full: 9999, // Pill shape
};

export const SPACING = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};

export const SHADOWS = {
  soft: "0px 4px 20px rgba(0, 0, 0, 0.04)", // Shadow rất nhẹ giúp nổi bật card trên nền nhạt
  float: "0px 8px 30px rgba(0, 0, 0, 0.08)", // Dành cho BottomSheet, Modal 
};
```

### 1.3 Motion & Typography
* **Motion:** Ưu tiên Fade & Slide nhẹ. `duration: 300ms`, `easing: ease-out`. Không giật cục.
* **Typography:** Ưu tiên font tròn trịa hoặc hiện đại (Inter, Poppins, hoặc Quicksand).

| Token | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `h1` | 24 | Bold | 32 | Tiêu đề chính màn hình |
| `h2` | 20 | SemiBold | 28 | Tên sản phẩm, Tên Section |
| `subtitle` | 16 | Medium | 24 | Tên thành phần, Nút bấm |
| `body` | 16 | Regular | 24 | Nội dung AI đọc lướt |
| `caption` | 14 | Regular | 20 | Text phụ, ngày giờ, disclaimer|
| `tiny` | 12 | Medium | 16 | Label trên Badge |

---

## 2. Core Components (Redesigned)

### `SectionCard` (NEW)
Component bọc nội dung chuẩn. Layout Card-based giúp tách biệt các thông tin (Max 3-5 cards/màn hình).
* **Visual:** Nền `COLORS.surface` (Trắng), góc bo `RADIUS.lg` (24px), viền `border` rất nhạt hoặc `SHADOWS.soft`.
* **Props:** `title?` (string), `icon?` (ReactNode), `children`, `action?` (button nhỏ ở góc).

### `PrimaryButton` & `SecondaryButton` (NEW)
Chấm dứt việc xài button mặc định của text/opacity.
* **PrimaryButton:** 
  * Shape: Pill (`RADIUS.full`) hoặc `RADIUS.xl`. Chiều cao `56px` (touch-friendly).
  * Color: Background `primary` (Indigo), Text trắng. Font `subtitle` (Bold). Haptic feedback khi chạm. Thêm state `isLoading` (hiện spinner, mờ text).
* **SecondaryButton:** 
  * Background `primaryLight`, Text `primary`. (Hoặc ghost button cho thao tác huỷ).

### `RatingBadge`
Nâng cấp từ badge cũ thô cứng sang dạng Status Chip thanh lịch.
* **Visual:** Dùng màu `lightBg` làm khung, text màu `text` của cấp độ màu, đi kèm Icon (VD: ✅ An toàn, ⚠️ Lưu ý, ⛔ Nguy hiểm).
* **Shape:** Pill, padding ngang dọc hợp lý, font `tiny` hoặc `caption` in hoa.

### `ScoreBar`
Thanh điểm giờ đây cong tròn 2 đầu, gradient mềm mỏng hơn. Sử dụng chung cho Score 0-100. Kích thước bar dày hơn (chiều cao 8-12px) để dễ nhìn.

### `OverrideWarningCard`
Thiết kế lại không dùng nền đỏ thẫm chói lọi. 
* **Visual:** Nền `danger.lightBg` (Hồng pastel nhạt), viền `danger.bg`. Icon ⚠️ bọc trong hình tròn màu đỏ nho nhỏ. 
* **Layout:** Tiêu đề "Cảnh báo an toàn!" chữ đỏ đậm + bullet points giải thích lý do ngắn gọn. Tuyệt đối không xài chữ đỏ rực trên nền trắng diện rộng gây đau mắt.

---

## 3. Chuyên đề: AI Result UX Structure (CRITICAL)

Dữ liệu trả về của GenAI tuy rất thông minh nhưng **KHÔNG ĐƯỢC PHÉP** đổ ra nguyên một cục `<Text>` dài lằng nhằng. UX phải thiết kế sao cho lướt qua dưới 5 giây là hiểu.

Màn hình `ResultScreen` phải chia thành các Modules:

### Module 1: `AiConclusionBlock`
* **Hiển thị đầu tiên:** Kết luận siêu ngắn từ AI (VD: *"Sản phẩm này an toàn cho bạn, nhưng hãy lưu ý thành phần cồn nếu da bạn đang bong tróc"*).
* **Visual:** Khung chữ nhật bo góc 24px, nền Gradient dịu (Lavender to Mint), font Medium, thêm icon Sparkle ✨ góc trên để đánh dấu dấu ấn của AI.

### Module 2: `RiskIngredientList` (NEW `IngredientTag`)
* **Chức năng:** Trích xuất các hoạt chất đáng chú ý (AHA, Retinol, Peanut, Paraben...) thành dạng Tag/Chip.
* **Component `IngredientTag`:** Hình Oval, viền nhạt. Chấm tròn trạng thái (Đỏ, Vàng, Xanh) ở đầu + Tên thành phần. Tap vào Tag để hiện Tooltip hoặc xổ xuống (Accordion) xem chi tiết tại sao chất này bị bắt lỗi. (Progressive Disclosure).

### Module 3: `QuickActionChip` (NEW)
* Thanh trượt ngang (Horizontal Scroll) ngay dưới AI Conclusion chứa các tính năng Action:
   * 🌟 `Thêm vào Yêu thích`
   * 🛒 `Tìm sản phẩm thay thế (Premium)`
   * 💬 `Hỏi chi tiết AI (Sắp ra mắt)`

### Module 4: `ProgressStepIndicator` (NEW)
* Trạng thái Loading của màn hình này khác biệt. Thay vì Spin vòng tròn buồn chán, hãy hiện thanh tiến độ text:
   1. Đang quét mã vạch... (✅)
   2. Đối chiếu cơ sở dữ liệu... (✅)
   3. Khớp hồ sơ dị ứng cá nhân... (⏳ Đang nhấp nháy pulse)
   4. Phân tích bởi DICO AI... 

---

## 4. Upgraded Camera Scanner UX

Màn hình scan không chỉ là đục lỗ camera. Nó phải hướng dẫn người dùng giao tiếp tốt.

* **Scan Guide Overlay:** Tuỳ chỉnh mask tối xung quanh, vùng camera hình bo tròn 16px (GenZ vibe), viền bounding box nhấp nháy nhẹ.
* **Torch Toggle:** Nút bật đèn Flash to rõ ở góc để quét ban đêm.
* **Permission States:** Nếu từ chối camera, giao diện hiện cái Card vui vẻ: *"Hix, DICO cần Camera mới đọc được mã vạch chứ!"* kèm nút mở Cài đặt.
* **Fallback Manual Input:** Phía dưới màn hình luôn có thanh `SecondaryButton` -> Chạm vào kéo `BottomSheet` lên để user tự GÕ tay mã số (Phòng trường hợp camera hỏng, tem mờ, thiếu ánh sáng).
* **Success Feedback:** Quét trúng rung nhẹ Haptic (`Haptics.impactAsync`) và phát ra âm thanh ngắn bíp mượt.

---

## 5. Other Important Components

### `BottomSheet` (NEW)
* Dùng cho mọi thao tác nhỏ (Nhập mã thủ công, Gợi ý, Thông tin chi tiết chất). 
* Kéo vuốt trượt đóng dễ dàng, Header có thanh kéo nhỏ, bo góc màn hình trên `RADIUS.xl`.

### `ScreenHeader` (NEW)
* Navbar chuẩn chỉ thay thế header mặc định của React Navigation. Nền trắng/trong suốt. Tiêu đề căn giữa, nút Back bo tròn hình tròn (có nền xám mờ).

### `ErrorBanner` & `EmptyState`
* Không dùng text khô khan. Sử dụng Minh hoạ 2D (Illustration - Elfie style) hoặc Emoji bự (ví dụ: 🕵️‍♀️, 🪫). Kêu gọi hành động rõ ràng bằng `PrimaryButton` (VD: "Quét lại", "Tải lại trang").

### `AllergyTagSelector` (Preferences)
* Tách bạch layout: Tags hiển thị grid 3-4 cột. Color nhã nhặn. Khi active thì pill chuyển sang màu `primary`, chữ trắng, có icon check 
nhẹ `✓`.

---

## 6. Lộ trình Triển khai Design System trong Code

1. Lập tức cập nhật `src/constants/theme.ts` thay thế hoàn toàn cho file colors cũ.
2. Tại Sprint 2 (Xây dựng UI), team Frontend cần chia ra Folder `src/components/ui/` (chứa Nút, Card, BottomSheet) và `src/components/domain/` (chứa AiConclusionBlock, RatingBadge...). 
3. Liên tục test màu sắc trên thiết bị thật (kiểm tra độ chói của warning/danger). Tránh tình trạng quá pastel làm mất đi cảnh báo an toàn cốt lõi.
