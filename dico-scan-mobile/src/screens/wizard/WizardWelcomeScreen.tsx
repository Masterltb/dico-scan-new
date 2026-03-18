// src/screens/wizard/WizardWelcomeScreen.tsx
// Wizard Welcome — Light Mode theo Frame Figma 5
// Step indicator 1/4 ở đầu, hero centered text, bottom CTA button to tím

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { COLORS } from "@/constants/colors";
import { useSafetyProfileStore } from "@/store/safetyProfileStore";
import { WizardStackParamList } from "@/navigation/RootNavigator";

type Props = NativeStackScreenProps<WizardStackParamList, "WizardWelcome">;

const TOTAL_STEPS = 4;

export default function WizardWelcomeScreen({ navigation }: Props) {
    const reset = useSafetyProfileStore((s) => s.reset);

    const handleStart = () => {
        reset();
        navigation.navigate("WizardTargets");
    };

    return (
        <View style={styles.container}>
            {/* ── Top row: Back + Step indicator ── */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.getParent()?.goBack()}>
                    <Text style={styles.backText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.stepLabel}>BƯỚC 1/{TOTAL_STEPS}</Text>
            </View>

            {/* ── Step dots indicator — Frame 5 ── */}
            <View style={styles.dotsRow}>
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.dot,
                            i === 0 ? styles.dotActive : styles.dotInactive,
                        ]}
                    />
                ))}
            </View>

            {/* ── Hero section: centered text — Frame 5 ── */}
            <View style={styles.hero}>
                <Text style={styles.heroTitle}>Bảo vệ bạn{"\n"}và gia đình</Text>
                <Text style={styles.heroSub}>
                    Hãy để DICO SCAN hiểu rõ nhu cầu của bạn. AI của chúng tôi sẽ phân tích mọi thành phần dựa trên hồ sơ sức khỏe riêng biệt của bạn.
                </Text>
            </View>

            {/* ── Spacer ── */}
            <View style={{ flex: 1 }} />

            {/* ── Footer CTA ── */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.9}>
                    <Text style={styles.startBtnText}>Bắt đầu thiết lập →</Text>
                </TouchableOpacity>
                <Text style={styles.hint}>⏱ Chỉ mất khoảng 2 phút</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.white, paddingHorizontal: 24, paddingBottom: 32 },

    // Top bar — back arrow + step label
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 52,
        marginBottom: 20,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.surface,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    backText: { color: COLORS.text, fontSize: 22, fontWeight: "600" },
    stepLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 1 },

    // Step dots — Frame 5: 4 small dots, first active (full primary)
    dotsRow: { flexDirection: "row", gap: 6, marginBottom: 48 },
    dot: { height: 4, borderRadius: 2 },
    dotActive: { flex: 2, backgroundColor: COLORS.primary },
    dotInactive: { flex: 1, backgroundColor: COLORS.border },

    // Hero — Frame 5: large bold title + sub
    hero: { gap: 18 },
    heroTitle: {
        color: COLORS.text,
        fontSize: 34,
        fontWeight: "800",
        lineHeight: 42,
    },
    heroSub: {
        color: COLORS.textMuted,
        fontSize: 15,
        lineHeight: 24,
    },

    // Footer
    footer: { gap: 12, alignItems: "center" },
    startBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 17,
        borderRadius: 14,
        width: "100%",
        alignItems: "center",
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 5,
    },
    startBtnText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
    hint: { color: COLORS.textMuted, fontSize: 13 },
});
