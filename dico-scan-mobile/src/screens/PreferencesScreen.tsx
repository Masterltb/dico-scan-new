// src/screens/PreferencesScreen.tsx
// Màn hình Cài đặt cá nhân — redesign theo đúng Figma Frame (Hồ sơ cá nhân + Cài đặt chi tiết)
// Hiển thị trạng thái gói hiện tại, ẩn nút nâng cấp nếu đã sở hữu.

import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { COLORS } from "@/constants/colors";
import { useAuthStore } from "@/store/authStore";
import { StandardError, UserPreferencesResponse } from "@/api/types";
import { getPreferences } from "@/api/users";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { usePreferencesStore } from "@/store/userPreferencesStore";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function PreferencesScreen() {
    const navigation = useNavigation<NavProp>();
    const { logout } = useAuthStore();
    const { setSafetyProfile } = usePreferencesStore();

    // ── Fetch preferences từ server ──────────────────────────────
    const { data, isLoading, isError, error, refetch } = useQuery<UserPreferencesResponse, StandardError>({
        queryKey: ["userPreferences"],
        queryFn: getPreferences,
    });

    useEffect(() => {
        if (data?.safetyProfile) {
            setSafetyProfile(data.safetyProfile);
        }
    }, [data, setSafetyProfile]);

    const handleLogout = async () => {
        await logout();
    };

    const isPremium = data?.subscriptionTier === "PREMIUM" || data?.subscriptionTier === "PREMIUM_GOLD";
    const isGold = data?.subscriptionTier === "PREMIUM_GOLD";
    
    // Safety Profile Data
    const safetyProfile = data?.safetyProfile;
    const allergies = data?.allergies || [];
    const healthConditions = safetyProfile?.healthConditions || [];
    const skinTypes = safetyProfile?.cosmeticSensitivities || [];

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={COLORS.primary} size="large" />
                <Text style={styles.muted}>Đang tải cài đặt...</Text>
            </View>
        );
    }

    if (isError) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>Không thể tải cài đặt</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
                    <Text style={styles.retryText}>Thử lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* ── Header ── */}
            <View style={styles.headerRow}>
                {navigation.canGoBack() ? (
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
                        <Text style={styles.headerIcon}>‹</Text>
                    </TouchableOpacity>
                ) : <View style={{ width: 32 }} />}
                
                <Text style={styles.title}>Hồ sơ cá nhân</Text>
                
                <TouchableOpacity style={styles.headerIconBtn}>
                    <Text style={styles.headerBell}>🔔</Text>
                </TouchableOpacity>
            </View>

            {/* ── Danh sách hồ sơ ── */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Danh sách hồ sơ</Text>
                <View style={[styles.tierBadgeStyle, isGold ? { backgroundColor: "#FFF3CD" } : isPremium ? { backgroundColor: COLORS.primaryLight } : {}]}>
                    <Text style={[styles.tierLabel, isGold ? { color: "#856404" } : isPremium ? { color: COLORS.primary } : {}]}>
                        {isGold ? "Premium Gold" : isPremium ? "Premium" : "Gói Free"}
                    </Text>
                </View>
            </View>

            <View style={styles.profilesRow}>
                {/* Profile Bản thân (Main) */}
                <View style={styles.profileBoxActive}>
                    <View style={styles.avatarWrap}>
                        <View style={styles.avatarImgPlaceholder}>
                            <Text style={styles.avatarTextIcon}>👤</Text>
                        </View>
                        <View style={styles.checkBadge}>
                            <Text style={styles.checkBadgeText}>✓</Text>
                        </View>
                    </View>
                    <Text style={styles.profileName}>Bản thân</Text>
                    <Text style={styles.profileFocus}>FOCUS: TỔNG QUÁT</Text>
                </View>

                {/* Profile Trống / Locked */}
                <TouchableOpacity 
                    style={styles.profileBoxEmpty}
                    onPress={() => {
                        if (!isPremium && !isGold) navigation.navigate("Upgrade");
                        else navigation.navigate("FamilyProfiles");
                    }}
                    activeOpacity={0.8}
                >
                    <Text style={styles.lockIcon}>{(isPremium || isGold) ? "➕" : "🔒"}</Text>
                    <Text style={styles.emptyText}>Trống</Text>
                    {(!isPremium && !isGold) && (
                        <Text style={styles.upgradeTextLocked}>NÂNG CẤP PREMIUM</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* CTA Thêm hồ sơ mới */}
            <TouchableOpacity 
                style={styles.addProfileBtn}
                onPress={() => {
                    if (!isPremium && !isGold) navigation.navigate("Upgrade");
                    else navigation.navigate("FamilyProfiles");
                }}
                activeOpacity={0.85}
            >
                <View style={styles.addBtnContent}>
                    <View style={styles.addBtnIconWrap}>
                        <Text style={styles.addBtnIcon}>👤+</Text>
                    </View>
                    <View style={styles.addBtnTextCol}>
                        <Text style={styles.addBtnTitle}>Thêm hồ sơ mới</Text>
                        <Text style={styles.addBtnSub}>Quản lý tối đa 3 hồ sơ gia đình</Text>
                    </View>
                </View>
                {/* Nếu chưa có gói nào thì hiện tag CTA PREMIUM */}
                {(!isPremium && !isGold) && (
                    <View style={styles.premiumTag}>
                        <Text style={styles.premiumTagIcon}>⭐</Text>
                        <Text style={styles.premiumTagText}>PREMIUM</Text>
                    </View>
                )}
            </TouchableOpacity>

            {/* ── Cài đặt chi tiết ── */}
            <View style={styles.sectionHeaderMargins}>
                <Text style={styles.sectionTitle}>
                    Cài đặt chi tiết: <Text style={styles.highlightText}>Bản thân</Text>
                </Text>
            </View>

            {/* Card 1: Dị ứng & Thành phần độc hại */}
            <View style={styles.detailCard}>
                <View style={styles.cardHeader}>
                    <View style={styles.cardIconDanger}>
                        <Text style={styles.cardIconText}>⚠️</Text>
                    </View>
                    <View style={styles.cardHeaderTexts}>
                        <Text style={styles.cardTitle}>Dị ứng & Thành phần độc hại</Text>
                        <Text style={styles.cardSub}>Cảnh báo khi quét sản phẩm</Text>
                    </View>
                </View>
                <View style={styles.chipRow}>
                    {allergies.length > 0 ? (
                        allergies.map(a => (
                            <View key={a} style={[styles.chip, styles.chipDangerLight]}>
                                <Text style={styles.chipTextDanger}>{a} ✕</Text>
                            </View>
                        ))
                    ) : (
                        <View style={[styles.chip, styles.chipDangerLight]}>
                            <Text style={styles.chipTextDanger}>Chưa có ✕</Text>
                        </View>
                    )}
                    <TouchableOpacity 
                        style={[styles.chip, styles.chipPrimaryLight]}
                        onPress={() => navigation.navigate("SafetyWizard")}
                    >
                        <Text style={styles.chipTextPrimary}>⭐ Nâng cấp để thêm</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Card 2: Loại da của bạn */}
            <View style={styles.detailCard}>
                <View style={styles.cardHeader}>
                    <View style={styles.cardIconPrimary}>
                        <Text style={styles.cardIconText}>😊</Text>
                    </View>
                    <View style={styles.cardHeaderTexts}>
                        <Text style={styles.cardTitle}>Loại da của bạn</Text>
                        <Text style={styles.cardSub}>Tối ưu hóa gợi ý sản phẩm</Text>
                    </View>
                </View>
                <View style={styles.chipRow}>
                    {skinTypes.length > 0 ? (
                        skinTypes.map(s => (
                            <View key={s} style={[styles.chip, styles.chipOutlinePrimary]}>
                                <Text style={styles.chipTextOutlinePrimary}>{s}</Text>
                            </View>
                        ))
                    ) : (
                        <>
                            <View style={[styles.chip, styles.chipOutlinePrimary]}>
                                <Text style={styles.chipTextOutlinePrimary}>Da nhạy cảm</Text>
                            </View>
                            <View style={[styles.chip, styles.chipOutlineRegular]}>
                                <Text style={styles.chipTextOutlineRegular}>Da hỗn hợp</Text>
                            </View>
                        </>
                    )}
                </View>
            </View>

            {/* Card 3: Tình trạng bệnh lý */}
            <TouchableOpacity style={styles.detailCardMini} onPress={() => navigation.navigate("SafetyWizard")} activeOpacity={0.7}>
                <View style={styles.cardIconSuccess}>
                    <Text style={styles.cardIconText}>💼</Text>
                </View>
                <View style={styles.cardHeaderTexts}>
                    <Text style={styles.cardTitle}>Tình trạng bệnh lý</Text>
                    <Text style={styles.cardSub}>Dành cho thực phẩm chức năng</Text>
                </View>
                <Text style={styles.arrowRight}>›</Text>
            </TouchableOpacity>

            {/* Đăng xuất */}
            <View style={styles.logoutWrapper}>
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Text style={styles.logoutBtnText}>Đăng xuất</Text>
                </TouchableOpacity>
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F7F8FA" }, // Light cool gray background
    content: { paddingBottom: 40 },
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#F7F8FA" },
    muted: { color: COLORS.textMuted, marginTop: 12 },
    errorIcon: { fontSize: 32, marginBottom: 8 },
    errorText: { color: COLORS.danger, fontWeight: "600", marginBottom: 16 },
    retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    retryText: { color: COLORS.white, fontWeight: "600" },

    // Header
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 52,
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    headerIconBtn: {
        width: 40, height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        justifyContent: "center", alignItems: "center",
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    headerIcon: { fontSize: 24, color: COLORS.text, fontWeight: "300", marginLeft: -2 },
    headerBell: { fontSize: 18 },
    title: { fontSize: 18, fontWeight: "700", color: COLORS.text },

    // Section Header
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text },
    tierBadgeStyle: {
        backgroundColor: "#E2E8F0", // fallback
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    tierLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted },
    highlightText: { color: COLORS.primary, fontStyle: "italic" },

    // Profiles Row
    profilesRow: {
        flexDirection: "row",
        paddingHorizontal: 20,
        gap: 16,
        marginBottom: 20,
    },
    profileBoxActive: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 16,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: COLORS.primary, shadowOffset: { width:0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4,
        borderWidth: 1.5, borderColor: COLORS.primaryLight,
    },
    avatarWrap: { position: "relative", marginBottom: 12 },
    avatarImgPlaceholder: {
        width: 64, height: 64, borderRadius: 32, backgroundColor: "#E8EDFF",
        justifyContent: "center", alignItems: "center",
        borderWidth: 3, borderColor: COLORS.primary,
    },
    avatarTextIcon: { fontSize: 28 },
    checkBadge: {
        position: "absolute", bottom: -2, right: -2,
        width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.primary,
        justifyContent: "center", alignItems: "center",
        borderWidth: 2, borderColor: COLORS.white,
    },
    checkBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: "bold" },
    profileName: { fontSize: 15, fontWeight: "700", color: COLORS.text, marginBottom: 4 },
    profileFocus: { fontSize: 10, fontWeight: "700", color: COLORS.textMuted, letterSpacing: 0.5 },

    profileBoxEmpty: {
        flex: 1,
        backgroundColor: "transparent",
        borderRadius: 24,
        padding: 16,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5, borderColor: "#CBD5E1", borderStyle: "dashed",
    },
    lockIcon: { fontSize: 24, color: "#94A3B8", marginBottom: 8 },
    emptyText: { fontSize: 14, fontWeight: "600", color: "#94A3B8", marginBottom: 4 },
    upgradeTextLocked: { fontSize: 9, fontWeight: "700", color: COLORS.primary, letterSpacing: 0.5 },

    // Big Add Button CTA
    addProfileBtn: {
        marginHorizontal: 20,
        backgroundColor: COLORS.primary,
        borderRadius: 24,
        padding: 18,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: COLORS.primary, shadowOffset: { width:0, height:6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
        marginBottom: 32,
    },
    addBtnContent: { flexDirection: "row", alignItems: "center", gap: 14 },
    addBtnIconWrap: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center", alignItems: "center",
    },
    addBtnIcon: { color: COLORS.white, fontSize: 20 },
    addBtnTextCol: { flex: 1 },
    addBtnTitle: { color: COLORS.white, fontSize: 16, fontWeight: "700", marginBottom: 2 },
    addBtnSub: { color: "rgba(255,255,255,0.8)", fontSize: 11 },
    premiumTag: {
        flexDirection: "row", alignItems: "center", gap: 4,
        backgroundColor: "#FFC107", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
    },
    premiumTagIcon: { fontSize: 12 },
    premiumTagText: { color: "#000", fontSize: 10, fontWeight: "800" },

    // Detail section
    sectionHeaderMargins: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    detailCard: {
        marginHorizontal: 20,
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#000", shadowOffset: { width:0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    detailCardMini: {
        marginHorizontal: 20,
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000", shadowOffset: { width:0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
    cardIconDanger: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.dangerLight, justifyContent: "center", alignItems: "center" },
    cardIconPrimary: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryLight, justifyContent: "center", alignItems: "center" },
    cardIconSuccess: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.successLight, justifyContent: "center", alignItems: "center", marginRight: 12 },
    cardIconText: { fontSize: 20 },
    cardHeaderTexts: { flex: 1 },
    cardTitle: { fontSize: 15, fontWeight: "700", color: COLORS.text, marginBottom: 2 },
    cardSub: { fontSize: 12, color: COLORS.textMuted },
    arrowRight: { fontSize: 24, color: COLORS.textMuted, marginLeft: 8 },

    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
    chipDangerLight: { backgroundColor: "#FFF1F2", borderWidth: 1, borderColor: "#FFE4E6" },
    chipTextDanger: { color: COLORS.danger, fontSize: 13, fontWeight: "600" },
    chipPrimaryLight: { backgroundColor: COLORS.primaryLight, borderWidth: 1, borderColor: COLORS.primary + "30" },
    chipTextPrimary: { color: COLORS.primary, fontSize: 13, fontWeight: "600" },
    chipOutlinePrimary: { backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.primary },
    chipTextOutlinePrimary: { color: COLORS.primary, fontSize: 13, fontWeight: "600" },
    chipOutlineRegular: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
    chipTextOutlineRegular: { color: COLORS.textMuted, fontSize: 13 },

    logoutWrapper: { paddingHorizontal: 20, paddingVertical: 24, alignItems: "center" },
    logoutBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: COLORS.dangerLight },
    logoutBtnText: { color: COLORS.danger, fontWeight: "700", fontSize: 14 },
});
