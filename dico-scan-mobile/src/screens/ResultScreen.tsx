// src/screens/ResultScreen.tsx
// GUARDRAIL (RULE_MOB_01): This screen reads `rating` from API response.
// It NEVER calculates or derives rating color from `score`.

import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { COLORS, RATING_COLORS } from "@/constants/colors";
import { useProduct } from "@/hooks/useProduct";
import { StandardError } from "@/api/types";
import { getFavoriteStatus, upsertFavorite, removeFavorite } from "@/api/stats";
import { useAuthStore } from "@/store/authStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { AlternativesSection } from "@/components/AlternativesSection";
import { ScoreRing } from "@/components/ScoreRing";

type Props = NativeStackScreenProps<RootStackParamList, "Result">;

export default function ResultScreen({ route, navigation }: Props) {
    const { barcode, useToken, profileId } = route.params;
    const { data: product, isLoading, error, refetch } = useProduct(barcode, useToken, profileId);
    const [ingredientsExpanded, setIngredientsExpanded] = useState(false);
    const { isAuthenticated } = useAuthStore();
    const { earnToken } = useSubscriptionStore();
    const queryClient = useQueryClient();

    // ── Favorite state ────────────────────────────────────────────
    const { data: favStatus } = useQuery({
        queryKey: ["favoriteStatus", barcode],
        queryFn: () => getFavoriteStatus(barcode),
        enabled: isAuthenticated,
        staleTime: 1000 * 30,
    });

    const upsertMutation = useMutation({
        mutationFn: ({ label }: { label: "SAFE" | "AVOID" }) => upsertFavorite(barcode, label),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favoriteStatus", barcode] }),
        onError: (err: any) => {
             if (err.errorCode === 'PREMIUM_REQUIRED') {
                 Alert.alert("Tính năng VIP", "Vui lòng nâng cấp gói Premium để sử dụng tính năng yêu thích.", [
                     { text: "Để sau", style: "cancel" },
                     { text: "Nâng cấp ngay", onPress: () => navigation.navigate("Upgrade") }
                 ]);
             } else {
                 Alert.alert("Lỗi", "Không thể lưu yêu thích");
             }
        }
    });
    
    const removeMutation = useMutation({
        mutationFn: () => removeFavorite(barcode),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favoriteStatus", barcode] }),
    });

    const handleFavoritePress = () => {
        if (!isAuthenticated) { Alert.alert("Cần đăng nhập", "Đăng nhập để lưu yêu thích"); return; }
        if (favStatus?.isFavorited) {
            Alert.alert("Yêu thích", "Chọn hành động", [
                { text: "Hủy", style: "cancel" },
                { text: "✅ Mua lại", onPress: () => upsertMutation.mutate({ label: "SAFE" }) },
                { text: "🚫 Tránh mua", onPress: () => upsertMutation.mutate({ label: "AVOID" }) },
                { text: "Xóa khỏi yêu thích", style: "destructive", onPress: () => removeMutation.mutate() },
            ]);
        } else {
            Alert.alert("Thêm yêu thích", "Đánh dấu sản phẩm này là:", [
                { text: "Hủy", style: "cancel" },
                { text: "✅ Mua lại", onPress: () => upsertMutation.mutate({ label: "SAFE" }) },
                { text: "🚫 Tránh mua", onPress: () => upsertMutation.mutate({ label: "AVOID" }) },
            ]);
        }
    };

    // ── Share handler ─────────────────────────────────────────────
    const handleShare = async () => {
        if (!product) return;
        const ratingLabel = RATING_COLORS[product.rating]?.label ?? product.rating;
        const name = product.name ?? product.barcode;
        const emoji = product.rating === "GREEN" ? "🟢" : product.rating === "RED" ? "🔴" : "🟡";
        try {
            await Share.share({
                message:
                    `${emoji} Tôi vừa quét "${name}" trên DICO Scan\n\n` +
                    `Đánh giá: ${ratingLabel}\n` +
                    (product.aiSummary ? `\n${product.aiSummary}\n\n` : "\n") +
                    `📱 Tải DICO Scan để quét sản phẩm an toàn!`,
                title: `Kết quả quét — ${name}`,
            });
        } catch {
            // User cancelled share — no-op
        }
    };

    // ── Token Ads Handler ─────────────────────────────────────────
    const handleWatchAdForToken = async () => {
        try {
            await earnToken();
            Alert.alert("Thành công", "Bạn đã nhận được 1 Xu DICO! Đang phân tích lại sản phẩm...");
            refetch(); // Refetch the product since we now have tokens
        } catch (e: any) {
             Alert.alert("Lỗi", e.message || "Không thể nhận xu lúc này.");
        }
    };

    // ── Loading/Error states ──────────────────────────────────────
    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={COLORS.primary} size="large" />
                <Text style={styles.muted}>Đang phân tích sản phẩm...</Text>
            </View>
        );
    }

    if (error) {
        const isStandardError = (e: unknown): e is StandardError =>
            typeof e === "object" && e !== null && "errorCode" in e;
        const isNotFound = isStandardError(error) && error.errorCode === "PRODUCT_NOT_FOUND";
        const isNotEnoughTokens = isStandardError(error) && error.errorCode === "NOT_ENOUGH_TOKENS";

        if (isNotFound) {
            navigation.replace("Contribute", { barcode });
            return null;
        }
        
        if (isNotEnoughTokens) {
            return (
                 <View style={styles.center}>
                     <Text style={[styles.permissionEmoji, { marginBottom: 16 }]}>🪙</Text>
                     <Text style={styles.errorText}>Hết xu DICO</Text>
                     <Text style={[styles.muted, { textAlign: 'center', marginBottom: 20 }]}>
                         Bạn cần 1 Xu DICO để phân tích sâu bằng AI. Xem một video ngắn để nhận 1 Xu ngay lập tức!
                     </Text>
                     <TouchableOpacity style={styles.retryBtn} onPress={handleWatchAdForToken}>
                         <Text style={styles.retryText}>Xem Quảng Cáo</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={{ marginTop: 12 }} onPress={() => navigation.setParams({ useToken: false })}>
                         <Text style={styles.seeAllLink}>Quét với thông tin cơ bản →</Text>
                     </TouchableOpacity>
                 </View>
            );
        }

        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>⚠️ {isStandardError(error) ? error.message : "Đã xảy ra lỗi"}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
                    <Text style={styles.retryText}>Thử lại</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.muted}>← Quay lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!product) return null;

    const ratingStyle = RATING_COLORS[product.rating];
    const ringColor = product.rating === "GREEN" ? COLORS.success : product.rating === "RED" ? COLORS.danger : COLORS.warning;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Top action row */}
            <View style={styles.topRow}>
                <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.closeBtnText}>← Quay lại</Text>
                </TouchableOpacity>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={[styles.favBtn, favStatus?.isFavorited && styles.favBtnActive]}
                        onPress={handleFavoritePress}
                    >
                        <Text style={styles.favBtnText}>
                            {favStatus?.isFavorited ? (favStatus.label === "SAFE" ? "✅" : "🚫") : "⭐"}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                        <Text style={styles.shareBtnText}>📤 Chia sẻ</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Score Hero Section — theo Frame 14 */}
            <View style={styles.scoreHero}>
                {/* Product image trái */}
                <View style={styles.scoreHeroLeft}>
                    {product.imageUrl ? (
                        <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <Text style={{ fontSize: 40 }}>
                                {product.category === "BEAUTY" ? "💄" : product.category === "TOY" ? "🧸" : "📦"}
                            </Text>
                        </View>
                    )}
                    <Text style={styles.productName} numberOfLines={2}>{product.name ?? "Tên không xác định"}</Text>
                    {product.brand && <Text style={styles.brand}>{product.brand}</Text>}
                    <Text style={styles.barcode}>#{product.barcode}</Text>
                </View>
                {/* Score Ring phải */}
                <View style={styles.scoreHeroRight}>
                    <ScoreRing
                        score={product.score ?? (product.rating === "GREEN" ? 85 : product.rating === "RED" ? 20 : 55)}
                        size={130}
                        strokeWidth={12}
                        color={ringColor}
                        label="điểm"
                    />
                    <View style={[styles.ratingBadge, { backgroundColor: ratingStyle.bg + "33" }]}>
                        <Text style={[styles.ratingBadgeText, { color: ringColor }]}>{ratingStyle.label}</Text>
                    </View>
                </View>
            </View>

            {/* Confidence warning */}
            {product.confidenceScore < 0.7 && (
                <View style={styles.confidenceWarn}>
                    <Text style={styles.confidenceWarnText}>
                        ⚠️ Dữ liệu chưa đầy đủ — Độ tin cậy {Math.round(product.confidenceScore * 100)}%
                    </Text>
                </View>
            )}

            {/* Category Warning */}
            {product.categoryWarning && (
                <View style={styles.categoryWarningCard}>
                    <Text style={styles.categoryWarningText}>{product.categoryWarning}</Text>
                </View>
            )}

            {/* Override Warning */}
            {product.overrideReasons && product.overrideReasons.length > 0 && (
                <View style={styles.overrideCard}>
                    <Text style={styles.overrideTitle}>⚠️ Cảnh báo ưu tiên</Text>
                    {product.overrideReasons.map((reason, i) => (
                        <Text key={i} style={styles.overrideReason}>• {reason}</Text>
                    ))}
                </View>
            )}

            {/* AI Summary */}
            <View style={styles.aiCard}>
                <Text style={styles.aiTitle}>✨ Tóm tắt AI</Text>
                <Text style={styles.aiSummary}>
                    {product.aiSummary ?? "Đang phân tích thành phần sản phẩm..."}
                </Text>
            </View>

            {/* Ingredients — Expandable */}
            {product.ingredientsText && (
                <TouchableOpacity
                    style={styles.ingredientsCard}
                    onPress={() => setIngredientsExpanded((v) => !v)}
                    activeOpacity={0.8}
                >
                    <View style={styles.ingredientsHeader}>
                        <Text style={styles.ingredientsTitle}>📋 Thành phần</Text>
                        <Text style={styles.expandIcon}>{ingredientsExpanded ? "▲" : "▼"}</Text>
                    </View>
                    {ingredientsExpanded && (
                        <Text style={styles.ingredientsText}>{product.ingredientsText}</Text>
                    )}
                    {!ingredientsExpanded && (
                        <Text style={styles.ingredientsPreview} numberOfLines={2}>
                            {product.ingredientsText}
                        </Text>
                    )}
                </TouchableOpacity>
            )}

            {/* Confidence */}
            {product.confidenceScore >= 0.7 && (
                <Text style={styles.confidence}>
                    Độ tin cậy: {Math.round(product.confidenceScore * 100)}%
                </Text>
            )}

            {/* Alternatives — only for YELLOW/RED products */}
            <AlternativesSection
                barcode={barcode}
                currentRating={product.rating}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { paddingBottom: 60 },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background, gap: 16, padding: 24 },

    // Header row — back arrow + share button
    topRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 56,
        paddingBottom: 12,
    },
    closeBtn: { flexDirection: "row", alignItems: "center", gap: 4, padding: 8, borderRadius: 20, backgroundColor: COLORS.surface },
    closeBtnText: { color: COLORS.text, fontSize: 15 },
    shareBtn: { backgroundColor: COLORS.surface, width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
    shareBtnText: { color: COLORS.text, fontSize: 16 },
    headerTitle: { color: COLORS.text, fontSize: 16, fontWeight: "700", flex: 1, textAlign: "center", paddingHorizontal: 8 },
    headerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
    favBtn: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
    favBtnActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
    favBtnText: { fontSize: 18 },
    seeAllLink: { color: COLORS.primary, fontSize: 13, fontWeight: "500" },
    permissionEmoji: { fontSize: 40 },

    // Score Hero — Frame 5: product image trái, ScoreRing phải — Light Mode
    scoreHero: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.white,
        borderRadius: 0,
        paddingHorizontal: 20,
        paddingVertical: 16,
        marginBottom: 0,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    scoreHeroLeft: { flex: 1, alignItems: "flex-start", gap: 6, paddingRight: 16 },
    scoreHeroRight: { alignItems: "center", gap: 8 },
    productImage: { width: 56, height: 56, borderRadius: 28, marginBottom: 10 },
    imagePlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.surface, justifyContent: "center", alignItems: "center", marginBottom: 10 },
    productName: { color: COLORS.text, fontSize: 18, fontWeight: "800", lineHeight: 24 },
    brand: { color: COLORS.textMuted, fontSize: 13 },
    barcode: { color: COLORS.textMuted, fontSize: 11, letterSpacing: 0.5 },
    ratingBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
    },
    ratingBadgeText: { fontSize: 13, fontWeight: "700" },

    // Confidence warning
    confidenceWarn: { backgroundColor: COLORS.warningLight, borderRadius: 10, padding: 10, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.warning },
    confidenceWarnText: { color: COLORS.warningText, fontSize: 13 },

    // Category chip — small pill below product name
    categoryChip: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, alignSelf: "flex-start" },
    categoryChipText: { color: COLORS.primary, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },

    // Category warning
    categoryWarningCard: { backgroundColor: COLORS.warningLight, borderRadius: 10, padding: 12, marginHorizontal: 16, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: COLORS.warning },
    categoryWarningText: { color: COLORS.warningText, fontSize: 13, lineHeight: 20 },

    // Override/danger card
    overrideCard: { backgroundColor: COLORS.dangerLight, borderWidth: 1, borderColor: COLORS.danger, borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 12 },
    overrideTitle: { color: COLORS.dangerText, fontSize: 15, fontWeight: "700", marginBottom: 8 },
    overrideReason: { color: COLORS.dangerText, fontSize: 14, marginBottom: 4 },

    // Tags / chips horizontal row — Frame 5
    tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
    tagChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    tagChipText: { color: COLORS.text, fontSize: 12, fontWeight: "600" },

    // Action buttons row — "Lưu yêu thích" + "So sánh" — Frame 5
    actionRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 20, marginTop: 4 },
    actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 13, borderRadius: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    actionBtnText: { color: COLORS.text, fontSize: 14, fontWeight: "600" },

    // AI Summary card — Frame 5: subtle card
    aiCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginHorizontal: 16, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border },
    aiTitle: { color: COLORS.primary, fontSize: 13, fontWeight: "700", marginBottom: 8, letterSpacing: 0.3 },
    aiSummary: { color: COLORS.text, fontSize: 14, lineHeight: 22 },

    // Ingredients section — Frame 5
    ingredientsCard: { backgroundColor: COLORS.white, borderRadius: 0, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 0, borderTopWidth: 1, borderTopColor: COLORS.border },
    ingredientsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    ingredientsTitle: { color: COLORS.text, fontSize: 16, fontWeight: "700" },
    expandIcon: { color: COLORS.primary, fontSize: 13, fontWeight: "600" },
    ingredientsText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
    ingredientsPreview: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },

    // Meta
    confidence: { color: COLORS.textMuted, fontSize: 12, textAlign: "center" },
    errorText: { color: COLORS.danger, fontSize: 16, textAlign: "center" },
    retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    retryText: { color: COLORS.white, fontWeight: "600" },
    muted: { color: COLORS.textMuted, fontSize: 14 },
});

