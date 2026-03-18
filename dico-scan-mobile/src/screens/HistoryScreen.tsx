// src/screens/HistoryScreen.tsx
// Lịch sử quét — Light Mode theo Frame Figma 3
// Flat list + image 70px + safety badge (✅ An toàn / ⚠️ Cẩn thận)

import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import React, { useState, useCallback } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { COLORS } from "@/constants/colors";
import { queryKeys } from "@/constants/queryKeys";
import { getScanHistory, searchHistory } from "@/api/products";
import { RatingColor, ScanHistoryItem } from "@/api/types";

type FilterType = "ALL" | RatingColor;

const FILTERS: { label: string; value: FilterType; emoji: string }[] = [
    { label: "Tất cả", value: "ALL", emoji: "" },
    { label: "An toàn", value: "GREEN", emoji: "✅" },
    { label: "Cẩn thận", value: "YELLOW", emoji: "⚠️" },
    { label: "Nguy hiểm", value: "RED", emoji: "🚫" },
];

const SAFETY_ICON: Record<string, string> = {
    GREEN: "✅",
    YELLOW: "⚠️",
    RED: "🚫",
    UNKNOWN: "❓",
};

const SAFETY_LABEL: Record<string, string> = {
    GREEN: "An toàn",
    YELLOW: "Cẩn thận",
    RED: "Nguy hiểm",
    UNKNOWN: "Chưa rõ",
};

const SAFETY_COLOR: Record<string, string> = {
    GREEN: COLORS.success,
    YELLOW: COLORS.warning,
    RED: COLORS.danger,
    UNKNOWN: COLORS.textMuted,
};

export default function HistoryScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [filter, setFilter] = useState<FilterType>("ALL");
    const [searchText, setSearchText] = useState("");
    const [activeKeyword, setActiveKeyword] = useState<string | undefined>(undefined);

    const handleSearchChange = useCallback((text: string) => {
        setSearchText(text);
        if (!text.trim()) setActiveKeyword(undefined);
    }, []);

    const handleSearchSubmit = () => {
        setActiveKeyword(searchText.trim() || undefined);
    };

    const handleClearSearch = () => {
        setSearchText("");
        setActiveKeyword(undefined);
    };

    // Load all history
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: queryKeys.history(0),
        queryFn: () => getScanHistory(0, 200),
        staleTime: 1000 * 30,
    });

    // Search by keyword
    const { data: searchData, isLoading: searchLoading } = useQuery({
        queryKey: ["historySearch", activeKeyword],
        queryFn: () => searchHistory(activeKeyword!),
        enabled: !!activeKeyword,
        staleTime: 1000 * 30,
    });

    const loading = isLoading || searchLoading;
    const rawList: ScanHistoryItem[] = activeKeyword ? (searchData ?? []) : (data ?? []);
    const filtered = filter === "ALL" ? rawList : rawList.filter(i => i.snapshotColor === filter);

    if (loading && !data) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
        );
    }

    if (error && !data) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorEmoji}>⚠️</Text>
                <Text style={styles.errorText}>Không thể tải lịch sử</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
                    <Text style={styles.retryText}>Thử lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header — Frame 3: title + avatar */}
            <View style={styles.header}>
                <Text style={styles.title}>Lịch sử</Text>
                <View style={styles.headerAvatar}>
                    <Text style={styles.headerAvatarText}>👤</Text>
                </View>
            </View>

            {/* Search bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm kiếm sản phẩm"
                        placeholderTextColor={COLORS.textMuted}
                        value={searchText}
                        onChangeText={handleSearchChange}
                        onSubmitEditing={handleSearchSubmit}
                        returnKeyType="search"
                        clearButtonMode="while-editing"
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
            )}

            {/* Section title */}
            <Text style={styles.sectionTitle}>
                {activeKeyword ? `Kết quả cho "${activeKeyword}"` : "Lịch sử gần đây"}
            </Text>

            {/* List */}
            <FlatList
                data={Array.isArray(filtered) ? filtered : []}
                keyExtractor={(item, index) => item?.scanId ?? item?.barcode ?? index.toString()}
                renderItem={({ item }: { item: ScanHistoryItem }) => {
                    if (!item) return null;
                    const safetyColor = SAFETY_COLOR[item.snapshotColor] ?? COLORS.textMuted;
                    return (
                        <TouchableOpacity
                            style={styles.item}
                            onPress={() => navigation.navigate("Result", { barcode: item.barcode })}
                            activeOpacity={0.7}
                        >
                            {/* Product image */}
                            <View style={styles.imageBox}>
                                {item.imageUrl ? (
                                    <Image source={{ uri: item.imageUrl }} style={styles.image} />
                                ) : (
                                    <View style={styles.imagePlaceholder}>
                                        <Text style={{ fontSize: 28 }}>📦</Text>
                                    </View>
                                )}
                            </View>

                            {/* Content */}
                            <View style={styles.itemContent}>
                                <Text style={styles.itemName} numberOfLines={1}>
                                    {item.name ?? "Sản phẩm DICO"}
                                </Text>
                                <Text style={styles.itemCategory} numberOfLines={1}>
                                    {item.barcode}
                                </Text>
                                {/* Safety badge — Frame 3 style */}
                                <View style={styles.safetyRow}>
                                    <Text style={styles.safetyIcon}>{SAFETY_ICON[item.snapshotColor] ?? "❓"}</Text>
                                    <Text style={[styles.safetyText, { color: safetyColor }]}>
                                        {SAFETY_LABEL[item.snapshotColor] ?? "Chưa rõ"}
                                    </Text>
                                </View>
                            </View>
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
                                : "Quét sản phẩm đầu tiên của bạn!"}
                        </Text>
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

    // Header — Frame 3: centered title "Lịch sử" + avatar icon
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 16,
    },
    title: { color: COLORS.text, fontSize: 22, fontWeight: "800" },
    headerAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: COLORS.surface,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    headerAvatarText: { fontSize: 20 },

    // Search bar — Frame 3 rounded pill, light gray
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
    clearBtn: { color: COLORS.textMuted, fontSize: 15, fontWeight: "600", paddingHorizontal: 4 },

    // Filter pills
    filterBar: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 8, flexWrap: "wrap" },
    filterBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    filterText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "500" },
    filterTextActive: { color: COLORS.white, fontWeight: "700" },

    // Section title
    sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: "800", paddingHorizontal: 16, marginBottom: 8 },

    // Item — Frame 3 style: flat row, image 70px, safety badge colored text
    item: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: COLORS.white,
        gap: 14,
    },
    imageBox: {
        width: 70,
        height: 70,
        borderRadius: 10,
        backgroundColor: COLORS.surface,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    image: { width: "100%", height: "100%", resizeMode: "cover" },
    imagePlaceholder: { justifyContent: "center", alignItems: "center" },
    itemContent: { flex: 1 },
    itemName: { color: COLORS.text, fontSize: 15, fontWeight: "700", marginBottom: 3 },
    itemCategory: { color: COLORS.textMuted, fontSize: 12, marginBottom: 6 },
    // Safety badge row — Frame 3 style: icon + colored text
    safetyRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    safetyIcon: { fontSize: 14 },
    safetyText: { fontSize: 13, fontWeight: "600" },
    separator: { height: 1, backgroundColor: COLORS.border },

    // Empty state
    emptyState: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, padding: 40 },
    emptyEmoji: { fontSize: 52 },
    emptyTitle: { color: COLORS.text, fontSize: 17, fontWeight: "700" },
    emptyDesc: { color: COLORS.textMuted, fontSize: 14, textAlign: "center", lineHeight: 20 },
});
