// src/screens/wizard/WizardLayout.tsx
// Shared layout for all wizard steps: progress bar + title + content + nav buttons

import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "@/constants/colors";

interface Props {
    step: number;
    totalSteps: number;
    title: string;
    subtitle?: string;
    canNext: boolean;
    onNext: () => void;
    onBack?: () => void;
    nextLabel?: string;
    children: React.ReactNode;
}

export default function WizardLayout({
    step,
    totalSteps,
    title,
    subtitle,
    canNext,
    onNext,
    onBack,
    nextLabel = "Tiếp tục",
    children,
}: Props) {
    const progress = step / totalSteps;

    return (
        <View style={styles.container}>
            {/* Top Bar with Step label and Progress*/}
            <View style={styles.topBar}>
                {onBack && (
                     <TouchableOpacity style={styles.headerBackBtn} onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Text style={styles.headerBackIcon}>←</Text>
                     </TouchableOpacity>
                )}
                <View style={styles.progressWrapper}>
                    <Text style={styles.stepLabel}>Bước {step}/{totalSteps}</Text>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                    </View>
                </View>
            </View>

            {/* Header Text */}
            <View style={styles.headerTextContainer}>
                <Text style={styles.title}>{title}</Text>
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>

            {/* Content Area */}
            <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {children}
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={styles.navRow}>
                <TouchableOpacity
                    style={[styles.nextBtn, !canNext && styles.nextBtnDisabled]}
                    onPress={onNext}
                    disabled={!canNext}
                >
                    <Text style={styles.nextBtnText}>{nextLabel}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, gap: 16 },
    headerBackBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, justifyContent: "center", alignItems: "center" },
    headerBackIcon: { color: COLORS.text, fontSize: 18, fontWeight: "600" },
    progressWrapper: { flex: 1, gap: 6 },
    stepLabel: { color: COLORS.primary, fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
    progressTrack: { height: 6, backgroundColor: COLORS.surface, borderRadius: 3, overflow: "hidden" },
    progressFill: { height: "100%", backgroundColor: COLORS.primary, borderRadius: 3 },
    
    headerTextContainer: { paddingHorizontal: 20, marginBottom: 16 },
    title: { color: COLORS.text, fontSize: 26, fontWeight: "800", marginBottom: 8 },
    subtitle: { color: COLORS.textMuted, fontSize: 15, lineHeight: 22 },
    
    scrollArea: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
    
    navRow: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
    nextBtn: { padding: 18, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: "center", shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    nextBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
    nextBtnText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
});
