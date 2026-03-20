// src/api/mockData.ts
// ============================================================
// DEMO MOCK DATA — dùng để giả lập quét sản phẩm khi demo app
// Các barcode bắt đầu bằng "DEMO_" sẽ được intercept client-side
// KHÔNG gọi API thật — trả về ngay từ hàm getProduct()
// ============================================================

import { ProductEvaluationResponse } from "./types";

// ── Mock Barcode Constants (dùng trong ScannerScreen & CompareScreen) ──
export const MOCK_BARCODES = {
    MILK_SAFE:         "DEMO_MILK_001",        // 🟢 Sữa tươi — an toàn chung
    MILK_ALLERGY:      "DEMO_MILK_ALLERGY",    // 🔴 Sữa đặc có đường — dị ứng sữa/đậu nành
    SNACK_PEANUT:      "DEMO_SNACK_PEANUT",    // 🔴 Bánh snack — dị ứng đậu phộng
    COSMETIC_PARABEN:  "DEMO_COSMETIC_PAR",    // 🟡 Kem dưỡng — Paraben / Fragrance
    BABY_FOOD:         "DEMO_BABY_FOOD",       // 🟡 Bột ăn dặm — lưu ý trẻ em
    HALAL_VEGAN:       "DEMO_HALAL_VEGAN",     // 🟢 Nước ép Halal Vegan
    // ── Compare demo pairs ─────────────────────────────────────────────
    COSMETIC_CLEAN:    "DEMO_COSMETIC_CLEAN",  // 🟢 Serum Vitamin C không paraben
    YOGURT_PROBIOTIC:  "DEMO_YOGURT_PRO",      // 🟢 Sữa chua probiotic
    SNACK_HEALTHY:     "DEMO_SNACK_HEALTHY",   // 🟢 Bánh gạo lứt rong biển (để so sánh với Snack Peanut)
} as const;

