// src/screens/InsightsScreen.tsx
// Tab "Yêu thích" — Light Mode theo Frame Figma 4
// Danh sách sản phẩm đã lưu: search bar + filter pills + product cards với score badge

import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { COLORS, RATING_COLORS } from "@/constants/colors";
import { getFavorites, removeFavorite, FavoriteItem } from "@/api/stats";
import { useAuthStore } from "@/store/authStore";

type FilterType = "ALL" | "SAFE" | "AVOID";

const FILTERS: { label: string; value: FilterType; emoji?: string }[] = [
    { label: "Tất cả", value: "ALL" },
    { label: "Thực phẩm", value: "SAFE", emoji: "🍞" },
    { label: "Mỹ phẩm", value: "AVOID", emoji: "✨" },
];

// Score badge theo rating color
const SCORE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
    GREEN: { bg: COLORS.successLight, text: COLORS.successText, label: "An toàn" },
    YELLOW: { bg: COLORS.warningLight, text: COLORS.warningText, label: "Cẩn thận" },
    RED: { bg: COLORS.dangerLight, text: COLORS.dangerText, label: "Nguy hiểm" },
    UNKNOWN: { bg: COLORS.surface, text: COLORS.textMuted, label: "Chưa rõ" },
};

export default function InsightsScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState<FilterType>("ALL");
    const [search, setSearch] = useState("");

    const tier = useAuthStore((s) => s.subscriptionTier);
    const isFree = tier === "FREE" || !tier;

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ["favorites"],
        queryFn: getFavorites,
        staleTime: 1000 * 30,
        enabled: !isFree,
    });

    const removeMutation = useMutation({
        mutationFn: removeFavorite,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favorites"] }),
    });

    const handleRemove = (item: FavoriteItem) => {
        Alert.alert("Xóa yêu thích", `Xóa sản phẩm này khỏi danh sách?`, [
            { text: "Hủy", style: "cancel" },
            { text: "Xóa", style: "destructive", onPress: () => removeMutation.mutate(item.barcode) },
        ]);
    };

    const filtered = (data ?? []).filter((f) => {
        const matchFilter = filter === "ALL" || f.label === filter;
        const matchSearch = search.trim()
            ? f.barcode.includes(search.trim())
            : true;
        return matchFilter && matchSearch;
    });

    if (isFree) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorEmoji}>💎</Text>
                <Text style={styles.errorText}>Tính năng Premium</Text>
                <Text style={[styles.emptyDesc, { paddingHorizontal: 40, textAlign: "center" }]}>
                    Nâng cấp tài khoản để lưu trữ không giới hạn danh sách sản phẩm Yêu thích & Cần tránh.
                </Text>
                <TouchableOpacity style={[styles.retryBtn, { marginTop: 10 }]} onPress={() => navigation.navigate("Upgrade")}>
                    <Text style={styles.retryText}>Xem gói Nâng cấp</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (isLoading) {
        return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
    }

    if (error && !data) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorEmoji}>⚠️</Text>
                <Text style={styles.errorText}>Không thể tải danh sách</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
                    <Text style={styles.retryText}>Thử lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header — Frame 4: "Yêu thích" title + notification icon */}
            <View style={styles.header}>
                <Text style={styles.title}>Yêu thích</Text>
                <TouchableOpacity style={styles.headerIcon}>
                    <Text style={styles.headerIconText}>🔔</Text>
                </TouchableOpacity>
            </View>

            {/* Search bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm kiếm sản phẩm đã lưu..."
                        placeholderTextColor={COLORS.textMuted}
                        value={search}
                        onChangeText={setSearch}
                        clearButtonMode="while-editing"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>
            </View>

            {/* Filter pills — Frame 4 style */}
            <View style={styles.filterRow}>
                {FILTERS.map((f) => (
                    <TouchableOpacity
                        key={f.value}
                        style={[styles.filterBtn, filter === f.value && styles.filterBtnActive]}
                        onPress={() => setFilter(f.value)}
                    >
                        <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>
                            {f.emoji ? `${f.emoji} ` : ""}{f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Product list — Frame 4: row với image square + category label + name + score badge */}
            <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                    const rating = (item as any).snapshotColor ?? "UNKNOWN";
                    const badge = SCORE_BADGE[rating] ?? SCORE_BADGE.UNKNOWN;
                    const score = (item as any).snapshotScore;
                    return (
                        <TouchableOpacity
                            style={styles.item}
                            onPress={() => navigation.navigate("Result", { barcode: item.barcode })}
                            activeOpacity={0.75}
                        >
                            {/* Product image — Frame 4: square 70px rounded */}
                            <View style={styles.imageBox}>
                                {(item as any).imageUrl ? (
                                    <Image source={{ uri: (item as any).imageUrl }} style={styles.image} />
                                ) : (
                                    <View style={styles.imagePlaceholder}>
                                        <Text style={{ fontSize: 26 }}>📦</Text>
                                    </View>
                                )}
                            </View>

                            {/* Content */}
                            <View style={styles.itemContent}>
                                {/* Category label small purple — Frame 4 */}
                                <Text style={styles.categoryLabel}>
                                    {item.label === "SAFE" ? "🍞 Thực phẩm" : "✨ Mỹ phẩm"}
                                </Text>
                                <Text style={styles.itemName} numberOfLines={2}>
                                    {(item as any).name ?? item.barcode}
                                </Text>
                                <Text style={styles.itemSubtext} numberOfLines={1}>
                                    {(item as any).description ?? "Nhấn để xem chi tiết"}
                                </Text>
                                {/* Score badge — Frame 4: small pill color */}
                                {badge && (
                                    <View style={[styles.scoreBadge, { backgroundColor: badge.bg }]}>
                                        <Text style={[styles.scoreBadgeText, { color: badge.text }]}>
                                            {score ? `${score}/100` : badge.label} · {new Date(item.addedAt).toLocaleDateString("vi-VN")}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Actions */}
                            <View style={styles.itemActions}>
                                <TouchableOpacity onPress={() => handleRemove(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <Text style={styles.heartIcon}>❤️</Text>
                                </TouchableOpacity>
                                <Text style={styles.arrowIcon}>›</Text>
                            </View>
                        </TouchableOpacity>
                    );
                }}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyEmoji}>❤️</Text>
                        <Text style={styles.emptyTitle}>Chưa có sản phẩm yêu thích</Text>
                        <Text style={styles.emptyDesc}>Quét sản phẩm và nhấn ❤️ để lưu vào đây!</Text>
                    </View>
                }
                contentContainerStyle={filtered.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 24 },
    errorEmoji: { fontSize: 40 },
    errorText: { color: COLORS.danger, fontSize: 16, fontWeight: "600" },
    retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    retryText: { color: COLORS.white, fontWeight: "600", fontSize: 14 },

    // Header — Frame 4
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 14,
    },
    title: { color: COLORS.text, fontSize: 22, fontWeight: "800" },
    headerIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: COLORS.surface,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    headerIconText: { fontSize: 18 },

    // Search bar
    searchContainer: { paddingHorizontal: 16, marginBottom: 12 },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 8,
    },
    searchIcon: { fontSize: 15, opacity: 0.5 },
    searchInput: { flex: 1, color: COLORS.text, fontSize: 14 },

    // Filter pills — Frame 4
    filterRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 12, flexWrap: "wrap" },
    filterBtn: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    filterText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "500" },
    filterTextActive: { color: COLORS.white, fontWeight: "700" },

    // Item — Frame 4 style
    item: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
        backgroundColor: COLORS.white,
    },
    imageBox: {
        width: 70,
        height: 70,
        borderRadius: 10,
        backgroundColor: COLORS.surface,
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
    },
    image: { width: "100%", height: "100%", resizeMode: "cover" },
    imagePlaceholder: { justifyContent: "center", alignItems: "center" },
    itemContent: { flex: 1, gap: 3 },
    categoryLabel: { color: COLORS.primary, fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
    itemName: { color: COLORS.text, fontSize: 15, fontWeight: "700", lineHeight: 20 },
    itemSubtext: { color: COLORS.textMuted, fontSize: 12, lineHeight: 16 },
    scoreBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 4 },
    scoreBadgeText: { fontSize: 11, fontWeight: "600" },
    itemActions: { alignItems: "center", gap: 4 },
    heartIcon: { fontSize: 20 },
    arrowIcon: { color: COLORS.textMuted, fontSize: 20 },
    separator: { height: 1, backgroundColor: COLORS.border },

    // Empty state
    empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, padding: 40 },
    emptyEmoji: { fontSize: 52 },
    emptyTitle: { color: COLORS.text, fontSize: 17, fontWeight: "700" },
    emptyDesc: { color: COLORS.textMuted, fontSize: 14, textAlign: "center", lineHeight: 20 },
});
