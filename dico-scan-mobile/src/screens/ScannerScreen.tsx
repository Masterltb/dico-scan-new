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

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function ScannerScreen() {
    const navigation = useNavigation<NavProp>();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const isFocused = useIsFocused();

    // ── Interstitial: 1 lần mỗi 3 lần quét, chỉ với FREE users ─────────────
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

        // Interstitial logic: chỉ FREE, sau mỗi N lần quét
        if (tier === 'FREE') {
            scanCountRef.current += 1;
            if (scanCountRef.current % INTERSTITIAL_EVERY_N_SCANS === 0) {
                // Hiển thị sau khi navigate để không block UX
                setTimeout(() => showIfReady(), 600);
            }
        }

        navigation.navigate("Result", { barcode: data });
        setTimeout(() => setScanned(false), 2000);
    };

    const pickImageAndScan = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 1,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const uri = result.assets[0].uri;
                
                if (scanned) return;

                const scannedResults = await scanFromURLAsync(uri, ["ean13", "ean8", "qr", "upc_a", "upc_e"]);
                
                if (scannedResults && scannedResults.length > 0) {
                    const firstBarcode = scannedResults[0].data;
                    handleBarcodeScanned({ type: scannedResults[0].type, data: firstBarcode });
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
                        {/* Nút Đóng góc trái trên */}
                        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>

                        <Text style={styles.hintText}>Đưa mã vạch vào vùng camera</Text>

                        {/* Khung quét - Scan Frame */}
                        <View style={styles.scanFrame}>
                            <View style={[styles.corner, styles.cornerTL]} />
                            <View style={[styles.corner, styles.cornerTR]} />
                            <View style={[styles.corner, styles.cornerBL]} />
                            <View style={[styles.corner, styles.cornerBR]} />
                        </View>
                        
                        {/* Nút upload từ thư viện ảnh */}
                        <TouchableOpacity style={styles.galleryBtn} onPress={pickImageAndScan}>
                            <Text style={styles.galleryIcon}>🖼️</Text>
                            <Text style={styles.galleryText}>Tải ảnh lên</Text>
                        </TouchableOpacity>

                        {/* Nút giả lập (Demo) quét sản phẩm trên máy ảo */}
                        <Text style={{color: "rgba(255,255,255,0.7)", marginTop: 20, fontSize: 13, fontWeight: "600"}}>GIẢ LẬP NHANH (DEMO)</Text>
                        <View style={{flexDirection: "row", gap: 8, marginTop: 8}}>
                            <TouchableOpacity 
                                style={[styles.galleryBtn, { backgroundColor: COLORS.success, paddingHorizontal: 12 }]} 
                                onPress={() => handleBarcodeScanned({ type: "ean13", data: "1111111111111" })}
                            >
                                <Text style={styles.galleryText}>🟢 Sữa</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.galleryBtn, { backgroundColor: COLORS.warning, paddingHorizontal: 12 }]} 
                                onPress={() => handleBarcodeScanned({ type: "ean13", data: "3333333333333" })}
                            >
                                <Text style={styles.galleryText}>🟡 Mỹ phẩm</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.galleryBtn, { backgroundColor: COLORS.danger, paddingHorizontal: 12 }]} 
                                onPress={() => handleBarcodeScanned({ type: "ean13", data: "2222222222222" })}
                            >
                                <Text style={styles.galleryText}>🔴 Snack</Text>
                            </TouchableOpacity>
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

    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
    closeBtn: { position: "absolute", top: 50, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
    closeText: { color: "white", fontSize: 18, fontWeight: "bold" },
    
    hintText: { color: "white", fontSize: 16, marginBottom: 40, fontWeight: "600", backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    
    scanFrame: { width: 250, height: 250, backgroundColor: "transparent", position: "relative", marginBottom: 40 },
    corner: { position: "absolute", width: 40, height: 40, borderColor: COLORS.primary, borderWidth: 4 },
    cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 20 },
    cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 20 },
    cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 20 },
    cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 20 },
    
    galleryBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, gap: 8 },
    galleryIcon: { fontSize: 20 },
    galleryText: { color: "white", fontSize: 15, fontWeight: "600" },
});
