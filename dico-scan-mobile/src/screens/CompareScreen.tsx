// src/screens/CompareScreen.tsx
// So sánh 2 sản phẩm side-by-side — cùng category
// Features:
//   • Preset quick-compare (Demo pairs)
//   • Barcode nhập tay cho sản phẩm thật
//   • Validation cùng category (FOOD vs FOOD, BEAUTY vs BEAUTY)
//   • Panel điểm mạnh / điểm yếu ngắn gọn

import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Platform,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { COLORS, RATING_COLORS } from "@/constants/colors";
import { getProduct } from "@/api/products";
import { queryKeys } from "@/constants/queryKeys";
import { ProductEvaluationResponse } from "@/api/types";
import { COMPARE_PRESETS, MOCK_BARCODES } from "@/api/mockData";

type Props = NativeStackScreenProps<RootStackParamList, "Compare">;

// ── Helpers ────────────────────────────────────────────────────────────────
const getCategoryLabel = (cat: string | null | undefined) => {
    if (cat === "BEAUTY") return { label: "Mỹ phẩm", icon: "🧴" };
    if (cat === "FOOD") return { label: "Thực phẩm", icon: "🥗" };
    return { label: "Khác", icon: "📦" };
};

const getProductIcon = (product: ProductEvaluationResponse) => {
    if (product.category === "BEAUTY") return "🧴";
    if (product.barcode.includes("MILK")) return "🥛";
    if (product.barcode.includes("SNACK")) return "🍟";
    if (product.barcode.includes("BABY")) return "🍼";
    if (product.barcode.includes("YOGURT")) return "🥛";
    if (product.barcode.includes("HALAL")) return "🍏";
    return "📦";
};

/** Derive điểm mạnh (+) và điểm yếu (-) từ product data */
function deriveStrengthsWeaknesses(product: ProductEvaluationResponse): {
    strengths: string[];
    weaknesses: string[];
} {
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    const score = product.score ?? 0;
    const text = (product.ingredientsText ?? "") + " " + (product.aiSummary ?? "");

    // Strengths — từ score
    if (score >= 80) strengths.push("Điểm an toàn cao (" + score + "/100)");
    else if (score >= 60) strengths.push("Điểm an toàn khá (" + score + "/100)");

    // Strengths — từ ingredients/summary
    if (/organic|hữu cơ/i.test(text)) strengths.push("Thành phần hữu cơ");
    if (/không chất bảo quản|preservative.free|no preservative/i.test(text)) strengths.push("Không chất bảo quản");
    if (/không đường|sugar.free|không thêm đường/i.test(text)) strengths.push("Không thêm đường");
    if (/halal/i.test(text)) strengths.push("Chứng nhận Halal");
    if (/vegan|thuần chay/i.test(text)) strengths.push("Thuần chay (Vegan)");
    if (/probiotic|lợi khuẩn/i.test(text)) strengths.push("Giàu Probiotic");
    if (/vitamin c|ascorbic acid/i.test(text) && product.category === "BEAUTY") strengths.push("Vitamin C chống oxy hóa");
    if (/không paraben|paraben.free|no paraben/i.test(text)) strengths.push("Không Paraben");
    if (/giàu canxi|calcium|giàu protein/i.test(text)) strengths.push("Giàu canxi & protein");
    if (/giàu sắt|iron|vitamin a|vitamin d/i.test(text)) strengths.push("Bổ sung vi chất");
    if (/confidence/i.test("") && product.confidenceScore >= 0.9) strengths.push("Dữ liệu độ tin cậy cao");

    // Weaknesses — từ overrideReasons
    if (product.overrideReasons && product.overrideReasons.length > 0) {
        weaknesses.push("Có cảnh báo hồ sơ gia đình (" + product.overrideReasons.length + " lý do)");
    }

    // Weaknesses — từ ingredients
    if (/paraben/i.test(text) && !/không paraben/i.test(text)) weaknesses.push("Chứa Paraben");
    if (/fragrance|hương liệu tổng hợp/i.test(text)) weaknesses.push("Có hương liệu tổng hợp");
    if (/retinol/i.test(text)) weaknesses.push("Retinol (không dùng khi mang thai)");
    if (/đường cao|đường mía|đường mật|45g|đường bổ sung/i.test(text) && !/không thêm đường/i.test(text))
        weaknesses.push("Hàm lượng đường cao");
    if (/natri cao|480mg|muối cao/i.test(text)) weaknesses.push("Natri cao");
    if (/e\d{3}|phụ gia|chất tạo màu/i.test(text)) weaknesses.push("Phụ gia / chất tạo màu");
    if (/đậu phộng|peanut|shellfish|hải sản/i.test(text)) weaknesses.push("Allergen nguy hiểm cao");
    if (product.riskFactors && product.riskFactors.length > 0 && !weaknesses.length) {
        const rf = product.riskFactors[0];
        if (rf) weaknesses.push(rf);
    }
    if (!weaknesses.length && score < 40) weaknesses.push("Điểm an toàn thấp (" + score + "/100)");

    return {
        strengths: strengths.slice(0, 4),
        weaknesses: weaknesses.slice(0, 4),
    };
}