// ── Master mock catalog ─────────────────────────────────────────────────
export const MOCK_PRODUCTS: Record<string, ProductEvaluationResponse> = {

    // ── 1. Sữa tươi nguyên chất — AN TOÀN (chung) ─────────────────────
    [MOCK_BARCODES.MILK_SAFE]: {
        barcode: MOCK_BARCODES.MILK_SAFE,
        name: "Sữa Tươi Tiệt Trùng Nguyên Chất Vinamilk 1L",
        brand: "Vinamilk",
        imageUrl: null,
        rating: "GREEN",
        score: 87,
        confidenceScore: 0.94,
        aiSummary:
            "Sữa tươi nguyên chất được tiệt trùng UHT, không chất bảo quản, giàu canxi và protein. " +
            "Phù hợp cho người lớn và trẻ em trên 1 tuổi muốn bổ sung dinh dưỡng hàng ngày. " +
            "Không có thành phần phụ gia đáng lo ngại.",
        overrideReasons: null,
        cachedAt: new Date().toISOString(),
        category: "FOOD",
        categoryWarning: null,
        riskFactors: [],
        ingredientsText:
            "Sữa bò tươi (99.8%), vitamin D3, vitamin A. Không chứa: chất bảo quản, chất tạo màu nhân tạo.",
    },

    // ── 2. Sữa đặc có đường — NGUY HIỂM (dị ứng sữa + đậu nành) ───────
    [MOCK_BARCODES.MILK_ALLERGY]: {
        barcode: MOCK_BARCODES.MILK_ALLERGY,
        name: "Sữa Đặc Có Đường Ông Thọ 380g",
        brand: "Vinamilk",
        imageUrl: null,
        rating: "RED",
        score: 18,
        confidenceScore: 0.91,
        aiSummary:
            "Sản phẩm chứa lượng đường cao (45g/100ml) và nhiều thành phần gây dị ứng phổ biến. " +
            "⚠️ Phát hiện allergen khớp với hồ sơ gia đình: Sữa (milk), Đậu nành (soy). " +
            "Không phù hợp cho thành viên có dị ứng sữa hoặc đậu nành. " +
            "Hàm lượng đường cao, không khuyến khích cho trẻ em dưới 2 tuổi.",
        overrideReasons: [
            "🚨 ALLERGEN MATCH — Hồ sơ 'Bé Tom': Dị ứng SỮA (milk) được phát hiện trong sản phẩm",
            "🚨 ALLERGEN MATCH — Hồ sơ 'Bé Tom': Dị ứng ĐẬU NÀNH (soy) được phát hiện trong sản phẩm",
            "⚠️ Hàm lượng đường rất cao (45g/100ml) — không phù hợp cho trẻ dưới 2 tuổi",
        ],
        cachedAt: new Date().toISOString(),
        category: "FOOD",
        categoryWarning: "⚠️ Sản phẩm có chứa allergen khớp với 1 hoặc nhiều hồ sơ gia đình của bạn",
        riskFactors: ["Dị ứng sữa (milk)", "Dị ứng đậu nành (soy)", "Đường cao"],
        ingredientsText:
            "Sữa bò tươi, đường mía, sữa gầy, đậu nành biến đổi gen, chất nhũ hóa (E471, E472b), " +
            "hương liệu vani tổng hợp. Chứa: Sữa, Đậu nành.",
    },

    // ── 3. Snack Bánh Phồng Tôm — NGUY HIỂM (đậu phộng + hải sản) ─────
    [MOCK_BARCODES.SNACK_PEANUT]: {
        barcode: MOCK_BARCODES.SNACK_PEANUT,
        name: "Snack Bánh Phồng Tôm Hải Vị 100g",
        brand: "Oishi",
        imageUrl: null,
        rating: "RED",
        score: 22,
        confidenceScore: 0.88,
        aiSummary:
            "Bánh snack chứa đồng thời đậu phộng, hải sản có vỏ (tôm) và nhiều phụ gia thực phẩm. " +
            "⚠️ Cực kỳ nguy hiểm với người dị ứng đậu phộng hoặc hải sản. " +
            "Hàm lượng natri cao (480mg/khẩu phần). Không phù hợp cho trẻ dưới 3 tuổi do nguy cơ nghẹn.",
        overrideReasons: [
            "🚨 ALLERGEN MATCH — Hồ sơ 'Bé Tom': Dị ứng ĐẬU PHỘNG (peanut) trong sản phẩm — MỨC ĐỘ NGUY HIỂM CAO",
            "🚨 ALLERGEN MATCH — Hồ sơ 'Bé Tom': Dị ứng HẢI SẢN (shellfish - tôm) trong sản phẩm",
            "⚠️ Hồ sơ 'Bé Tom' (độ tuổi 0-6 tháng): Snack không phù hợp cho trẻ dưới 3 tuổi",
            "⚠️ Natri cao (480mg/khẩu phần) — không phù hợp cho chế độ ăn ít muối",
        ],
        cachedAt: new Date().toISOString(),
        category: "FOOD",
        categoryWarning: "🚨 Chứa nhiều allergen nguy hiểm — cực kỳ nguy hiểm cho người có tiền sử dị ứng",
        riskFactors: ["Đậu phộng (peanut)", "Hải sản có vỏ (shellfish)", "Natri cao", "Phụ gia / chất tạo màu"],
        ingredientsText:
            "Bột sắn, tôm khô (12%), dầu cọ, đậu phộng rang (8%), tinh bột ngô, muối, đường bổ sung, " +
            "bột ngọt (E621), chất tạo màu nhân tạo (E102, E110), chất bảo quản (E211). " +
            "CHỨA: Đậu phộng, Hải sản có vỏ (tôm), Ngô. " +
            "Được sản xuất trên dây chuyền cũng chế biến các sản phẩm chứa cá và đậu nành.",
    },

    // ── 3.5 Bánh Gạo Lứt Rong Biển — AN TOÀN (để so sánh) ──────────────
    [MOCK_BARCODES.SNACK_HEALTHY]: {
        barcode: MOCK_BARCODES.SNACK_HEALTHY,
        name: "Bánh Gạo Lứt Rong Biển Hữu Cơ 80g",
        brand: "Gạo Việt",
        imageUrl: null,
        rating: "GREEN",
        score: 92,
        confidenceScore: 0.96,
        aiSummary:
            "Bánh snack ngũ cốc nguyên cám lành mạnh, nướng không chiên. " +
            "Thành phần thuần chay (Vegan), không đường bổ sung, không phụ gia, không đậu phộng. " +
            "Phù hợp cho chế độ ăn kiêng, ít muối, và an toàn cho hầu hết mọi người. " +
            "Nguồn chất xơ dồi dào từ gạo lứt và rong biển.",
        overrideReasons: null,
        cachedAt: new Date().toISOString(),
        category: "FOOD",
        categoryWarning: null,
        riskFactors: [],
        ingredientsText:
            "Gạo lứt hữu cơ (85%), rong biển khô (8%), dầu mè ép lạnh, muối hầm tự nhiên (2%), hạt mè rang. " +
            "Không thêm đường. Không chiên qua dầu. Không chứa đậu phộng, hải sản hay chất màu. " +
            "Sản phẩm thuần chay (Vegan), Halal.",
    },

    // ── 4. Kem dưỡng ẩm — CẨN THẬN (Paraben + Fragrance) ──────────────
    [MOCK_BARCODES.COSMETIC_PARABEN]: {
        barcode: MOCK_BARCODES.COSMETIC_PARABEN,
        name: "Kem Dưỡng Ẩm Ban Đêm Retinol & Vitamin C 50ml",
        brand: "L'Oréal Paris",
        imageUrl: null,
        rating: "YELLOW",
        score: 52,
        confidenceScore: 0.85,
        aiSummary:
            "Kem dưỡng ẩm ban đêm chứa Retinol nồng độ 0.3% và Vitamin C 5%. " +
            "⚠️ Phát hiện thành phần nhạy cảm mỹ phẩm khớp hồ sơ gia đình: Paraben, Hương liệu tổng hợp, Retinol. " +
            "Không dùng cho phụ nữ mang thai (Retinol). Da nhạy cảm cần test trước khi dùng. " +
            "Không phù hợp cho trẻ em dưới 12 tuổi.",
        overrideReasons: [
            "⚠️ COSMETIC MATCH — Hồ sơ 'Mẹ': Nhạy cảm với PARABEN (methylparaben, propylparaben) trong kem này",
            "⚠️ COSMETIC MATCH — Hồ sơ 'Mẹ': Nhạy cảm với HƯƠNG LIỆU TỔNG HỢP (fragrance) trong kem này",
            "⚠️ COSMETIC MATCH — Hồ sơ 'Mẹ': Nhạy cảm với RETINOL — KHÔNG DÙNG khi mang thai",
            "⚠️ COSMETIC MATCH — Hồ sơ 'Bé Tom': Không phù hợp cho trẻ em (retinol + paraben)",
        ],
        cachedAt: new Date().toISOString(),
        category: "BEAUTY",
        categoryWarning:
            "⚠️ Thành phần mỹ phẩm nhạy cảm khớp với hồ sơ gia đình. Retinol: KHÔNG dùng khi mang thai.",
        riskFactors: ["Paraben", "Hương liệu tổng hợp (Fragrance)", "Retinol (không dùng khi mang thai)"],
        ingredientsText:
            "Aqua, Glycerin, Retinol (0.3%), Ascorbic Acid (5%), Niacinamide, Cetearyl Alcohol, " +
            "Methylparaben, Propylparaben, Butylene Glycol, Fragrance (Parfum), " +
            "Dimethicone, Carbomer, Disodium EDTA, BHT. " +
            "CẢNH BÁO: Không dùng cho phụ nữ mang thai hoặc cho con bú. " +
            "Không dùng cho trẻ em dưới 12 tuổi.",
    },

    // ── 5. Bột ăn dặm trẻ em — CẨN THẬN (Gluten, lưu ý độ tuổi) ───────
    [MOCK_BARCODES.BABY_FOOD]: {
        barcode: MOCK_BARCODES.BABY_FOOD,
        name: "Bột Ăn Dặm Nestle Cerelac Lúa Mạch & Sữa (từ 6 tháng) 200g",
        brand: "Nestlé",
        imageUrl: null,
        rating: "YELLOW",
        score: 61,
        confidenceScore: 0.89,
        aiSummary:
            "Bột ăn dặm dành cho trẻ từ 6 tháng tuổi, giàu sắt và vitamin. " +
            "⚠️ Phát hiện: Hồ sơ 'Bé Tom' (0-6 tháng) — sản phẩm khuyến cáo dùng từ 6 tháng. " +
            "Chứa Gluten (lúa mạch) và Sữa — cần chú ý nếu có tiền sử dị ứng. " +
            "Không thêm đường mía, phù hợp với chế độ ăn lành mạnh cho trẻ.",
        overrideReasons: [
            "⚠️ Hồ sơ 'Bé Tom' (0–6 tháng): Sản phẩm này khuyến cáo dùng từ 6 tháng tuổi trở lên",
            "⚠️ Chứa GLUTEN (lúa mạch) — cần theo dõi phản ứng khi cho trẻ dùng lần đầu",
            "⚠️ Chứa SỮA — không phù hợp nếu trẻ có dị ứng sữa bò",
        ],
        cachedAt: new Date().toISOString(),
        category: "FOOD",
        categoryWarning: "📅 Sản phẩm dành cho trẻ từ 6 tháng tuổi — kiểm tra độ tuổi hồ sơ gia đình",
        riskFactors: ["Gluten (lúa mạch)", "Sữa (milk)", "Lưu ý độ tuổi (6+ tháng)"],
        ingredientsText:
            "Lúa mạch (47%), sữa nguyên chất (25%), đường lactose, dầu thực vật (dầu cọ, dầu canola), " +
            "bột whey, khoáng chất (sắt, kẽm, canxi, photpho), vitamin (A, C, D, B1, B2, B6, B12, acid folic), " +
            "chất nhũ hóa lecithin đậu nành. CHỨA: Sữa, Gluten (lúa mạch), Đậu nành.",
    },

    // ── 6. Nước ép trái cây — AN TOÀN (Halal, Vegan) ───────────────────
    [MOCK_BARCODES.HALAL_VEGAN]: {
        barcode: MOCK_BARCODES.HALAL_VEGAN,
        name: "Nước Ép Táo Nguyên Chất 100% 1L",
        brand: "Vfresh",
        imageUrl: null,
        rating: "GREEN",
        score: 95,
        confidenceScore: 0.98,
        aiSummary:
            "Nước ép táo 100% tự nhiên, không chứa đường tinh luyện bổ sung, không chất bảo quản. " +
            "Sản phẩm đạt chứng nhận thuần chay (Vegan) và Halal. " +
            "An toàn cho mọi lứa tuổi, giàu vitamin C. Phù hợp với người có chế độ ăn kiêng hoặc tôn giáo.",
        overrideReasons: null,
        cachedAt: new Date().toISOString(),
        category: "FOOD",
        categoryWarning: null,
        riskFactors: [],
        ingredientsText:
            "Nước ép táo hoàn nguyên (từ nước cốt táo cô đặc 99.9%), vitamin C. " +
            "Không chứa đường bổ sung, không chất tạo màu nhân tạo, không hương liệu tổng hợp. " +
            "Chứng nhận Vegan & Halal.",
    },

    // ── 7. Serum Vitamin C thuần chay — AN TOÀN (mỹ phẩm) ─────────────
    ["DEMO_COSMETIC_CLEAN"]: {
        barcode: "DEMO_COSMETIC_CLEAN",
        name: "Serum Vitamin C 20% Brightening Skin Glow 30ml",
        brand: "The Ordinary",
        imageUrl: null,
        rating: "GREEN",
        score: 84,
        confidenceScore: 0.92,
        aiSummary:
            "Serum Vitamin C nồng độ cao 20%, không paraben, không hương liệu, không retinol. " +
            "Thành phần tối giản, phù hợp với da nhạy cảm. Cruelty-free & Vegan. " +
            "Làm sáng da, cải thiện sắc tố, chống oxy hóa hiệu quả. " +
            "An toàn cho phụ nữ mang thai (không retinol).",
        overrideReasons: null,
        cachedAt: new Date().toISOString(),
        category: "BEAUTY",
        categoryWarning: null,
        riskFactors: [],
        ingredientsText:
            "Ascorbic Acid (20%), Propanediol, Aqua, Dimethyl Isosorbide, Hydroxypropyl Cyclodextrin. " +
            "Không chứa: Paraben, Fragrance, Sulfate, Retinol, Silicone. " +
            "Vegan & Cruelty-Free. pH: 3.0 (kích hoạt Vitamin C tối ưu).",
    },

    // ── 8. Sữa chua probiotic — AN TOÀN (thực phẩm) ────────────────────
    ["DEMO_YOGURT_PRO"]: {
        barcode: "DEMO_YOGURT_PRO",
        name: "Sữa Chua Probiotic Không Đường TH True Yogurt 100g",
        brand: "TH True Milk",
        imageUrl: null,
        rating: "GREEN",
        score: 91,
        confidenceScore: 0.95,
        aiSummary:
            "Sữa chua thuần túy lên men tự nhiên, không đường bổ sung, không chất bảo quản. " +
            "Chứa 10 tỷ lợi khuẩn Probiotic (L. acidophilus, B. bifidum). " +
            "Giàu canxi và protein. Phù hợp cho người lớn, trẻ trên 1 tuổi. " +
            "Chứa sữa — cần lưu ý nếu có dị ứng sữa bò.",
        overrideReasons: null,
        cachedAt: new Date().toISOString(),
        category: "FOOD",
        categoryWarning: null,
        riskFactors: ["Sữa (milk) — cần lưu ý nếu có dị ứng"],
        ingredientsText:
            "Sữa bò tươi (98%), men sữa chua sống (Lactobacillus acidophilus, Bifidobacterium bifidum, " +
            "Streptococcus thermophilus, Lactobacillus bulgaricus). " +
            "Không thêm: đường, chất tạo màu, chất bảo quản, hương liệu. CHỨA: Sữa.",
    },
};

