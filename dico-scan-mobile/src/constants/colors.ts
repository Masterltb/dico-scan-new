// src/constants/colors.ts
// Design System — Light Mode (theo Figma frame mới)
// Palette chính: nền trắng, primary tím-xanh #6B7FE8, text đen đậm

import { RatingColor } from "@/api/types";

export const RATING_COLORS: Record<
    RatingColor,
    { bg: string; text: string; label: string; description: string; light: string }
> = {
    GREEN: { bg: "#22C55E", text: "#FFFFFF", label: "An toàn", description: "Sản phẩm ít rủi ro", light: "#DCFCE7" },
    YELLOW: { bg: "#F59E0B", text: "#FFFFFF", label: "Cẩn thận", description: "Nên dùng điều độ", light: "#FEF3C7" },
    RED: { bg: "#EF4444", text: "#FFFFFF", label: "Nguy hiểm", description: "Không khuyến khích", light: "#FEE2E2" },
    UNKNOWN: { bg: "#9CA3AF", text: "#FFFFFF", label: "Chưa rõ", description: "Thiếu dữ liệu đánh giá", light: "#F3F4F6" },
};

export const COLORS = {
    // === Core palette — Light Mode ===
    primary: "#6B7FE8",          // Xanh-tím chính (button, icon active)
    primaryDark: "#5A6CD4",      // Hover / pressed state
    primaryLight: "#EEF0FD",     // Nền nhạt cho chip active, badge
    primaryGradient: ["#8B9CF4", "#6B7FE8"] as string[], // Gradient splash

    // === Backgrounds ===
    background: "#FFFFFF",        // Nền chính — trắng
    backgroundAlt: "#F5F6FF",    // Nền phụ hơi xanh nhạt
    surface: "#F0F1FA",          // Card surface — xám tím nhạt
    card: "#FFFFFF",             // Card nền trắng
    scannerBg: "#1A1B2E",        // Chỉ dùng cho scanner (dark)

    // === Text ===
    text: "#1A1B2E",             // Text chính — navy đậm (đọc được trên nền trắng)
    textMuted: "#9EA0B7",        // Text phụ
    textSecondary: "#6B6D8A",    // Text cấp 2
    textInvert: "#FFFFFF",       // Text trên nền tối

    // === Borders ===
    border: "#E8E9F2",           // Border nhẹ
    borderStrong: "#C8CAE8",     // Border đậm hơn

    // === Status ===
    success: "#22C55E",
    successLight: "#DCFCE7",
    successText: "#15803D",
    warning: "#F59E0B",
    warningLight: "#FEF3C7",
    warningText: "#B45309",
    danger: "#EF4444",
    dangerLight: "#FEE2E2",
    dangerText: "#B91C1C",

    // === Misc ===
    white: "#FFFFFF",
    black: "#000000",
    overlay: "rgba(0, 0, 0, 0.5)",
    overlayLight: "rgba(107, 127, 232, 0.08)",

    // === Splash gradient (lavender → pink haze) ===
    splashTop: "#A8B5F8",
    splashBottom: "#E8C5F0",
} as const;
