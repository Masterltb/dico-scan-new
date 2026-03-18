// src/screens/UpgradeScreen.tsx
// Nâng cấp DICO Premium — Light Mode theo Frame Figma 2
// Hero banner lavender gradient + feature list + pricing plans + CTA button

import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { COLORS } from "@/constants/colors";
import { useAuthStore } from "@/store/authStore";
import { upgradeToPremdium } from "@/api/subscriptions";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type Props = NativeStackScreenProps<RootStackParamList, "Upgrade">;

const PLANS = [
    {
        id: "premium_1m",
        name: "Hàng tháng",
        price: "35.000đ",
        priceNum: "35.000",
        billing: "/ tháng",
        isGold: false,
        badge: "",
    },
    {
        id: "premium_12m",
        name: "Hàng năm",
        price: "199.000đ",
        priceNum: "199.000",
        billing: "/ 6 tháng",
        isGold: false,
        badge: "TIẾT KIỆM 30%",
        savingsNote: "Tiết kiệm so sánh: 385.000đ",
    },
];

const FEATURES = [
    { icon: "👨‍👩‍👧", title: "Quản lý tối đa 3 hồ sơ gia đình", sub: "Tối ưu cho sức khỏe từng Ban thân, Ba,..." },
    { icon: "⚖️", title: "So sánh sản phẩm không giới hạn", sub: "Đưa ra lựa chọn mua sắm thông minh nhất" },
    { icon: "📋", title: "Phân tích AI toàn diện", sub: "Chi tiết thành phần & cảnh báo sức khỏe" },
    { icon: "🚫", title: "Không quảng cáo", sub: "Ưu tiên trải nghiệm đối với mọi nội nhất" },
];

