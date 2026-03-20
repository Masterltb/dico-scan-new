// src/api/types.ts
// Mirrors backend DTO types exactly. Update when backend DTOs change.

export type RatingColor = "GREEN" | "YELLOW" | "RED" | "UNKNOWN";

/** Mirrors: ProductEvaluationResponse.java */
export interface ProductEvaluationResponse {
    barcode: string;
    name: string | null;
    brand: string | null;
    imageUrl: string | null;
    rating: RatingColor;
    score: number | null;
    confidenceScore: number;
    aiSummary: string | null;
    overrideReasons: string[] | null;
    cachedAt: string;
    category: string | null;
    categoryWarning: string | null;
    riskFactors: string[] | null;
    ingredientsText: string | null;
}

/** Mirrors: ScanHistoryItemResponse.java */
export interface ScanHistoryItem {
    scanId: string;
    barcode: string;
    scannedAt: string;
    snapshotColor: RatingColor;
    name?: string | null; // populated by mobile from product cache if available
    imageUrl?: string | null;
}

/** Generic Page<T> response from Spring Data */
export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number; // current page (0-based)
    size: number;
}

/** Mirrors: UserPreferencesResponse.java */
export interface UserPreferencesResponse {
    allergies: string[];
    diet: string;
    subscriptionTier: 'FREE' | 'PREMIUM' | 'PREMIUM_GOLD';
    profileCompleted: boolean;
    safetyProfile?: SafetyProfileResponse;
}

/** Mirrors: StandardError.java */
export interface StandardError {
    errorCode: string;
    message: string;
    traceId: string;
}

/** Mirrors: UpdatePreferencesRequest.java */
export interface UpdatePreferencesRequest {
    allergies: string[];
    diet: string;
    safetyProfile?: SafetyProfileRequest;
}

export const ALLERGEN_OPTIONS = [
    "gluten",
    "peanut",
    "shellfish",
    "milk",
    "egg",
    "soy",
    "tree_nut",
    "fish",
] as const;

export type AllergenKey = (typeof ALLERGEN_OPTIONS)[number];

export const DIET_OPTIONS = [
    { label: "Không giới hạn", value: "NONE" },
    { label: "Chay", value: "VEGETARIAN" },
    { label: "Thuần chay", value: "VEGAN" },
    { label: "Ít đường", value: "LOW_SUGAR" },
    { label: "Ít muối", value: "LOW_SALT" },
] as const;

// ===== SAFETY PROFILE TYPES =====

export interface ChildProfileRequest {
    ageGroup: string | null;
    allergies: string[];
    customAllergies: string[];
    severityLevel: string | null;
}

export interface PregnancyProfileRequest {
    trimester: string | null;
    alertLevel: string | null;
}

export interface SafetyProfileRequest {
    targets: string[];
    childProfile: ChildProfileRequest | null;
    pregnancyProfile: PregnancyProfileRequest | null;
    foodAllergies: string[];
    customFoodAllergies: string[];
    cosmeticSensitivities: string[];
    customCosmeticSensitivities: string[];
    skinType: string | null;
    healthConditions: string[];
    dietaryPreferences: string[];
    alertLevel: string | null;
    allergySeverity: string | null;
}

export interface SafetyProfileResponse extends SafetyProfileRequest {
    profileCompleted: boolean;
}

// ===== WIZARD OPTION CONSTANTS =====

export const TARGET_OPTIONS = [
    { label: "🧑 Bản thân", value: "SELF", desc: "Hồ sơ cho chính bạn" },
    { label: "👶 Trẻ em", value: "CHILD", desc: "Bảo vệ con bạn" },
    { label: "🤰 Mang thai", value: "PREGNANT", desc: "Thai kỳ an toàn" },
    { label: "🏥 Bệnh lý", value: "MEDICAL", desc: "Có bệnh nền" },
    { label: "📋 Chung", value: "GENERAL", desc: "Quan tâm sức khỏe" },
] as const;

export const CHILD_AGE_OPTIONS = [
    { label: "0–6 tháng", value: "M0_6" },
    { label: "6–12 tháng", value: "M6_12" },
    { label: "1–3 tuổi", value: "Y1_3" },
    { label: "4–6 tuổi", value: "Y4_6" },
    { label: "7–12 tuổi", value: "Y7_12" },
    { label: "12+ tuổi", value: "Y12_PLUS" },
] as const;

export const FOOD_ALLERGY_OPTIONS = [
    { label: "🥜 Đậu phộng", value: "peanut" },
    { label: "🌰 Hạt cây", value: "tree_nut" },
    { label: "🥛 Sữa", value: "milk" },
    { label: "🥚 Trứng", value: "egg" },
    { label: "🌾 Gluten", value: "gluten" },
    { label: "🦐 Hải sản có vỏ", value: "shellfish" },
    { label: "🐟 Cá", value: "fish" },
    { label: "🫘 Đậu nành", value: "soy" },
    { label: "🌿 Cần tây", value: "celery" },
    { label: "🫒 Mè (vừng)", value: "sesame" },
    { label: "🍯 Mật ong", value: "honey" },
    { label: "🫑 Ớt/tiêu", value: "pepper" },
    { label: "🧄 Tỏi", value: "garlic" },
    { label: "🌽 Bắp (ngô)", value: "corn" },
] as const;

