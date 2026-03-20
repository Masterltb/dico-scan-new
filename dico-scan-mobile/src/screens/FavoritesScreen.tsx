// src/screens/FavoritesScreen.tsx
// Danh sách yêu thích: merge LOCAL (mock + offline) và SERVER (premium users)
// SAFE (Mua lại) | AVOID (Tránh mua)

import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { COLORS } from "@/constants/colors";
import { getFavorites, removeFavorite, FavoriteItem } from "@/api/stats";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { useAuthStore } from "@/store/authStore";
import {
    getLocalFavorites,
    removeLocalFavorite,
    LocalFavoriteItem,
} from "@/utils/localFavorites";

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type FilterType = "ALL" | "SAFE" | "AVOID";

const FILTER_OPTIONS: { label: string; value: FilterType; emoji: string }[] = [
    { label: "Tất cả", value: "ALL", emoji: "" },
    { label: "Mua lại", value: "SAFE", emoji: "✅" },
    { label: "Tránh mua", value: "AVOID", emoji: "🚫" },
];

// ── Unified display type ─────────────────────────────────────────────────────
interface DisplayFavorite {
    id: string;
    barcode: string;
    label: "SAFE" | "AVOID";
    addedAt: string;
    name: string | null;
    brand: string | null;
    imageUrl: string | null;
    rating: "GREEN" | "YELLOW" | "RED" | null;
    score: number | null;
    category: string | null;
    isLocal: boolean;
}

const RATING_COLOR: Record<string, string> = {
    GREEN: COLORS.success,
    YELLOW: COLORS.warning,
    RED: COLORS.danger,
};
const CATEGORY_ICON: Record<string, string> = {
    FOOD: "🥗", BEAUTY: "🧴", TOY: "🧸",
};

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "2-digit" });
    } catch { return ""; }
}

