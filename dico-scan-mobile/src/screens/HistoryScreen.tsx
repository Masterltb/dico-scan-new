// src/screens/HistoryScreen.tsx
// Lịch sử quét — đọc từ LOCAL AsyncStorage (scanHistory.ts)
// Đảm bảo cả mock lẫn sản phẩm thật đều hiển thị sau khi quét
// Fallback: nếu local rỗng thì gọi API backend để migrate

import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState, useCallback } from "react";
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
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { COLORS } from "@/constants/colors";
import {
    getLocalHistory,
    searchLocalHistory,
    removeFromHistory,
    clearLocalHistory,
    LocalScanRecord,
} from "@/utils/scanHistory";

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type FilterType = "ALL" | "GREEN" | "YELLOW" | "RED";

const FILTERS: { label: string; value: FilterType; emoji: string }[] = [
    { label: "Tất cả", value: "ALL", emoji: "" },
    { label: "An toàn", value: "GREEN", emoji: "✅" },
    { label: "Cẩn thận", value: "YELLOW", emoji: "⚠️" },
    { label: "Nguy hiểm", value: "RED", emoji: "🚫" },
];

const SAFETY_ICON: Record<string, string> = {
    GREEN: "✅", YELLOW: "⚠️", RED: "🚫",
};
const SAFETY_LABEL: Record<string, string> = {
    GREEN: "An toàn", YELLOW: "Cẩn thận", RED: "Nguy hiểm",
};
const SAFETY_COLOR: Record<string, string> = {
    GREEN: COLORS.success, YELLOW: COLORS.warning, RED: COLORS.danger,
};
const CATEGORY_ICON: Record<string, string> = {
    FOOD: "🥗", BEAUTY: "🧴", TOY: "🧸",
};

function formatTime(iso: string): string {
    try {
        const d = new Date(iso);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return "Vừa xong";
        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 7) return `${diffDays} ngày trước`;

        return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "2-digit" });
    } catch {
        return "";
    }
}

