// src/screens/HomeScreen.tsx
// Home Dashboard — theo Figma Frame 2 (Light Mode)
// Layout: Header profile / greeting → Big Scan CTA Card → Recent history (ngang) → Gợi ý

import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";
import React, { useCallback, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { COLORS, RATING_COLORS } from "@/constants/colors";
import { queryKeys } from "@/constants/queryKeys";
import { getScanHistory } from "@/api/products";
import { getPreferences } from "@/api/users";
import { useAuthStore } from "@/store/authStore";
import { ScanHistoryItem } from "@/api/types";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { useFamilyProfileStore } from "@/store/familyProfileStore";

type HomeNavProp = NativeStackNavigationProp<RootStackParamList>;
interface Props { navigation: HomeNavProp; }

const SCAN_DEBOUNCE_MS = 2000;

const SCORE_COLOR = (color: string) => {
    if (color === "GREEN") return COLORS.success;
    if (color === "RED") return COLORS.danger;
    if (color === "YELLOW") return COLORS.warning;
    return COLORS.textMuted;
};

const SUGGESTIONS = [
    { icon: "💊", title: "Quét mỹ phẩm", desc: "Kiểm tra thành phần dị ứng", screen: "Result" as const },
    { icon: "🍎", title: "Quét thực phẩm", desc: "Phân tích dinh dưỡng & calo", screen: "Result" as const },
];

export default function HomeScreen({ navigation }: Props) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanning, setScanning] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [selectedProfileId, setSelectedProfileId] = useState<string | undefined>();
    const lastScanTime = useRef<number>(0);

    const { isAuthenticated, email, displayName } = useAuthStore();
    const { tier } = useSubscriptionStore();
    const { profiles } = useFamilyProfileStore();

    const { data: recentItems } = useQuery({
        queryKey: queryKeys.history(0),
        queryFn: () => getScanHistory(0, 8),
        enabled: isAuthenticated,
        staleTime: 1000 * 30,
    });

    const { data: preferences } = useQuery({
        queryKey: ["userPreferences"],
        queryFn: getPreferences,
        enabled: isAuthenticated,
        staleTime: 1000 * 60 * 5,
    });

    const handleBarcodeScanned = useCallback(
        (result: BarcodeScanningResult) => {
            const barcode = result.data;
            const now = Date.now();
            if (now - lastScanTime.current < SCAN_DEBOUNCE_MS) return;
            lastScanTime.current = now;
            setScanning(true);
            setShowScanner(false);
            navigation.navigate("Result", { barcode, profileId: selectedProfileId });
            setTimeout(() => setScanning(false), SCAN_DEBOUNCE_MS);
        },
        [navigation, selectedProfileId]
    );

    const handleScanPress = async () => {
        if (!permission?.granted) {
            const res = await requestPermission();
            if (!res.granted) {
                Alert.alert("Camera bị từ chối", "Hãy cho phép DICO Scan truy cập camera trong cài đặt.");
                return;
            }
        }
        navigation.navigate("Scanner" as never);
    };

    const displayNameFinal = displayName ?? email?.split("@")[0] ?? "Bạn";

    // === Permission not ready ===
    if (!permission) {
        return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

            {/* ── Header / Profile row ── */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.avatarWrap}>
                        <Text style={styles.avatarText}>
                            {displayNameFinal.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.profileLabel}>Hồ sơ cá nhân</Text>
                        <Text style={styles.profileName}>{displayNameFinal} ›</Text>
                    </View>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => navigation.navigate("Tabs", { screen: "Insights" } as never)}
                    >
                        <Text style={styles.iconBtnText}>📊</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn}>
                        <Text style={styles.iconBtnText}>🔔</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Greeting ── */}
            <View style={styles.greeting}>
                <Text style={styles.greetBold}>Chào bạn,</Text>
                <Text style={styles.greetSub}>hôm nay bạn muốn quét gì?</Text>
            </View>

            {/* ── Big Scan CTA Card ── */}
            <TouchableOpacity style={styles.scanCard} onPress={handleScanPress} activeOpacity={0.85}>
                {/* Gradient-like background using nested Views */}
                <View style={styles.scanCardBg} />
                <View style={styles.scanIconCircle}>
                    {/* Barcode scan icon */}
                    <View style={styles.scanIconInner}>
                        <View style={styles.scanCornerTL} />
                        <View style={styles.scanCornerTR} />
                        <View style={styles.scanCornerBL} />
                        <View style={styles.scanCornerBR} />
                        {[0,1,2,3,4].map(i => (
                            <View key={i} style={[styles.scanBar, { left: 10 + i * 7 }]} />
                        ))}
                    </View>
                </View>
                <Text style={styles.scanCardTitle}>Quét ngay</Text>
                <Text style={styles.scanCardSub}>Sản phẩm, QR Code, Tài liệu</Text>
            </TouchableOpacity>

            {/* ── Recent History ── */}
            {isAuthenticated && recentItems && recentItems.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Lịch sử gần đây</Text>
                        <TouchableOpacity onPress={() => navigation.navigate("Tabs", { screen: "History" } as never)}>
                            <Text style={styles.seeAll}>Xem tất cả ›</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyRow}>
                        {recentItems.map((item: ScanHistoryItem) => {
                            const scoreVal = item.snapshotColor === "GREEN" ? "An toàn" :
                                                     item.snapshotColor === "RED" ? "Nguy hiểm" :
                                                     item.snapshotColor === "YELLOW" ? "Cẩn thận" : "—";
                            const color = SCORE_COLOR(item.snapshotColor);
                            const label = RATING_COLORS[item.snapshotColor]?.label ?? "—";
                            return (
                                <TouchableOpacity
                                    key={item.scanId ?? item.barcode}
                                    style={styles.historyCard}
                                    onPress={() => navigation.navigate("Result", { barcode: item.barcode })}
                                    activeOpacity={0.8}
                                >
                                    {/* Score badge */}
                                    <View style={[styles.scoreBadge, { backgroundColor: color }]}>
                                        <Text style={styles.scoreBadgeText}>{scoreVal}</Text>
                                    </View>
                                    {/* Product image or placeholder */}
                                    {item.imageUrl ? (
                                        <Image source={{ uri: item.imageUrl }} style={styles.historyImg} />
                                    ) : (
                                        <View style={styles.historyImgPlaceholder}>
                                            <Text style={{ fontSize: 26 }}>📦</Text>
                                        </View>
                                    )}
                                    <Text style={styles.historyName} numberOfLines={2}>
                                        {item.name ?? item.barcode}
                                    </Text>
                                    <Text style={styles.historyTime}>
                                        {getRelativeTime(item.scannedAt)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* ── Gợi ý cho bạn ── */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Gợi ý cho bạn</Text>
                <View style={styles.suggestionList}>
                    {SUGGESTIONS.map((s, i) => (
                        <TouchableOpacity
                            key={i}
                            style={styles.suggestionRow}
                            onPress={handleScanPress}
                            activeOpacity={0.8}
                        >
                            <View style={styles.suggestionIcon}>
                                <Text style={{ fontSize: 22 }}>{s.icon}</Text>
                            </View>
                            <View style={styles.suggestionText}>
                                <Text style={styles.suggestionTitle}>{s.title}</Text>
                                <Text style={styles.suggestionDesc}>{s.desc}</Text>
                            </View>
                            <Text style={styles.suggestionArrow}>›</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

        </ScrollView>
    );
}

/** Relative time helper */
function getRelativeTime(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const days = Math.floor(ms / 86400000);
    if (days === 0) return "Hôm nay";
    if (days === 1) return "Hôm qua";
    return `${days} ngày trước`;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { paddingBottom: 32 },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background },

    // Header
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 8,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
    avatarWrap: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: COLORS.surface,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    avatarText: { color: COLORS.primary, fontSize: 18, fontWeight: "700" },
    profileLabel: { color: COLORS.textMuted, fontSize: 11 },
    profileName: { color: COLORS.text, fontSize: 15, fontWeight: "700" },
    headerRight: { flexDirection: "row", gap: 8 },
    iconBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: COLORS.surface,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    iconBtnText: { fontSize: 18 },

    // Greeting
    greeting: { paddingHorizontal: 20, paddingVertical: 16 },
    greetBold: { color: COLORS.text, fontSize: 26, fontWeight: "800", lineHeight: 32 },
    greetSub: { color: COLORS.text, fontSize: 26, fontWeight: "400", lineHeight: 32 },

    // Scan CTA card
    scanCard: {
        marginHorizontal: 20,
        marginBottom: 24,
        backgroundColor: COLORS.primary,
        borderRadius: 20,
        paddingVertical: 28,
        alignItems: "center",
        overflow: "hidden",
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    scanCardBg: {
        position: "absolute",
        top: -40,
        right: -40,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: "rgba(255,255,255,0.08)",
    },
    scanIconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 14,
    },
    scanIconInner: { width: 42, height: 42, position: "relative", justifyContent: "center", alignItems: "center" },
    scanCornerTL: { position: "absolute", top: 0, left: 0, width: 12, height: 12, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderColor: "#fff" },
    scanCornerTR: { position: "absolute", top: 0, right: 0, width: 12, height: 12, borderTopWidth: 2.5, borderRightWidth: 2.5, borderColor: "#fff" },
    scanCornerBL: { position: "absolute", bottom: 0, left: 0, width: 12, height: 12, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderColor: "#fff" },
    scanCornerBR: { position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderColor: "#fff" },
    scanBar: { position: "absolute", width: 2.5, height: 20, backgroundColor: "#fff", borderRadius: 1, top: 11 },
    scanCardTitle: { color: COLORS.white, fontSize: 20, fontWeight: "800", marginBottom: 4 },
    scanCardSub: { color: "rgba(255,255,255,0.8)", fontSize: 13 },

    // Sections
    section: { paddingHorizontal: 20, marginBottom: 24 },
    sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
    sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: "700" },
    seeAll: { color: COLORS.primary, fontSize: 13, fontWeight: "600" },

    // History horizontal scroll
    historyRow: { gap: 12, paddingRight: 4 },
    historyCard: {
        width: 120,
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        position: "relative",
    },
    scoreBadge: {
        position: "absolute",
        top: 8,
        left: 8,
        zIndex: 1,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    scoreBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
    historyImg: { width: "100%", height: 84, borderRadius: 10, resizeMode: "cover", marginBottom: 8 },
    historyImgPlaceholder: {
        width: "100%",
        height: 84,
        borderRadius: 10,
        backgroundColor: COLORS.surface,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
    },
    historyName: { color: COLORS.text, fontSize: 12, fontWeight: "600", lineHeight: 16, marginBottom: 4 },
    historyTime: { color: COLORS.textMuted, fontSize: 11 },

    // Suggestions
    suggestionList: { gap: 10 },
    suggestionRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.card,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 14,
    },
    suggestionIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: COLORS.primaryLight,
        justifyContent: "center",
        alignItems: "center",
    },
    suggestionText: { flex: 1 },
    suggestionTitle: { color: COLORS.text, fontSize: 15, fontWeight: "700", marginBottom: 2 },
    suggestionDesc: { color: COLORS.textMuted, fontSize: 12 },
    suggestionArrow: { color: COLORS.primary, fontSize: 22, fontWeight: "700" },
});
