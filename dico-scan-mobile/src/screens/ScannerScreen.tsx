// src/screens/ScannerScreen.tsx
// Màn hình quét QR / Barcode chính

import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Alert } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { COLORS } from "@/constants/colors";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function ScannerScreen() {
    const navigation = useNavigation<NavProp>();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const isFocused = useIsFocused(); // Chỉ bật camera khi màn hình đang active

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

        // Chuyển hướng sang màn hình Kết quả với payload là barcode
        navigation.navigate("Result", { barcode: data });

        // Reset state quét sau 2 giây để có thể quét lại nếu quay về
        setTimeout(() => setScanned(false), 2000);
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
    
    scanFrame: { width: 250, height: 250, backgroundColor: "transparent", position: "relative" },
    corner: { position: "absolute", width: 40, height: 40, borderColor: COLORS.primary, borderWidth: 4 },
    cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 20 },
    cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 20 },
    cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 20 },
    cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 20 },
});