export const COSMETIC_SENSITIVITY_OPTIONS = [
    { label: "Paraben", value: "paraben" },
    { label: "Sulfate (SLS/SLES)", value: "sulfate" },
    { label: "Hương liệu tổng hợp", value: "fragrance" },
    { label: "Formaldehyde", value: "formaldehyde" },
    { label: "Cồn (Alcohol)", value: "alcohol" },
    { label: "Retinol", value: "retinol" },
    { label: "AHA/BHA", value: "aha_bha" },
    { label: "Silicone", value: "silicone" },
    { label: "Mineral Oil", value: "mineral_oil" },
    { label: "Phẩm màu nhân tạo", value: "artificial_dye" },
] as const;

export const SKIN_TYPE_OPTIONS = [
    { label: "🫧 Da dầu", value: "OILY" },
    { label: "🏜️ Da khô", value: "DRY" },
    { label: "⚖️ Da hỗn hợp", value: "COMBINATION" },
    { label: "🌡️ Da nhạy cảm", value: "SENSITIVE" },
    { label: "❓ Không rõ", value: "UNKNOWN" },
] as const;

export const HEALTH_CONDITION_OPTIONS = [
    { label: "🤰 Đang mang thai", value: "PREGNANT" },
    { label: "🤱 Đang cho con bú", value: "BREASTFEEDING" },
    { label: "👶 Trẻ dưới 12 tuổi", value: "CHILD_UNDER_12" },
    { label: "💉 Tiểu đường", value: "DIABETES" },
    { label: "💓 Cao huyết áp", value: "HYPERTENSION" },
    { label: "🫘 Bệnh thận", value: "KIDNEY_DISEASE" },
    { label: "🫁 Bệnh gan", value: "LIVER_DISEASE" },
    { label: "✅ Không có", value: "NONE" },
] as const;

export const DIETARY_PREF_OPTIONS = [
    { label: "🌱 Thuần chay (Vegan)", value: "VEGAN" },
    { label: "🥬 Chay (Vegetarian)", value: "VEGETARIAN" },
    { label: "🥗 Eat Clean", value: "EAT_CLEAN" },
    { label: "🌿 Organic", value: "ORGANIC" },
    { label: "☪️ Halal", value: "HALAL" },
    { label: "✅ Không giới hạn", value: "NONE" },
] as const;

export const ALERT_LEVEL_OPTIONS = [
    { label: "🔴 Nghiêm ngặt", value: "STRICT", desc: "Cảnh báo mọi nguy cơ, kể cả nhỏ" },
    { label: "🟡 Trung bình", value: "MODERATE", desc: "Cảnh báo nguy cơ rõ ràng" },
    { label: "🟢 Cơ bản", value: "BASIC", desc: "Chỉ cảnh báo nguy cơ cao" },
] as const;

export const SEVERITY_OPTIONS = [
    { label: "🟢 Nhẹ", value: "MILD", desc: "Khó chịu nhẹ, không nguy hiểm" },
    { label: "🟡 Trung bình", value: "MODERATE", desc: "Cần tránh nhưng không cấp cứu" },
    { label: "🔴 Nặng", value: "SEVERE", desc: "Nguy hiểm tính mạng, cần tránh tuyệt đối" },
] as const;

export const TRIMESTER_OPTIONS = [
    { label: "Tam cá nguyệt 1 (1-12 tuần)", value: "TRIMESTER_1" },
    { label: "Tam cá nguyệt 2 (13-26 tuần)", value: "TRIMESTER_2" },
    { label: "Tam cá nguyệt 3 (27-40 tuần)", value: "TRIMESTER_3" },
    { label: "Không rõ", value: "UNKNOWN" },
] as const;

// ===== SUBSCRIPTION & TOKEN TYPES =====

export interface UserSubscriptionStatusResponse {
    tier: 'FREE' | 'PREMIUM' | 'PREMIUM_GOLD';
    availableTokens: number;
    premiumExpiryDate: string | null;
}

export interface TokenRewardResponse {
    availableTokens: number;
    message: string;
}

// ===== FAMILY PROFILE TYPES =====

export interface CreateFamilyProfileRequest {
    name: string;
    relationship: string;
    safetyProfile?: Partial<SafetyProfileRequest>;
}

export interface FamilyProfileResponse {
    id: string;
    name: string;
    relationship: string;
    safetyProfile: Partial<SafetyProfileRequest>;
}

// ===== FAVORITE TYPES =====
export interface FavoriteProductResponse {
    id: string;
    userId: string;
    barcode: string;
    label: 'SAFE' | 'AVOID';
    note: string | null;
    addedAt: string;
}