export default function FavoritesScreen() {
    const navigation = useNavigation<NavProp>();
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState<FilterType>("ALL");
    const { tier, fetchStatus } = useSubscriptionStore();
    const { isAuthenticated } = useAuthStore();
    const isFree = tier === "FREE";

    // ── Local favorites (luôn load — cả FREE lẫn Premium) ───────────────
    const { data: localFavs = [], refetch: refetchLocal } = useQuery<LocalFavoriteItem[]>({
        queryKey: ["localFavorites"],
        queryFn: getLocalFavorites,
        staleTime: 0,
    });

    // ── Server favorites (chỉ Premium + đã đăng nhập) ───────────────────
    const { data: serverFavs, isLoading: serverLoading, refetch: refetchServer } = useQuery({
        queryKey: ["favorites"],
        queryFn: getFavorites,
        staleTime: 1000 * 30,
        enabled: !isFree && isAuthenticated,
    });

    // ── Refresh khi focus ────────────────────────────────────────────────
    useFocusEffect(
        useCallback(() => {
            refetchLocal();
            if (!isFree && isAuthenticated) refetchServer();
        }, [isFree, isAuthenticated])
    );

    // ── Merge: local (DEMO_) + server, deduplicate by barcode ────────────
    const merged: DisplayFavorite[] = (() => {
        const serverMapped: DisplayFavorite[] = (serverFavs ?? []).map((f: FavoriteItem) => ({
            id: f.id,
            barcode: f.barcode,
            label: f.label,
            addedAt: f.addedAt,
            name: null,
            brand: null,
            imageUrl: null,
            rating: null,
            score: null,
            category: null,
            isLocal: false,
        }));

        const localMapped: DisplayFavorite[] = localFavs.map((f) => ({
            id: f.id,
            barcode: f.barcode,
            label: f.label,
            addedAt: f.addedAt,
            name: f.name,
            brand: f.brand,
            imageUrl: f.imageUrl,
            rating: f.rating,
            score: f.score,
            category: f.category,
            isLocal: true,
        }));

        // Local overrides server (local có snapshot tốt hơn), deduplicate by barcode
        const serverBarcodes = new Set(localMapped.map((f) => f.barcode));
        const filteredServer = serverMapped.filter((f) => !serverBarcodes.has(f.barcode));
        return [...localMapped, ...filteredServer].sort(
            (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
        );
    })();

    // ── Filter ───────────────────────────────────────────────────────────
    const filtered = filter === "ALL" ? merged : merged.filter((f) => f.label === filter);

    // ── Remove ───────────────────────────────────────────────────────────
    const localRemoveMutation = useMutation({
        mutationFn: (barcode: string) => removeLocalFavorite(barcode),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["localFavorites"] }),
    });

    const serverRemoveMutation = useMutation({
        mutationFn: (barcode: string) => removeFavorite(barcode),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favorites"] }),
    });

    const handleRemove = (item: DisplayFavorite) => {
        Alert.alert(
            "Xóa yêu thích",
            `Xóa "${item.name ?? item.barcode}" khỏi danh sách yêu thích?`,
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: () => {
                        if (item.isLocal) {
                            localRemoveMutation.mutate(item.barcode);
                        } else {
                            serverRemoveMutation.mutate(item.barcode);
                        }
                    },
                },
            ]
        );
    };

    // ── Loading ──────────────────────────────────────────────────────────
    if (serverLoading && merged.length === 0) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={COLORS.primary} size="large" />
                <Text style={styles.muted}>Đang tải...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>⭐ Yêu thích</Text>
                    <Text style={styles.headerSub}>
                        {merged.length > 0 ? `${merged.length} sản phẩm` : "Chưa có sản phẩm"}
                        {localFavs.length > 0 ? ` · ${localFavs.length} demo` : ""}
                    </Text>
                </View>
                {!isFree && (
                    <View style={styles.premiumBadge}>
                        <Text style={styles.premiumBadgeText}>💎 Premium</Text>
                    </View>
                )}
            </View>

            {/* Upgrade nudge (FREE user) — nhưng vẫn hiển thị local */}
            {isFree && (
                <TouchableOpacity
                    style={styles.upgradeNudge}
                    onPress={() => navigation.navigate("Upgrade")}
                >
                    <Text style={styles.upgradeNudgeText}>
                        💎 Nâng cấp Premium để lưu sản phẩm thật vào yêu thích  →
                    </Text>
                </TouchableOpacity>
            )}

            {/* Filter Tabs */}
            <View style={styles.filterRow}>
                {FILTER_OPTIONS.map((f) => {
                    const count = f.value === "ALL"
                        ? merged.length
                        : merged.filter((i) => i.label === f.value).length;
                    return (
                        <TouchableOpacity
                            key={f.value}
                            style={[styles.filterBtn, filter === f.value && styles.filterBtnActive]}
                            onPress={() => setFilter(f.value)}
                        >
                            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>
                                {f.emoji ? `${f.emoji} ` : ""}{f.label}
                                {count > 0 ? ` (${count})` : ""}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Favorites List */}
            <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                    const ratingColor = item.rating ? RATING_COLOR[item.rating] : COLORS.textMuted;
                    const catIcon = CATEGORY_ICON[item.category ?? ""] ?? "📦";
                    return (
                        <TouchableOpacity
                            style={styles.item}
                            onPress={() => navigation.navigate("Result", { barcode: item.barcode })}
                            activeOpacity={0.75}
                        >
                            {/* Image / Category icon */}
                            <View style={[styles.imageBox, { borderColor: ratingColor + "44", borderWidth: 1.5 }]}>
                                {item.imageUrl ? (
                                    <Image source={{ uri: item.imageUrl }} style={styles.image} />
                                ) : (
                                    <Text style={{ fontSize: 28 }}>{catIcon}</Text>
                                )}
                            </View>

                            {/* Content */}
                            <View style={styles.itemContent}>
                                {/* Name / Barcode */}
                                <Text style={styles.itemName} numberOfLines={1}>
                                    {item.name ?? item.barcode}
                                </Text>
                                {item.brand && (
                                    <Text style={styles.itemBrand} numberOfLines={1}>{item.brand}</Text>
                                )}

                                {/* Bottom row: label + date */}
                                <View style={styles.itemMeta}>
                                    <View style={[
                                        styles.labelBadge,
                                        { backgroundColor: item.label === "SAFE" ? "#DCFCE7" : "#FEE2E2" }
                                    ]}>
                                        <Text style={[
                                            styles.labelBadgeText,
                                            { color: item.label === "SAFE" ? COLORS.success : COLORS.danger }
                                        ]}>
                                            {item.label === "SAFE" ? "✅ Mua lại" : "🚫 Tránh mua"}
                                        </Text>
                                    </View>
                                    <Text style={styles.dateText}>{formatDate(item.addedAt)}</Text>
                                </View>
                            </View>

                            {/* Score + actions */}
                            <View style={styles.rightCol}>
                                {item.score !== null && (
                                    <View style={[styles.scorePill, { backgroundColor: ratingColor + "18" }]}>
                                        <Text style={[styles.scoreNum, { color: ratingColor }]}>{item.score}</Text>
                                    </View>
                                )}
                                <View style={styles.actions}>
                                    <TouchableOpacity
                                        style={styles.actionBtn}
                                        onPress={() => navigation.navigate("Compare", { barcode1: item.barcode })}
                                    >
                                        <Text style={styles.actionBtnText}>⚖️</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.actionBtn}
                                        onPress={() => handleRemove(item)}
                                    >
                                        <Text style={styles.actionBtnText}>🗑</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                }}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyEmoji}>
                            {filter === "SAFE" ? "✅" : filter === "AVOID" ? "🚫" : "⭐"}
                        </Text>
                        <Text style={styles.emptyTitle}>Chưa có sản phẩm</Text>
                        <Text style={styles.muted}>
                            {filter === "SAFE"
                                ? "Chưa có sản phẩm nào đánh dấu Mua lại"
                                : filter === "AVOID"
                                    ? "Chưa có sản phẩm nào đánh dấu Tránh mua"
                                    : "Quét sản phẩm và nhấn ⭐ để thêm vào yêu thích!"}
                        </Text>
                    </View>
                }
                contentContainerStyle={filtered.length === 0 ? { flex: 1 } : { paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 24 },

    header: {
        flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
        paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
        backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    title: { color: COLORS.text, fontSize: 22, fontWeight: "800" },
    headerSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
    premiumBadge: {
        backgroundColor: COLORS.primaryLight, borderRadius: 20,
        paddingHorizontal: 12, paddingVertical: 5,
        borderWidth: 1, borderColor: COLORS.primary + "40",
    },
    premiumBadgeText: { color: COLORS.primary, fontSize: 12, fontWeight: "700" },

    upgradeNudge: {
        backgroundColor: "#EFF6FF", borderBottomWidth: 1, borderBottomColor: "#BFDBFE",
        paddingHorizontal: 16, paddingVertical: 10,
    },
    upgradeNudgeText: { color: "#2563EB", fontSize: 12, fontWeight: "600" },

    filterRow: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexWrap: "wrap" },
    filterBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    filterText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "500" },
    filterTextActive: { color: COLORS.white, fontWeight: "700" },

    item: {
        flexDirection: "row", alignItems: "center",
        paddingVertical: 12, paddingHorizontal: 16,
        backgroundColor: COLORS.white, gap: 12,
    },
    imageBox: {
        width: 60, height: 60, borderRadius: 12,
        backgroundColor: COLORS.surface,
        justifyContent: "center", alignItems: "center",
        overflow: "hidden",
    },
    image: { width: "100%", height: "100%", resizeMode: "cover" },

    itemContent: { flex: 1, gap: 2 },
    itemName: { color: COLORS.text, fontSize: 14, fontWeight: "700" },
    itemBrand: { color: COLORS.textMuted, fontSize: 12 },
    itemMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
    labelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    labelBadgeText: { fontSize: 11, fontWeight: "700" },
    dateText: { fontSize: 11, color: COLORS.textMuted },

    rightCol: { alignItems: "center", gap: 6 },
    scorePill: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    scoreNum: { fontSize: 15, fontWeight: "900" },
    actions: { flexDirection: "row", gap: 4 },
    actionBtn: {
        width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center",
        backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    },
    actionBtnText: { fontSize: 14 },

    separator: { height: 1, backgroundColor: COLORS.border },

    empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, padding: 40 },
    emptyEmoji: { fontSize: 48 },
    emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: "600" },
    muted: { color: COLORS.textMuted, fontSize: 13, textAlign: "center", lineHeight: 19 },
    retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
    retryText: { color: COLORS.white, fontWeight: "600", fontSize: 14 },
});
