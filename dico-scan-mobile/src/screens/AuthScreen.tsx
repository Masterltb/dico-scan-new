// src/screens/AuthScreen.tsx
// Splash + Login/Register — Light Mode theo Frame Figma 1 & 2
// Splash: gradient tím-hồng lavender, icon glassmorphism giữa màn hình

import React, { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { COLORS } from "@/constants/colors";
import { useAuthStore } from "@/store/authStore";
import { login as apiLogin, register as apiRegister } from "@/api/auth";

type Tab = "login" | "register";

export default function AuthScreen() {
    const [tab, setTab] = useState<Tab>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const setFromResponse = useAuthStore((s) => s.setFromResponse);

    const handleSubmit = async () => {
        setError(null);
        if (!email.trim()) { setError("Vui lòng nhập email"); return; }
        if (!password.trim()) { setError("Vui lòng nhập mật khẩu"); return; }
        if (password.length < 6) { setError("Mật khẩu phải từ 6 ký tự"); return; }

        setLoading(true);
        try {
            if (tab === "login") {
                const res = await apiLogin(email.trim(), password);
                setFromResponse(res);
            } else {
                const res = await apiRegister(email.trim(), password, displayName.trim() || undefined);
                setFromResponse(res);
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
            setError(axiosErr.response?.data?.message ?? axiosErr.message ?? "Đã xảy ra lỗi. Thử lại.");
        } finally {
            setLoading(false);
        }
    };

    const switchTab = (newTab: Tab) => { setTab(newTab); setError(null); };

    return (
        <View style={styles.root}>
            {/* === SPLASH HERO — Gradient lavender background === */}
            <View style={styles.splashSection}>
                {/* Glassmorphism icon card */}
                <View style={styles.iconCard}>
                    <Text style={styles.iconText}>⬛</Text>
                    {/* Barcode scan icon visual */}
                    <View style={styles.barcodeIcon}>
                        <View style={styles.barcodeCornerTL} />
                        <View style={styles.barcodeCornerTR} />
                        <View style={styles.barcodeCornerBL} />
                        <View style={styles.barcodeCornerBR} />
                        {/* Bars */}
                        {[0,1,2,3,4].map(i => (
                            <View key={i} style={[styles.barcodeLine, { left: 12 + i * 9 }]} />
                        ))}
                    </View>
                </View>
                <Text style={styles.splashTitle}>DICO SCAN</Text>
                <Text style={styles.splashTagline}>Quét mã vạch, chọn chuẩn riêng bạn</Text>
            </View>

            {/* === LOGIN FORM CARD (bottom sheet style) === */}
            <KeyboardAvoidingView
                style={styles.formSheet}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <ScrollView
                    contentContainerStyle={styles.formContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Tab Toggle */}
                    <View style={styles.tabPill}>
                        <TouchableOpacity
                            style={[styles.tab, tab === "login" && styles.tabActive]}
                            onPress={() => switchTab("login")}
                        >
                            <Text style={[styles.tabText, tab === "login" && styles.tabTextActive]}>
                                Đăng nhập
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, tab === "register" && styles.tabActive]}
                            onPress={() => switchTab("register")}
                        >
                            <Text style={[styles.tabText, tab === "register" && styles.tabTextActive]}>
                                Đăng ký
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Form fields */}
                    {tab === "register" && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Tên hiển thị</Text>
                            <TextInput
                                style={styles.input}
                                value={displayName}
                                onChangeText={setDisplayName}
                                placeholder="Ví dụ: Nguyễn Văn A"
                                placeholderTextColor={COLORS.textMuted}
                                autoCapitalize="words"
                                maxLength={100}
                            />
                        </View>
                    )}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="email@example.com"
                            placeholderTextColor={COLORS.textMuted}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Mật khẩu</Text>
                        <TextInput
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Tối thiểu 6 ký tự"
                            placeholderTextColor={COLORS.textMuted}
                            secureTextEntry
                        />
                    </View>

                    {error && (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>⚠️ {error}</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={COLORS.white} />
                        ) : (
                            <Text style={styles.submitBtnText}>
                                {tab === "login" ? "Đăng nhập" : "Tạo tài khoản"}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <Text style={styles.switchHint}>
                        {tab === "login" ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
                        <Text
                            style={styles.switchLink}
                            onPress={() => switchTab(tab === "login" ? "register" : "login")}
                        >
                            {tab === "login" ? "Đăng ký ngay" : "Đăng nhập"}
                        </Text>
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.splashTop },

    // === Splash hero ===
    splashSection: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingBottom: 40,
        // Gradient simulation (tím → hồng lavender)
        backgroundColor: "#B8B9F8",
    },
    iconCard: {
        width: 100,
        height: 100,
        borderRadius: 28,
        backgroundColor: "rgba(255,255,255,0.35)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 28,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.6)",
        // Glassmorphism
        shadowColor: "#6B7FE8",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 8,
        position: "relative",
    },
    iconText: { opacity: 0 }, // hidden, use barcodeIcon
    barcodeIcon: {
        position: "absolute",
        width: 60,
        height: 60,
        justifyContent: "center",
        alignItems: "center",
    },
    barcodeCornerTL: { position: "absolute", top: 0, left: 0, width: 14, height: 14, borderTopWidth: 3, borderLeftWidth: 3, borderColor: "#fff" },
    barcodeCornerTR: { position: "absolute", top: 0, right: 0, width: 14, height: 14, borderTopWidth: 3, borderRightWidth: 3, borderColor: "#fff" },
    barcodeCornerBL: { position: "absolute", bottom: 0, left: 0, width: 14, height: 14, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: "#fff" },
    barcodeCornerBR: { position: "absolute", bottom: 0, right: 0, width: 14, height: 14, borderBottomWidth: 3, borderRightWidth: 3, borderColor: "#fff" },
    barcodeLine: {
        position: "absolute",
        width: 3,
        height: 28,
        backgroundColor: "#fff",
        borderRadius: 1,
        top: 16,
    },
    splashTitle: {
        color: "#FFFFFF",
        fontSize: 32,
        fontWeight: "800",
        letterSpacing: 4,
        marginBottom: 10,
        textShadowColor: "rgba(0,0,0,0.15)",
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    splashTagline: {
        color: "rgba(255,255,255,0.85)",
        fontSize: 15,
        letterSpacing: 0.3,
    },

    // === Form sheet (white card at bottom) ===
    formSheet: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 10,
    },
    formContent: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 40,
        gap: 14,
    },

    // Pill tab
    tabPill: {
        flexDirection: "row",
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        padding: 4,
        marginBottom: 6,
    },
    tab: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: "center" },
    tabActive: { backgroundColor: COLORS.primary },
    tabText: { color: COLORS.textMuted, fontSize: 15, fontWeight: "600" },
    tabTextActive: { color: COLORS.white },

    // Inputs
    inputGroup: { gap: 6 },
    label: { color: COLORS.textSecondary, fontSize: 13, fontWeight: "600" },
    input: {
        backgroundColor: COLORS.surface,
        color: COLORS.text,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    errorBox: {
        backgroundColor: COLORS.dangerLight,
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: COLORS.danger,
    },
    errorText: { color: COLORS.dangerText, fontSize: 13 },
    submitBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: "center",
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    submitBtnDisabled: { opacity: 0.6 },
    submitBtnText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
    switchHint: { color: COLORS.textMuted, textAlign: "center", fontSize: 14 },
    switchLink: { color: COLORS.primary, fontWeight: "600" },
});
