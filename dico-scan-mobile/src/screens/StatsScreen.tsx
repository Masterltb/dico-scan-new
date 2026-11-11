// src/screens/StatsScreen.tsx
// Thống kê thói quen — Light Mode theo Frame Figma 3
// Donut ring teal xanh (số ĐÃ QUÉT), 3 stat pills (An toàn/Cần cân nhắc/Không phù hợp), AI Insights cards

import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { COLORS } from "@/constants/colors";
import { useAuthStore } from "@/store/authStore";
import { getUserStats } from "@/api/stats";

// ── DonutRing — Frame 3 style: teal/green ring, center big number ──────────
function DonutRing({ total, safe, caution, danger }: { total: number; safe: number; caution: number; danger: number }) {
    const size = 140;
    // arc emulated with concentric borders (simplified)
    return (
        <View style={donutStyles.wrapper}>
            <View style={donutStyles.ringOuter}>
                <View style={[donutStyles.ringInner, { borderColor: "#22C55E" }]}>
                    <View style={donutStyles.ringCore}>
                        <Text style={donutStyles.bigNum}>{total}</Text>
                        <Text style={donutStyles.bigLabel}>ĐÃ QUÉT</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const donutStyles = StyleSheet.create({
    wrapper: { alignItems: "center", marginBottom: 24 },
    ringOuter: {
        width: 150,
        height: 150,
        borderRadius: 75,
        borderWidth: 12,
        borderColor: "#E8E9F2",
        justifyContent: "center",
        alignItems: "center",
    },
    ringInner: {
        width: 126,
        height: 126,
        borderRadius: 63,
        borderWidth: 3,
        borderColor: "#22C55E",
        justifyContent: "center",
        alignItems: "center",
    },
    ringCore: { alignItems: "center" },
    bigNum: { fontSize: 36, fontWeight: "800", color: COLORS.text },
    bigLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted, letterSpacing: 1 },
});

// ── Stat Pill ──────────────────────────────────────────────────────────────
function StatPill({ label, pct, color, bg }: { label: string; pct: number; color: string; bg: string }) {
    return (
        <View style={[pillStyles.pill, { backgroundColor: bg }]}>
            <Text style={[pillStyles.pct, { color }]}>{pct}%</Text>
            <Text style={[pillStyles.label, { color }]}>{label}</Text>
        </View>
    );
}

const pillStyles = StyleSheet.create({
    pill: { flex: 1, paddingVertical: 14, paddingHorizontal: 8, borderRadius: 14, alignItems: "center", gap: 4 },
    pct: { fontSize: 18, fontWeight: "800" },
    label: { fontSize: 11, fontWeight: "600", textAlign: "center" },
});

// ── AI Insight card ────────────────────────────────────────────────────────
function InsightCard({ emoji, bg, title, sub }: { emoji: string; bg: string; title: string; sub: string }) {
    return (
        <View style={insightStyles.card}>
            <View style={[insightStyles.icon, { backgroundColor: bg }]}>
                <Text style={insightStyles.emoji}>{emoji}</Text>
            </View>
            <View style={insightStyles.text}>
                <Text style={insightStyles.title}>{title}</Text>
                <Text style={insightStyles.sub}>{sub}</Text>
            </View>
        </View>
    );
}

const insightStyles = StyleSheet.create({
    card: { flexDirection: "row", alignItems: "flex-start", gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    icon: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", flexShrink: 0 },
    emoji: { fontSize: 22 },
    text: { flex: 1 },
    title: { color: COLORS.text, fontSize: 14, fontWeight: "700", lineHeight: 20, marginBottom: 3 },
    sub: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18 },
});

// ── Main ───────────────────────────────────────────────────────────────────
export default function StatsScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { isAuthenticated } = useAuthStore();

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ["userStats"],
        queryFn: getUserStats,
        enabled: isAuthenticated,
        staleTime: 1000 * 60 * 2,
    });

    if (!isAuthenticated) {
        return (
            <View style={styles.center}>
                <Text style={{ fontSize: 48 }}>🔒</Text>
                <Text style={styles.lockTitle}>Đăng nhập để xem</Text>
                <Text style={styles.muted}>Thống kê cá nhân yêu cầu tài khoản</Text>
            </View>
        );
    }

    if (isLoading) {
        return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
    }

    if (error || !data) {
        return (
            <View style={styles.center}>
                <Text style={{ fontSize: 48 }}>😕</Text>
                <Text style={styles.muted}>Không thể tải thống kê</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
                    <Text style={styles.retryText}>Thử lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (data.totalScanned === 0) {
        return (
            <View style={styles.center}>
                <Text style={{ fontSize: 48 }}>📊</Text>
                <Text style={styles.lockTitle}>Chưa có dữ liệu</Text>
                <Text style={styles.muted}>Hãy quét sản phẩm đầu tiên!</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.navigate("Tabs")}>
                    <Text style={styles.retryText}>Quét ngay</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const safeP = data.greenPercent ?? Math.round((data.greenCount / data.totalScanned) * 100);
    const warnP = Math.round((data.yellowCount / data.totalScanned) * 100);
    const badP = data.redPercent ?? Math.round((data.redCount / data.totalScanned) * 100);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* ── Header — Frame 3 style ── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.backText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Thống kê thói quen</Text>
                <View style={{ width: 36 }} />
            </View>

            {/* ── Section: Tổng quan sản phẩm + period tag ── */}
            <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Tổng quan sản phẩm</Text>
                <View style={styles.periodTag}>
                    <Text style={styles.periodTagText}>↑ +{Math.max(safeP - 10, 0)}%</Text>
                </View>
                <Text style={styles.periodLabel}>Tháng này</Text>
            </View>

            {/* ── Donut Ring ── */}
            <View style={styles.ringCard}>
                <DonutRing total={data.totalScanned} safe={data.greenCount} caution={data.yellowCount} danger={data.redCount} />

                {/* 3 Stat Pills — Frame 3 */}
                <View style={styles.pillRow}>
                    <StatPill label={"An\ntoàn"} pct={safeP} color={COLORS.successText} bg={COLORS.successLight} />
                    <StatPill label={"Cần cân\nnhắc"} pct={warnP} color={COLORS.warningText} bg={COLORS.warningLight} />
                    <StatPill label={"Không\nphù hợp"} pct={badP} color={COLORS.dangerText} bg={COLORS.dangerLight} />
                </View>
            </View>

            {/* ── AI Insights section — Frame 3 ── */}
            <View style={styles.aiSection}>
                <Text style={styles.aiTitle}>✨ AI Insights</Text>
                <InsightCard
                    emoji="🍃"
                    bg={COLORS.successLight}
                    title="Bạn đang có xu hướng chọn sản phẩm nhiều đường"
                    sub={`Phát hiện ${data.yellowCount + data.redCount} sản phẩm trong tuần qua.`}
                />
                <InsightCard
                    emoji="💄"
                    bg={COLORS.primaryLight}
                    title="80% mỹ phẩm bạn dùng là Organic"
                    sub={`Rất tốt! Duy trì thói quen này nhé.`}
                />
                <InsightCard
                    emoji="🥩"
                    bg={COLORS.warningLight}
                    title="Bạn thường quét Đồ ăn vặt"
                    sub={`Chiếm ${badP}% tổng số lượt quét của bạn.`}
                />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { paddingBottom: 60 },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background, gap: 12, padding: 32 },
    lockTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700" },
    muted: { color: COLORS.textMuted, fontSize: 14, textAlign: "center" },
    retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    retryText: { color: COLORS.white, fontWeight: "600", fontSize: 14 },

    // Header — Frame 3: back arrow + centered title
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 52,
        paddingBottom: 16,
    },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, justifyContent: "center", alignItems: "center" },
    backText: { color: COLORS.text, fontSize: 22, fontWeight: "600" },
    headerTitle: { color: COLORS.text, fontSize: 17, fontWeight: "700" },

    // Section row
    sectionRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginBottom: 16, gap: 8 },
    sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: "700", flex: 1 },
    periodTag: { backgroundColor: COLORS.successLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    periodTagText: { color: COLORS.successText, fontSize: 12, fontWeight: "700" },
    periodLabel: { color: COLORS.textMuted, fontSize: 12 },

    // Ring card — white bg, subtle shadow
    ringCard: {
        backgroundColor: COLORS.white,
        marginHorizontal: 16,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 20,
        alignItems: "center",
    },

    // 3 Stat pills row
    pillRow: { flexDirection: "row", gap: 8, width: "100%" },

    // AI Section
    aiSection: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    aiTitle: { color: COLORS.text, fontSize: 17, fontWeight: "800", marginBottom: 8 },
});