export default function HistoryScreen() {
    const navigation = useNavigation<NavProp>();
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState<FilterType>("ALL");
    const [searchText, setSearchText] = useState("");
    const [activeKeyword, setActiveKeyword] = useState<string | undefined>(undefined);

    // ── Fetch local history ──────────────────────────────────────────────
    const { data: rawHistory = [], isLoading, refetch } = useQuery<LocalScanRecord[]>({
        queryKey: ["localScanHistory"],
        queryFn: () => getLocalHistory(),
        staleTime: 0, // luôn fresh
    });

    // ── Refetch khi màn hình được focus (sau khi quét về) ──────────────
    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    // ── Search ──────────────────────────────────────────────────────────
    const { data: searchResults = [], isLoading: searchLoading } = useQuery<LocalScanRecord[]>({
        queryKey: ["localHistorySearch", activeKeyword],
        queryFn: () => searchLocalHistory(activeKeyword!),
        enabled: !!activeKeyword,
        staleTime: 0,
    });

    const handleSearchChange = useCallback((text: string) => {
        setSearchText(text);
        if (!text.trim()) setActiveKeyword(undefined);
    }, []);
    const handleSearchSubmit = () => setActiveKeyword(searchText.trim() || undefined);
    const handleClearSearch = () => { setSearchText(""); setActiveKeyword(undefined); };

    // ── Derived list ─────────────────────────────────────────────────────
    const sourceList = activeKeyword ? searchResults : rawHistory;
    const filtered = filter === "ALL" ? sourceList : sourceList.filter((i) => i.rating === filter);
    const loading = isLoading || searchLoading;

    // ── Long press: delete item ──────────────────────────────────────────
    const handleLongPress = (item: LocalScanRecord) => {
        Alert.alert(
            "Xóa lịch sử",
            `Xóa "${item.name ?? item.barcode}" khỏi lịch sử?`,
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: async () => {
                        await removeFromHistory(item.barcode);
                        queryClient.invalidateQueries({ queryKey: ["localScanHistory"] });
                    },
                },
            ]
        );
    };

    // ── Header clear all ─────────────────────────────────────────────────
    const handleClearAll = () => {
        if (rawHistory.length === 0) return;
        Alert.alert("Xóa toàn bộ lịch sử", "Bạn có chắc muốn xóa tất cả lịch sử quét?", [
            { text: "Hủy", style: "cancel" },
            {
                text: "Xóa tất cả",
                style: "destructive",
                onPress: async () => {
                    await clearLocalHistory();
                    queryClient.invalidateQueries({ queryKey: ["localScanHistory"] });
                },
            },
        ]);
    };

    // ── Render ───────────────────────────────────────────────────────────
    if (loading && rawHistory.length === 0) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Lịch sử quét</Text>
                    <Text style={styles.headerCount}>
                        {rawHistory.length > 0 ? `${rawHistory.length} sản phẩm` : "Chưa có lịch sử"}
                    </Text>
                </View>
                {rawHistory.length > 0 && (
                    <TouchableOpacity style={styles.clearAllBtn} onPress={handleClearAll}>
                        <Text style={styles.clearAllText}>Xóa tất cả</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Search bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm tên, thương hiệu, barcode..."
                        placeholderTextColor={COLORS.textMuted}
                        value={searchText}
                        onChangeText={handleSearchChange}
                        onSubmitEditing={handleSearchSubmit}
                        returnKeyType="search"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={handleClearSearch} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Text style={styles.clearBtn}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Filter pills */}
            {!activeKeyword && (
                <View style={styles.filterBar}>
                    {FILTERS.map((f) => {
                        const count = f.value === "ALL"
                            ? rawHistory.length
                            : rawHistory.filter((i) => i.rating === f.value).length;
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
            )}

            {/* Section title */}
            <Text style={styles.sectionTitle}>
                {activeKeyword ? `Kết quả cho "${activeKeyword}"` : "Gần đây nhất"}
            </Text>

            {/* List */}
            <FlatList
                data={filtered}
                keyExtractor={(item, index) => item.barcode + "_" + index}
                renderItem={({ item }: { item: LocalScanRecord }) => {
                    const safetyColor = SAFETY_COLOR[item.rating] ?? COLORS.textMuted;
                    const catIcon = CATEGORY_ICON[item.category ?? ""] ?? "📦";
                    return (
                        <TouchableOpacity
                            style={styles.item}
                            onPress={() => navigation.navigate("Result", { barcode: item.barcode })}
                            onLongPress={() => handleLongPress(item)}
                            activeOpacity={0.72}
                        >
                            {/* Image / Icon */}
                            <View style={[styles.imageBox, { borderColor: safetyColor + "33", borderWidth: 1.5 }]}>
                                {item.imageUrl ? (
                                    <Image source={{ uri: item.imageUrl }} style={styles.image} />
                                ) : (
                                    <View style={styles.imagePlaceholder}>
                                        <Text style={{ fontSize: 30 }}>{catIcon}</Text>
                                    </View>
                                )}
                            </View>

                            {/* Content */}
                            <View style={styles.itemContent}>
                                <Text style={styles.itemName} numberOfLines={1}>
                                    {item.name ?? "Sản phẩm DICO"}
                                </Text>
                                <Text style={styles.itemBrand} numberOfLines={1}>
                                    {item.brand ? item.brand : item.barcode}
                                </Text>

                                {/* Safety badge + time */}
                                <View style={styles.bottomRow}>
                                    <View style={[styles.safetyBadge, { backgroundColor: safetyColor + "18" }]}>
                                        <Text style={styles.safetyIcon}>{SAFETY_ICON[item.rating] ?? "❓"}</Text>
                                        <Text style={[styles.safetyText, { color: safetyColor }]}>
                                            {SAFETY_LABEL[item.rating] ?? "Chưa rõ"}
                                        </Text>
                                    </View>
                                    <Text style={styles.timeText}>{formatTime(item.scannedAt)}</Text>
                                </View>
                            </View>

                            {/* Score pill */}
                            {item.score !== null && (
                                <View style={[styles.scorePill, { backgroundColor: safetyColor + "18" }]}>
                                    <Text style={[styles.scoreNum, { color: safetyColor }]}>{item.score}</Text>
                                    <Text style={styles.scoreSub}>đ</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                }}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyEmoji}>{activeKeyword ? "🔍" : "📭"}</Text>
                        <Text style={styles.emptyTitle}>
                            {activeKeyword ? "Không tìm thấy kết quả" : "Chưa có lịch sử"}
                        </Text>
                        <Text style={styles.emptyDesc}>
                            {activeKeyword
                                ? `Không có sản phẩm phù hợp với "${activeKeyword}"`
                                : "Quét sản phẩm đầu tiên để bắt đầu!"}
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
    center: { flex: 1, justifyContent: "center", alignItems: "center" },

    header: {
        flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
        paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
        backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    title: { color: COLORS.text, fontSize: 22, fontWeight: "800" },
    headerCount: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
    clearAllBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: COLORS.dangerLight },
    clearAllText: { color: COLORS.danger, fontSize: 12, fontWeight: "700" },

    searchContainer: { paddingHorizontal: 16, paddingTop: 12, marginBottom: 8 },
    searchBar: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: COLORS.surface, borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 11,
        borderWidth: 1, borderColor: COLORS.border, gap: 8,
    },
    searchIcon: { fontSize: 15, opacity: 0.5 },
    searchInput: { flex: 1, color: COLORS.text, fontSize: 14 },
    clearBtn: { color: COLORS.textMuted, fontSize: 15, fontWeight: "600", paddingHorizontal: 4 },

    filterBar: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 8, flexWrap: "wrap" },
    filterBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    filterText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "500" },
    filterTextActive: { color: COLORS.white, fontWeight: "700" },

    sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: "700", paddingHorizontal: 16, marginBottom: 4 },

    item: {
        flexDirection: "row", alignItems: "center",
        paddingVertical: 12, paddingHorizontal: 16,
        backgroundColor: COLORS.white, gap: 12,
    },
    imageBox: {
        width: 68, height: 68, borderRadius: 12,
        backgroundColor: COLORS.surface,
        justifyContent: "center", alignItems: "center",
        overflow: "hidden",
    },
    image: { width: "100%", height: "100%", resizeMode: "cover" },
    imagePlaceholder: { justifyContent: "center", alignItems: "center" },

    itemContent: { flex: 1, gap: 2 },
    itemName: { color: COLORS.text, fontSize: 14, fontWeight: "700" },
    itemBrand: { color: COLORS.textMuted, fontSize: 12 },
    bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
    safetyBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    safetyIcon: { fontSize: 12 },
    safetyText: { fontSize: 12, fontWeight: "600" },
    timeText: { fontSize: 11, color: COLORS.textMuted },

    scorePill: {
        width: 44, height: 44, borderRadius: 12,
        alignItems: "center", justifyContent: "center",
    },
    scoreNum: { fontSize: 16, fontWeight: "900" },
    scoreSub: { fontSize: 9, color: COLORS.textMuted, marginTop: -2 },

    separator: { height: 1, backgroundColor: COLORS.border, marginLeft: 16 + 68 + 12 },

    emptyState: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, padding: 40 },
    emptyEmoji: { fontSize: 52 },
    emptyTitle: { color: COLORS.text, fontSize: 17, fontWeight: "700" },
    emptyDesc: { color: COLORS.textMuted, fontSize: 14, textAlign: "center", lineHeight: 20 },
});