// ── Verdict Banner ──────────────────────────────────────────────────────────
function VerdictBanner({
    prodA,
    prodB,
}: {
    prodA: ProductEvaluationResponse;
    prodB: ProductEvaluationResponse;
}) {
    const scoreA = prodA.score ?? 0;
    const scoreB = prodB.score ?? 0;
    const diff = Math.abs(scoreA - scoreB);

    if (diff < 5) {
        return (
            <View style={[vStyles.banner, { backgroundColor: "#EEF2FF" }]}>
                <Text style={vStyles.bannerIcon}>⚖️</Text>
                <View style={{ flex: 1 }}>
                    <Text style={[vStyles.bannerTitle, { color: COLORS.primary }]}>Tương đương nhau</Text>
                    <Text style={vStyles.bannerSub}>Hai sản phẩm có chất lượng gần bằng nhau. Xem chi tiết để quyết định.</Text>
                </View>
            </View>
        );
    }

    const winner = scoreA > scoreB ? prodA : prodB;
    const winLabel = scoreA > scoreB ? "Sản phẩm A" : "Sản phẩm B";
    const isGreen = winner.rating === "GREEN";

    return (
        <View style={[vStyles.banner, { backgroundColor: isGreen ? "#F0FDF4" : "#FEF3C7" }]}>
            <Text style={vStyles.bannerIcon}>🏆</Text>
            <View style={{ flex: 1 }}>
                <Text style={[vStyles.bannerTitle, { color: isGreen ? COLORS.success : COLORS.warning }]}>
                    {winLabel} tốt hơn (+{diff} điểm)
                </Text>
                <Text style={vStyles.bannerSub} numberOfLines={2}>
                    {winner.name ?? "—"} — {winner.brand ?? ""}
                </Text>
            </View>
        </View>
    );
}

const vStyles = StyleSheet.create({
    banner: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 16, padding: 14, marginBottom: 16 },
    bannerIcon: { fontSize: 28 },
    bannerTitle: { fontSize: 14, fontWeight: "800", marginBottom: 2 },
    bannerSub: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
});

// ── Comparison Row (điểm + / -) ─────────────────────────────────────────────
function SwPlusMinusCol({
    strengths,
    weaknesses,
    align,
}: {
    strengths: string[];
    weaknesses: string[];
    align: "left" | "right";
}) {
    const isRight = align === "right";
    return (
        <View style={{ flex: 1 }}>
            {strengths.map((s, i) => (
                <View key={`s${i}`} style={[swStyles.row, isRight && swStyles.rowRight]}>
                    <Text style={swStyles.plusDot}>✓</Text>
                    <Text style={[swStyles.itemText, swStyles.plusText]} numberOfLines={2}>{s}</Text>
                </View>
            ))}
            {weaknesses.map((w, i) => (
                <View key={`w${i}`} style={[swStyles.row, isRight && swStyles.rowRight]}>
                    <Text style={swStyles.minusDot}>✗</Text>
                    <Text style={[swStyles.itemText, swStyles.minusText]} numberOfLines={2}>{w}</Text>
                </View>
            ))}
            {strengths.length === 0 && weaknesses.length === 0 && (
                <Text style={swStyles.emptyText}>Chưa đủ dữ liệu</Text>
            )}
        </View>
    );
}

const swStyles = StyleSheet.create({
    row: { flexDirection: "row", gap: 4, marginBottom: 5, alignItems: "flex-start" },
    rowRight: { flexDirection: "row-reverse" },
    plusDot: { fontSize: 11, color: COLORS.success, fontWeight: "800", marginTop: 1 },
    minusDot: { fontSize: 11, color: COLORS.danger, fontWeight: "800", marginTop: 1 },
    itemText: { fontSize: 11, flex: 1, lineHeight: 16 },
    plusText: { color: COLORS.successText },
    minusText: { color: COLORS.dangerText },
    emptyText: { fontSize: 11, color: COLORS.textMuted, fontStyle: "italic" },
});