export default function UpgradeScreen({ navigation }: Props) {
    const { isAuthenticated } = useAuthStore();
    const queryClient = useQueryClient();
    const [selectedPlan, setSelectedPlan] = useState<string>("premium_12m");

    const mutation = useMutation({
        mutationFn: upgradeToPremdium,
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ["userPreferences"] });
            queryClient.invalidateQueries({ queryKey: ["subscriptionStatus"] });
            if (res.upgraded) {
                Alert.alert("🎉 Thành công!", "Gói Premium đã được kích hoạt!", [
                    { text: "Quay lại", onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert("✅", res.message);
                navigation.goBack();
            }
        },
        onError: () => Alert.alert("Lỗi", "Không thể nâng cấp. Vui lòng thử lại."),
    });

    const handlePurchase = () => {
        if (!isAuthenticated) {
            Alert.alert("Cần đăng nhập", "Vui lòng đăng nhập để nâng cấp.");
            return;
        }
        mutation.mutate();
    };

    const selectedPlanData = PLANS.find(p => p.id === selectedPlan);

    return (
        <View style={styles.container}>
            {/* Close button — X top right */}
            <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* ── Hero Banner — Frame 2: lavender purple gradient with star icon ── */}
                <View style={styles.heroBanner}>
                    <View style={styles.heroStarWrap}>
                        <Text style={styles.heroStar}>✨</Text>
                    </View>
                    <Text style={styles.heroBadge}>PREMIUM ACCESS</Text>
                </View>

                {/* ── Title + subtitle ── */}
                <Text style={styles.title}>Nâng cấp DICO Premium</Text>
                <Text style={styles.subtitle}>
                    Mở khóa toàn bộ sức mạnh phân tích AI cho cả gia đình.
                </Text>

                {/* ── Feature rows — Frame 2 style: icon circle + title + sub ── */}
                <View style={styles.featureList}>
                    {FEATURES.map((f, i) => (
                        <View key={i} style={styles.featureRow}>
                            <View style={styles.featureIconWrap}>
                                <Text style={styles.featureIcon}>{f.icon}</Text>
                            </View>
                            <View style={styles.featureContent}>
                                <Text style={styles.featureTitle}>{f.title}</Text>
                                <Text style={styles.featureSub}>{f.sub}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* ── Pricing plans ── */}
                <View style={styles.plansRow}>
                    {PLANS.map(plan => {
                        const isSelected = selectedPlan === plan.id;
                        return (
                            <TouchableOpacity
                                key={plan.id}
                                style={[styles.planCard, isSelected && styles.planCardSelected]}
                                onPress={() => setSelectedPlan(plan.id)}
                                activeOpacity={0.85}
                            >
                                {plan.badge ? (
                                    <View style={styles.planBadge}>
                                        <Text style={styles.planBadgeText}>{plan.badge}</Text>
                                    </View>
                                ) : null}
                                <Text style={[styles.planName, isSelected && styles.planNameSelected]}>{plan.name}</Text>
                                <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>{plan.priceNum}đ</Text>
                                <Text style={[styles.planBilling, isSelected && styles.planBillingSelected]}>{plan.billing}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Savings note */}
                {selectedPlanData?.savingsNote && (
                    <Text style={styles.savingsNote}>{selectedPlanData.savingsNote}</Text>
                )}
            </ScrollView>

            {/* ── CTA Footer ── */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.buyBtn, mutation.isPending && styles.buyBtnDisabled]}
                    onPress={handlePurchase}
                    disabled={mutation.isPending}
                >
                    {mutation.isPending ? (
                        <ActivityIndicator color={COLORS.white} />
                    ) : (
                        <Text style={styles.buyBtnText}>Nâng cấp ngay →</Text>
                    )}
                </TouchableOpacity>
                <Text style={styles.terms}>
                    🔒 Hủy bất kỳ lúc nào · Bảo mật 100%
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.white },

    // Close button — top right
    closeBtn: {
        position: "absolute",
        top: 52,
        right: 20,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.surface,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
        zIndex: 10,
    },
    closeIcon: { color: COLORS.text, fontSize: 16, fontWeight: "600" },

    content: { paddingTop: 52, paddingHorizontal: 24, paddingBottom: 40 },

    // Hero banner — Frame 2: lavender/purple rounded rect
    heroBanner: {
        backgroundColor: "#7C84E8",
        borderRadius: 20,
        padding: 28,
        alignItems: "center",
        marginBottom: 24,
        marginTop: 8,
    },
    heroStarWrap: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "rgba(255,255,255,0.25)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 10,
    },
    heroStar: { fontSize: 28 },
    heroBadge: {
        color: "#E8D5FF",
        fontSize: 13,
        fontWeight: "700",
        letterSpacing: 1.5,
    },

    // Title + subtitle
    title: { color: COLORS.text, fontSize: 26, fontWeight: "800", marginBottom: 8 },
    subtitle: { color: COLORS.textMuted, fontSize: 14, lineHeight: 22, marginBottom: 24 },

    // Feature list — Frame 2
    featureList: { gap: 0, marginBottom: 24 },
    featureRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 14,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    featureIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primaryLight,
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0,
    },
    featureIcon: { fontSize: 22 },
    featureContent: { flex: 1 },
    featureTitle: { color: COLORS.text, fontSize: 14, fontWeight: "700", marginBottom: 3, lineHeight: 20 },
    featureSub: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18 },

    // Plans row — Frame 2: 2 column cards side by side
    plansRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
    planCard: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        alignItems: "center",
        gap: 4,
        borderWidth: 2,
        borderColor: COLORS.border,
        position: "relative",
        overflow: "hidden",
        minHeight: 100,
        justifyContent: "center",
    },
    planCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
    planBadge: {
        position: "absolute",
        top: 0,
        right: 0,
        left: 0,
        backgroundColor: COLORS.primary,
        paddingVertical: 4,
        alignItems: "center",
    },
    planBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
    planName: { color: COLORS.textMuted, fontSize: 13, fontWeight: "600", marginTop: 16 },
    planNameSelected: { color: COLORS.primary },
    planPrice: { color: COLORS.text, fontSize: 20, fontWeight: "800" },
    planPriceSelected: { color: COLORS.primary },
    planBilling: { color: COLORS.textMuted, fontSize: 11 },
    planBillingSelected: { color: COLORS.primary },

    savingsNote: { color: COLORS.successText, fontSize: 12, textAlign: "center", marginBottom: 16, fontWeight: "600" },

    // Footer CTA
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        backgroundColor: COLORS.white,
        gap: 10,
        alignItems: "center",
    },
    buyBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: "center",
        width: "100%",
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 5,
    },
    buyBtnDisabled: { opacity: 0.7, shadowOpacity: 0 },
    buyBtnText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
    terms: { color: COLORS.textMuted, fontSize: 12 },
});
