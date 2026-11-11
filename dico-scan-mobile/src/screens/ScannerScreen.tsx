// src/screens/ScannerScreen.tsx
// Màn hình quét QR / Barcode chính

import React, { useState, useRef } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Alert } from "react-native";
import { CameraView, useCameraPermissions, scanFromURLAsync } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { COLORS } from "@/constants/colors";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { useInterstitialAd } from "@/hooks/useInterstitialAd";
import { MOCK_BARCODES } from "@/api/mockData";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

// ── Demo scenarios — 6 kịch bản mô phỏng dị ứng thực tế ─────────────────
const DEMO_SCENARIOS = [
    {
        barcode: MOCK_BARCODES.MILK_SAFE,
        icon: "🥛", label: "Sữa tươi", sublabel: "✅ An toàn", color: COLORS.success,
    },
    {
        barcode: MOCK_BARCODES.MILK_ALLERGY,
        icon: "🥛", label: "Sữa đặc", sublabel: "🚨 Dị ứng sữa", color: COLORS.danger,
    },
    {
        barcode: MOCK_BARCODES.SNACK_PEANUT,
        icon: "🍟", label: "Bánh snack", sublabel: "🚨 Đậu phộng", color: COLORS.danger,
    },
    {
        barcode: MOCK_BARCODES.COSMETIC_PARABEN,
        icon: "🧴", label: "Kem dưỡng", sublabel: "⚠️ Paraben", color: COLORS.warning,
    },
    {
        barcode: MOCK_BARCODES.BABY_FOOD,
        icon: "🍼", label: "Bột ăn dặm", sublabel: "⚠️ Lưu ý tuổi", color: COLORS.warning,
    },
    {
        barcode: MOCK_BARCODES.HALAL_VEGAN,
        icon: "🍏", label: "Nước ép", sublabel: "✅ Halal Vegan", color: COLORS.success,
    },
] as const;