// ── Score Bar ────────────────────────────────────────────────────────────────
function ScoreBar({ score, color }: { score: number | null; color: string }) {
    const pct = Math.min(100, Math.max(0, score ?? 0));
    return (
        <View style={sbStyles.track}>
            <View style={[sbStyles.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
        </View>
    );
}
const sbStyles = StyleSheet.create({
    track: { height: 6, backgroundColor: COLORS.border, borderRadius: 4, overflow: "hidden", marginTop: 4, marginBottom: 2 },
    fill: { height: "100%", borderRadius: 4 },
});

// ── Single Product Column (input + display) ──────────────────────────────────
function ProductSlot({
    initialBarcode,
    slotLabel,
    onProductLoaded,
}: {
    initialBarcode?: string;
    slotLabel: string;
    onProductLoaded?: (p: ProductEvaluationResponse | null) => void;
}) {
    const [input, setInput] = useState(initialBarcode ?? "");
    const [confirmed, setConfirmed] = useState(initialBarcode ?? "");

    const { data, isLoading, error } = useQuery({
        queryKey: confirmed ? [...queryKeys.product(confirmed), "compare"] : ["compare_empty"],
        queryFn: () => getProduct(confirmed!),
        enabled: !!confirmed,
        staleTime: 1000 * 60 * 5,
    });

    // Notify parent khi data thay đổi
    useEffect(() => {
        onProductLoaded?.(data ?? null);
    }, [data]);

    const ratingStyle = data ? RATING_COLORS[data.rating] : null;
    const scoreColor = data?.rating === "GREEN" ? COLORS.success : data?.rating === "RED" ? COLORS.danger : COLORS.warning;
    const catInfo = getCategoryLabel(data?.category);

    const confirm = () => {
        const trimmed = input.trim();
        if (trimmed) setConfirmed(trimmed);
    };

    return (
        <View style={slotStyles.wrap}>
            {/* Slot label */}
            <Text style={slotStyles.slotLabel}>{slotLabel}</Text>

            {/* Input row */}
            <View style={slotStyles.inputRow}>
                <TextInput
                    style={slotStyles.input}
                    value={input}
                    onChangeText={setInput}
                    placeholder="Barcode..."
                    placeholderTextColor={COLORS.textMuted}
                    returnKeyType="search"
                    onSubmitEditing={confirm}
                    autoCapitalize="none"
                />
                <TouchableOpacity style={slotStyles.searchBtn} onPress={confirm}>
                    <Text style={slotStyles.searchBtnText}>🔍</Text>
                </TouchableOpacity>
            </View>

            {/* States */}
            {isLoading && confirmed && (
                <View style={slotStyles.stateBox}>
                    <ActivityIndicator color={COLORS.primary} size="small" />
                    <Text style={slotStyles.stateText}>Đang tải...</Text>
                </View>
            )}
            {error && !isLoading && (
                <View style={[slotStyles.stateBox, { backgroundColor: COLORS.dangerLight }]}>
                    <Text style={{ color: COLORS.danger, fontSize: 12, fontWeight: "600" }}>⚠️ Không tìm thấy sản phẩm</Text>
                </View>
            )}

            {/* Product Card */}
            {data && !isLoading && (
                <View style={slotStyles.card}>
                    {/* Image / Icon */}
                    <View style={slotStyles.imageBox}>
                        {data.imageUrl ? (
                            <Image source={{ uri: data.imageUrl }} style={slotStyles.image} />
                        ) : (
                            <Text style={{ fontSize: 36 }}>{getProductIcon(data)}</Text>
                        )}
                    </View>

                    {/* Category badge */}
                    <View style={slotStyles.catBadge}>
                        <Text style={slotStyles.catBadgeText}>{catInfo.icon} {catInfo.label}</Text>
                    </View>

                    {/* Name */}
                    <Text style={slotStyles.name} numberOfLines={3}>{data.name ?? "—"}</Text>
                    <Text style={slotStyles.brand} numberOfLines={1}>{data.brand ?? ""}</Text>

                    {/* Rating + Score */}
                    <View style={slotStyles.ratingRow}>
                        <View style={[slotStyles.ratingBadge, { backgroundColor: ratingStyle?.bg + "22" }]}>
                            <Text style={[slotStyles.ratingText, { color: scoreColor }]}>{ratingStyle?.label}</Text>
                        </View>
                        <Text style={[slotStyles.scoreNum, { color: scoreColor }]}>
                            {data.score ?? "—"}
                            <Text style={{ color: COLORS.textMuted, fontSize: 10 }}>/100</Text>
                        </Text>
                    </View>
                    <ScoreBar score={data.score ?? null} color={scoreColor} />
                </View>
            )}

            {/* Empty placeholder */}
            {!data && !isLoading && !error && (
                <View style={slotStyles.emptyCard}>
                    <Text style={slotStyles.emptyIcon}>📦</Text>
                    <Text style={slotStyles.emptyText}>Nhập barcode{"\n"}để tải sản phẩm</Text>
                </View>
            )}
        </View>
    );
}

const slotStyles = StyleSheet.create({
    wrap: { flex: 1 },
    slotLabel: { fontSize: 12, fontWeight: "800", color: COLORS.primary, textAlign: "center", marginBottom: 8, letterSpacing: 0.5 },
    inputRow: { flexDirection: "row", gap: 6, marginBottom: 8 },
    input: {
        flex: 1, backgroundColor: COLORS.backgroundAlt, borderRadius: 10,
        paddingHorizontal: 10, paddingVertical: 8,
        color: COLORS.text, fontSize: 12,
        borderWidth: 1, borderColor: COLORS.border,
    },
    searchBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 10, justifyContent: "center" },
    searchBtnText: { fontSize: 16 },
    stateBox: { alignItems: "center", paddingVertical: 12, borderRadius: 10, gap: 6, marginBottom: 8 },
    stateText: { color: COLORS.textMuted, fontSize: 12 },

    card: {
        backgroundColor: COLORS.white, borderRadius: 16, padding: 12, gap: 6,
        borderWidth: 1, borderColor: COLORS.border,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    imageBox: { width: "100%", height: 72, alignItems: "center", justifyContent: "center", marginBottom: 4 },
    image: { width: "80%", height: 72, resizeMode: "contain", borderRadius: 8 },
    catBadge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: "center" },
    catBadgeText: { fontSize: 10, fontWeight: "700", color: COLORS.primary },
    name: { color: COLORS.text, fontSize: 12, fontWeight: "700", textAlign: "center", lineHeight: 17 },
    brand: { color: COLORS.textMuted, fontSize: 10, textAlign: "center" },
    ratingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
    ratingBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    ratingText: { fontSize: 11, fontWeight: "800" },
    scoreNum: { fontSize: 18, fontWeight: "900" },

    emptyCard: {
        borderRadius: 16, borderWidth: 2, borderColor: COLORS.border, borderStyle: "dashed",
        padding: 20, alignItems: "center", justifyContent: "center", gap: 8, minHeight: 150,
    },
    emptyIcon: { fontSize: 32 },
    emptyText: { color: COLORS.textMuted, fontSize: 12, textAlign: "center", lineHeight: 18 },
});

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function CompareScreen({ route, navigation }: Props) {
    const { barcode1 } = route.params;

    const [barcodeA, setBarcodeA] = useState(barcode1 ?? "");
    const [barcodeB, setBarcodeB] = useState("");
    const [productA, setProductA] = useState<ProductEvaluationResponse | null>(null);
    const [productB, setProductB] = useState<ProductEvaluationResponse | null>(null);

    // Category validation
    const catA = productA?.category;
    const catB = productB?.category;
    const categoryMismatch = !!(productA && productB && catA && catB && catA !== catB);

    // Strengths / Weaknesses
    const swA = productA ? deriveStrengthsWeaknesses(productA) : null;
    const swB = productB ? deriveStrengthsWeaknesses(productB) : null;

    const bothLoaded = !!(productA && productB);

    return (
        <View style={styles.container}>
            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backIcon}>‹</Text>
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>⚖️ So sánh sản phẩm</Text>
                    <Text style={styles.subtitle}>Chỉ so sánh cùng loại (thực phẩm / mỹ phẩm)</Text>
                </View>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* ── Category mismatch warning ── */}
                {categoryMismatch && (
                    <View style={styles.mismatchBanner}>
                        <Text style={styles.mismatchText}>
                            ⚠️ Hai sản phẩm khác loại ({getCategoryLabel(catA).label} ≠ {getCategoryLabel(catB).label}).{"\n"}
                            So sánh sẽ không chính xác. Hãy chọn 2 sản phẩm cùng loại.
                        </Text>
                    </View>
                )}

                {/* ── Preset Quick Compare ── */}
                <View style={styles.presetsSection}>
                    <Text style={styles.presetsTitle}>⚡ So sánh nhanh (Demo)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
                        {COMPARE_PRESETS.map((preset, i) => (
                            <TouchableOpacity
                                key={i}
                                style={styles.presetChip}
                                onPress={() => {
                                    setBarcodeA(preset.barcodeA);
                                    setBarcodeB(preset.barcodeB);
                                }}
                                activeOpacity={0.75}
                            >
                                <Text style={styles.presetChipIcon}>{preset.icon}</Text>
                                <Text style={styles.presetChipText}>
                                    {preset.labelA}{"\n"}vs{"\n"}{preset.labelB}
                                </Text>
                                <View style={[styles.presetCatBadge, preset.category === "BEAUTY" ? styles.presetBeauty : styles.presetFood]}>
                                    <Text style={styles.presetCatText}>
                                        {preset.category === "BEAUTY" ? "Mỹ phẩm" : "Thực phẩm"}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* ── Two columns ── */}
                <View style={styles.columnsRow}>
                    <ProductSlot
                        key={barcodeA}
                        initialBarcode={barcodeA}
                        slotLabel="🅐 Sản phẩm A"
                        onProductLoaded={setProductA}
                    />
                    <View style={styles.vsCol}>
                        <Text style={styles.vsText}>VS</Text>
                    </View>
                    <ProductSlot
                        key={barcodeB}
                        initialBarcode={barcodeB}
                        slotLabel="🅑 Sản phẩm B"
                        onProductLoaded={setProductB}
                    />
                </View>

                {/* ── Analysis Panel (only when both loaded & same category) ── */}
                {bothLoaded && !categoryMismatch && swA && swB && (
                    <View style={styles.analysisSection}>
                        {/* Verdict */}
                        <VerdictBanner prodA={productA!} prodB={productB!} />

                        {/* Strengths / Weaknesses table */}
                        <View style={styles.swCard}>
                            <Text style={styles.swCardTitle}>📊 Điểm mạnh & Điểm yếu</Text>

                            {/* Header row */}
                            <View style={styles.swHeaderRow}>
                                <Text style={[styles.swColHeader, { textAlign: "left" }]}>🅐 A</Text>
                                <View style={styles.swCenterDivider} />
                                <Text style={[styles.swColHeader, { textAlign: "right" }]}>🅑 B</Text>
                            </View>
                            <View style={styles.swDividerLine} />

                            {/* Content */}
                            <View style={styles.swBody}>
                                <SwPlusMinusCol strengths={swA.strengths} weaknesses={swA.weaknesses} align="left" />
                                <View style={styles.swBodyDivider} />
                                <SwPlusMinusCol strengths={swB.strengths} weaknesses={swB.weaknesses} align="right" />
                            </View>
                        </View>

                        {/* Risk factors comparison */}
                        {((productA?.riskFactors?.length ?? 0) > 0 || (productB?.riskFactors?.length ?? 0) > 0) && (
                            <View style={styles.riskCard}>
                                <Text style={styles.riskCardTitle}>⚠️ Yếu tố rủi ro</Text>
                                <View style={styles.riskBody}>
                                    <View style={{ flex: 1 }}>
                                        {(productA?.riskFactors ?? []).length > 0 ? (
                                            (productA!.riskFactors!).map((r, i) => (
                                                <View key={i} style={styles.riskItem}>
                                                    <Text style={styles.riskDot}>•</Text>
                                                    <Text style={styles.riskText}>{r}</Text>
                                                </View>
                                            ))
                                        ) : (
                                            <Text style={styles.riskNone}>✅ Không có rủi ro</Text>
                                        )}
                                    </View>
                                    <View style={styles.swBodyDivider} />
                                    <View style={{ flex: 1 }}>
                                        {(productB?.riskFactors ?? []).length > 0 ? (
                                            (productB!.riskFactors!).map((r, i) => (
                                                <View key={i} style={[styles.riskItem, { flexDirection: "row-reverse" }]}>
                                                    <Text style={styles.riskDot}>•</Text>
                                                    <Text style={[styles.riskText, { textAlign: "right" }]}>{r}</Text>
                                                </View>
                                            ))
                                        ) : (
                                            <Text style={[styles.riskNone, { textAlign: "right" }]}>✅ Không có rủi ro</Text>
                                        )}
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* Waiting hint */}
                {!productA && !productB && (
                    <View style={styles.hintBox}>
                        <Text style={styles.hintIcon}>👆</Text>
                        <Text style={styles.hintText}>
                            Nhấn vào một preset bên trên để so sánh nhanh,{"\n"}
                            hoặc nhập barcode thủ công vào ô tìm kiếm.
                        </Text>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.backgroundAlt },

    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 16, paddingTop: Platform.OS === "ios" ? 54 : 44, paddingBottom: 14,
        backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.backgroundAlt, alignItems: "center", justifyContent: "center" },
    backIcon: { fontSize: 24, color: COLORS.text, fontWeight: "400", marginTop: -2 },
    title: { fontSize: 16, fontWeight: "800", color: COLORS.text, textAlign: "center" },
    subtitle: { fontSize: 11, color: COLORS.textMuted, textAlign: "center", marginTop: 1 },

    scroll: { padding: 16, paddingBottom: 60 },

    // Mismatch
    mismatchBanner: {
        backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: COLORS.warning,
        borderRadius: 12, padding: 12, marginBottom: 14,
    },
    mismatchText: { color: COLORS.warningText, fontSize: 13, lineHeight: 20 },

    // Presets
    presetsSection: { marginBottom: 16 },
    presetsTitle: { fontSize: 13, fontWeight: "700", color: COLORS.text, marginBottom: 10 },
    presetsRow: { gap: 10, paddingRight: 8 },
    presetChip: {
        backgroundColor: COLORS.white, borderRadius: 16, padding: 12,
        alignItems: "center", minWidth: 110,
        borderWidth: 1, borderColor: COLORS.border,
        shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    presetChipIcon: { fontSize: 24, marginBottom: 4 },
    presetChipText: { fontSize: 11, fontWeight: "600", color: COLORS.text, textAlign: "center", lineHeight: 15, marginBottom: 6 },
    presetCatBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
    presetBeauty: { backgroundColor: "#FAF5FF" },
    presetFood: { backgroundColor: "#F0FDF4" },
    presetCatText: { fontSize: 10, fontWeight: "700", color: COLORS.textSecondary },

    // Columns
    columnsRow: { flexDirection: "row", gap: 0, marginBottom: 16, alignItems: "flex-start" },
    vsCol: { width: 32, alignItems: "center", justifyContent: "center", paddingTop: 60 },
    vsText: { fontSize: 13, fontWeight: "900", color: COLORS.textMuted, letterSpacing: 1 },

    // Analysis section
    analysisSection: { gap: 12 },

    // Strengths/Weaknesses card
    swCard: {
        backgroundColor: COLORS.white, borderRadius: 16, padding: 14,
        borderWidth: 1, borderColor: COLORS.border,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    },
    swCardTitle: { fontSize: 13, fontWeight: "800", color: COLORS.text, marginBottom: 10 },
    swHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
    swColHeader: { flex: 1, fontSize: 12, fontWeight: "800", color: COLORS.primary },
    swCenterDivider: { width: 1, backgroundColor: COLORS.border, height: 16, marginHorizontal: 8 },
    swDividerLine: { height: 1, backgroundColor: COLORS.border, marginBottom: 10 },
    swBody: { flexDirection: "row", gap: 0 },
    swBodyDivider: { width: 1, backgroundColor: COLORS.border, marginHorizontal: 8 },

    // Risk card
    riskCard: {
        backgroundColor: "#FFF7ED", borderRadius: 16, padding: 14,
        borderWidth: 1, borderColor: "#FED7AA",
        shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
    },
    riskCardTitle: { fontSize: 13, fontWeight: "800", color: COLORS.text, marginBottom: 10 },
    riskBody: { flexDirection: "row" },
    riskItem: { flexDirection: "row", gap: 4, marginBottom: 4, alignItems: "flex-start" },
    riskDot: { color: COLORS.danger, fontWeight: "800", fontSize: 12, marginTop: 1 },
    riskText: { flex: 1, fontSize: 11, color: COLORS.dangerText, lineHeight: 16 },
    riskNone: { fontSize: 11, color: COLORS.successText, fontWeight: "600" },

    // Hint
    hintBox: { alignItems: "center", paddingVertical: 32, gap: 10 },
    hintIcon: { fontSize: 36 },
    hintText: { fontSize: 13, color: COLORS.textMuted, textAlign: "center", lineHeight: 20 },
});
