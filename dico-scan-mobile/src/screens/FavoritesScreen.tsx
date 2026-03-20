// src/screens/FavoritesScreen.tsx
// Danh sách yêu thích: SAFE (Mua lại) | AVOID (Tránh mua)

import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { COLORS } from "@/constants/colors";
import { getFavorites, removeFavorite, FavoriteItem } from "@/api/stats";
import { useAuthStore } from "@/store/authStore";

type FilterType = "ALL" | "SAFE" | "AVOID";

const FILTER_OPTIONS: { label: string; value: FilterType; emoji: string }[] = [
    { label: "Tất cả", value: "ALL", emoji: "" },
    { label: "Mua lại", value: "SAFE", emoji: "✅" },
    { label: "Tránh mua", value: "AVOID", emoji: "🚫" },
];

export default function FavoritesScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState<FilterType>("ALL");

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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["favorites"] });
        },
    });

    const handleRemove = (item: FavoriteItem) => {
        Alert.alert(
            "Xóa yêu thích",
            `Xóa "${item.barcode}" khỏi danh sách yêu thích?`,
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: () => removeMutation.mutate(item.barcode),
                },
            ]
        );
    };

    const filtered =
        filter === "ALL" ? (data ?? []) : (data ?? []).filter((f) => f.label === filter);

    if (isFree) {
        return (
            <View style={styles.center}>
                <Text style={{ fontSize: 40, marginBottom: 10 }}>💎</Text>
                <Text style={styles.title}>Tính năng Premium</Text>
                <Text style={styles.muted}>Nâng cấp tài khoản để lưu trữ danh sách sản phẩm Yêu thích.</Text>
                <TouchableOpacity style={[styles.retryBtn, { marginTop: 15 }]} onPress={() => navigation.navigate("Upgrade")}>
                    <Text style={styles.retryText}>Xem gói Nâng cấp</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={COLORS.primary} size="large" />
                <Text style={styles.muted}>Đang tải...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.center}>
                <Text style={styles.muted}>Không thể tải danh sách</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
                    <Text style={styles.retryText}>Thử lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>⭐ Yêu thích</Text>
                <Text style={styles.count}>{data?.length ?? 0} sản phẩm</Text>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterRow}>
                {FILTER_OPTIONS.map((f) => (
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

            {/* Favorites List */}
            <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.item}
                        onPress={() => navigation.navigate("Result", { barcode: item.barcode })}
                        activeOpacity={0.75}
                    >
                        {/* Label indicator */}
                        <View style={[styles.labelDot, { backgroundColor: item.label === "SAFE" ? "#22C55E" : "#EF4444" }]} />

                        <View style={styles.itemContent}>
                            <Text style={styles.itemBarcode}>{item.barcode}</Text>
                            {item.note ? (
                                <Text style={styles.itemNote} numberOfLines={1}>📝 {item.note}</Text>
                            ) : null}
                            <Text style={styles.itemMeta}>
                                {item.label === "SAFE" ? "✅ Mua lại" : "🚫 Tránh mua"} ·{" "}
                                {new Date(item.addedAt).toLocaleDateString("vi-VN")}
                            </Text>
                        </View>

                        {/* Compare + Remove */}
                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={styles.compareBtn}
                                onPress={() => navigation.navigate("Compare", { barcode1: item.barcode })}
                            >
                                <Text style={styles.compareBtnText}>⚖️</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.removeBtn}
                                onPress={() => handleRemove(item)}
                            >
                                <Text style={styles.removeBtnText}>🗑</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.arrow}>›</Text>
                    </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyEmoji}>{filter === "SAFE" ? "✅" : filter === "AVOID" ? "🚫" : "⭐"}</Text>
                        <Text style={styles.emptyTitle}>Chưa có sản phẩm</Text>
                        <Text style={styles.muted}>
                            {filter === "SAFE"
                                ? "Chưa có sản phẩm nào đánh dấu Mua lại"
                                : filter === "AVOID"
                                    ? "Chưa có sản phẩm nào đánh dấu Tránh mua"
                                    : "Quét sản phẩm và thêm vào danh sách yêu thích!"}
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

    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
    title: { color: COLORS.text, fontSize: 22, fontWeight: "700" },
    count: { color: COLORS.textMuted, fontSize: 13 },

    filterRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 10 },
    filterBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    filterText: { color: COLORS.textMuted, fontSize: 12 },
    filterTextActive: { color: COLORS.white, fontWeight: "600" },

    item: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, backgroundColor: COLORS.surface, marginHorizontal: 12, borderRadius: 12 },
    labelDot: { width: 6, height: 40, borderRadius: 3, marginRight: 12 },
    itemContent: { flex: 1 },
    itemBarcode: { color: COLORS.text, fontSize: 15, fontWeight: "700", marginBottom: 3 },
    itemNote: { color: COLORS.textMuted, fontSize: 11, marginBottom: 2 },
    itemMeta: { color: COLORS.textMuted, fontSize: 11 },
    actions: { flexDirection: "row", gap: 6, marginRight: 6 },
    compareBtn: { backgroundColor: COLORS.background, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 6, paddingVertical: 4 },
    compareBtnText: { fontSize: 13 },
    removeBtn: { backgroundColor: COLORS.background, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 6, paddingVertical: 4 },
    removeBtnText: { fontSize: 13 },
    arrow: { color: COLORS.textMuted, fontSize: 18 },
    separator: { height: 8 },

    empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, padding: 40 },
    emptyEmoji: { fontSize: 48 },
    emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: "600" },
    muted: { color: COLORS.textMuted, fontSize: 13, textAlign: "center" },
    retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
    retryText: { color: COLORS.white, fontWeight: "600", fontSize: 14 },
});