export default function ScannerScreen() {
    const navigation = useNavigation<NavProp>();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const isFocused = useIsFocused();

    const { tier } = useSubscriptionStore();
    const scanCountRef = useRef(0);
    const INTERSTITIAL_EVERY_N_SCANS = 3;
    const { showIfReady } = useInterstitialAd();

    if (!permission) {
        return <View style={styles.container} />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>DICO Scan cần quyền truy cập camera để quét sản phẩm.</Text>
                <TouchableOpacity style={styles.btn} onPress={requestPermission}>
                    <Text style={styles.btnText}>Cấp quyền Camera</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
        if (scanned) return;
        setScanned(true);

        if (tier === "FREE") {
            scanCountRef.current += 1;
            if (scanCountRef.current % INTERSTITIAL_EVERY_N_SCANS === 0) {
                setTimeout(() => showIfReady(), 600);
            }
        }

        navigation.navigate("Result", { barcode: data });
        setTimeout(() => setScanned(false), 2000);
    };

    const pickImageAndScan = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                allowsEditing: false,
                quality: 1,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const image = result.assets[0];
                if (!image) return;
                const uri = image.uri;
                if (scanned) return;
                const scannedResults = await scanFromURLAsync(uri, ["ean13", "ean8", "qr", "upc_a", "upc_e"]);
                if (scannedResults && scannedResults.length > 0) {
                    const firstResult = scannedResults[0];
                    if (firstResult) handleBarcodeScanned({ type: firstResult.type, data: firstResult.data });
                } else {
                    Alert.alert("Lỗi", "Không tìm thấy mã vạch trong hình ảnh này. Hãy đảm bảo ảnh chụp rõ nét.");
                }
            }
        } catch (error) {
            console.error("Gallery scan error:", error);
            Alert.alert("Lỗi", "Không thể phân tích mã vạch từ hình ảnh này.");
        }
    };

    return (
        <View style={styles.container}>
            {isFocused && (
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    facing="back"
                    onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ["ean13", "ean8", "qr", "upc_a", "upc_e"],
                    }}
                >
                    <View style={styles.overlay}>
                        {/* Close */}
                        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>

                        <Text style={styles.hintText}>Đưa mã vạch vào vùng camera</Text>

                        {/* Scan Frame */}
                        <View style={styles.scanFrame}>
                            <View style={[styles.corner, styles.cornerTL]} />
                            <View style={[styles.corner, styles.cornerTR]} />
                            <View style={[styles.corner, styles.cornerBL]} />
                            <View style={[styles.corner, styles.cornerBR]} />
                        </View>

                        {/* Gallery upload */}
                        <TouchableOpacity style={styles.galleryBtn} onPress={pickImageAndScan}>
                            <Text style={styles.galleryIcon}>🖼️</Text>
                            <Text style={styles.galleryText}>Tải ảnh lên</Text>
                        </TouchableOpacity>

                        {/* ── Demo Panel ──────────────────────────────── */}
                        <View style={styles.demoPanel}>
                            <View style={styles.demoPanelHeaderRow}>
                                <View style={styles.demoDivider} />
                                <Text style={styles.demoPanelTitle}>DEMO — GIẢ LẬP QUÉT</Text>
                                <View style={styles.demoDivider} />
                            </View>
                            <Text style={styles.demoPanelSub}>
                                Mô phỏng cảnh báo dị ứng theo hồ sơ gia đình
                            </Text>

                            {/* Row 1 */}
                            <View style={styles.demoRow}>
                                {DEMO_SCENARIOS.slice(0, 3).map((s) => (
                                    <TouchableOpacity
                                        key={s.barcode}
                                        style={[styles.demoCard, { borderColor: s.color + "AA" }]}
                                        onPress={() => handleBarcodeScanned({ type: "mock", data: s.barcode })}
                                        activeOpacity={0.75}
                                    >
                                        <Text style={styles.demoCardIcon}>{s.icon}</Text>
                                        <Text style={styles.demoCardLabel}>{s.label}</Text>
                                        <Text style={[styles.demoCardSub, { color: s.color }]}>{s.sublabel}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Row 2 */}
                            <View style={styles.demoRow}>
                                {DEMO_SCENARIOS.slice(3, 6).map((s) => (
                                    <TouchableOpacity
                                        key={s.barcode}
                                        style={[styles.demoCard, { borderColor: s.color + "AA" }]}
                                        onPress={() => handleBarcodeScanned({ type: "mock", data: s.barcode })}
                                        activeOpacity={0.75}
                                    >
                                        <Text style={styles.demoCardIcon}>{s.icon}</Text>
                                        <Text style={styles.demoCardLabel}>{s.label}</Text>
                                        <Text style={[styles.demoCardSub, { color: s.color }]}>{s.sublabel}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                </CameraView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },
    centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: COLORS.background },
    errorText: { color: COLORS.text, fontSize: 16, textAlign: "center", marginBottom: 20 },
    btn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
    btnText: { color: COLORS.white, fontSize: 15, fontWeight: "600" },

    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
    closeBtn: { position: "absolute", top: 50, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
    closeText: { color: "white", fontSize: 18, fontWeight: "bold" },

    hintText: { color: "white", fontSize: 16, marginBottom: 32, fontWeight: "600", backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },

    scanFrame: { width: 240, height: 240, backgroundColor: "transparent", position: "relative", marginBottom: 28 },
    corner: { position: "absolute", width: 36, height: 36, borderColor: COLORS.primary, borderWidth: 4 },
    cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 16 },
    cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 16 },
    cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 16 },
    cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 16 },

    galleryBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, gap: 8, marginBottom: 20 },
    galleryIcon: { fontSize: 20 },
    galleryText: { color: "white", fontSize: 15, fontWeight: "600" },

    // ── Demo Panel ──────────────────────────────────────────────────────
    demoPanel: {
        width: "94%",
        backgroundColor: "rgba(10,10,20,0.85)",
        borderRadius: 20,
        padding: 14,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
    },
    demoPanelHeaderRow: {
        flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4,
    },
    demoDivider: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.2)" },
    demoPanelTitle: {
        color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "800",
        letterSpacing: 1.5, textAlign: "center",
    },
    demoPanelSub: {
        color: "rgba(255,255,255,0.45)", fontSize: 11,
        textAlign: "center", marginBottom: 12,
    },

    demoRow: { flexDirection: "row", gap: 8, marginBottom: 8 },

    demoCard: {
        flex: 1, alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.07)",
        borderWidth: 1.5, borderRadius: 14,
        paddingVertical: 10, paddingHorizontal: 4,
    },
    demoCardIcon: { fontSize: 22, marginBottom: 4 },
    demoCardLabel: { color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: "700", textAlign: "center" },
    demoCardSub: { fontSize: 10, fontWeight: "600", textAlign: "center", marginTop: 2 },
});