/**
 * Kiểm tra barcode có phải mock không
 */
export const isMockBarcode = (barcode: string): boolean =>
    barcode.startsWith("DEMO_");

/**
 * Lấy mock product theo barcode — trả về Promise để match interface getProduct
 */
export const getMockProduct = (barcode: string): ProductEvaluationResponse | null =>
    MOCK_PRODUCTS[barcode] ?? null;

// ── Compare Preset Pairs ────────────────────────────────────────────────
// Mỗi pair: cùng category, để demo tính năng so sánh cùng loại
export const COMPARE_PRESETS: Array<{
    labelA: string;
    labelB: string;
    barcodeA: string;
    barcodeB: string;
    category: "FOOD" | "BEAUTY";
    icon: string;
}> = [
    {
        icon: "🧴",
        category: "BEAUTY",
        labelA: "Kem Retinol",
        barcodeA: MOCK_BARCODES.COSMETIC_PARABEN,
        labelB: "Serum Vitamin C",
        barcodeB: MOCK_BARCODES.COSMETIC_CLEAN,
    },
    {
        icon: "🍘",
        category: "FOOD",
        labelA: "Snack tôm",
        barcodeA: MOCK_BARCODES.SNACK_PEANUT,
        labelB: "Gạo lứt",
        barcodeB: MOCK_BARCODES.SNACK_HEALTHY,
    },
    {
        icon: "🍼",
        category: "FOOD",
        labelA: "Sữa chua",
        barcodeA: MOCK_BARCODES.YOGURT_PROBIOTIC,
        labelB: "Bột ăn dặm",
        barcodeB: MOCK_BARCODES.BABY_FOOD,
    },
];
