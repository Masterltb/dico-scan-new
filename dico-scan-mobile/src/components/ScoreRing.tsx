// src/components/ScoreRing.tsx
// Score Ring fallback thuần React Native — không cần react-native-svg
// Dùng View tròn + overlay border để mô phỏng ring

import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface Props {
    score: number;       // 0–100
    size?: number;
    strokeWidth?: number;
    color?: string;
    label?: string;
}

export function ScoreRing({ score, size = 120, strokeWidth = 10, color = "#22C55E", label }: Props) {
    const clampedScore = Math.max(0, Math.min(100, score));

    const getFontSize = () => {
        if (size >= 120) return 30;
        if (size >= 80) return 22;
        return 16;
    };

    return (
        <View style={[styles.wrapper, { width: size, height: size }]}>
            {/* Outer ring track */}
            <View
                style={[
                    styles.ring,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        borderWidth: strokeWidth,
                        borderColor: "rgba(255,255,255,0.08)",
                    },
                ]}
            />
            {/* Colored progress ring (full — we show score numerically in center) */}
            <View
                style={[
                    styles.ring,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        borderWidth: strokeWidth,
                        borderColor: color,
                        borderTopColor: clampedScore > 25 ? color : "transparent",
                        borderRightColor: clampedScore > 50 ? color : "transparent",
                        borderBottomColor: clampedScore > 75 ? color : "transparent",
                        borderLeftColor: clampedScore > 0 ? color : "transparent",
                        opacity: 0.9,
                    },
                ]}
            />
            {/* Center text */}
            <View style={[styles.center, { width: size - strokeWidth * 2, height: size - strokeWidth * 2 }]}>
                <Text style={[styles.scoreText, { fontSize: getFontSize(), color }]}>
                    {clampedScore}
                </Text>
                {label && <Text style={styles.labelText}>{label}</Text>}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
    },
    ring: {
        position: "absolute",
        top: 0,
        left: 0,
    },
    center: {
        alignItems: "center",
        justifyContent: "center",
    },
    scoreText: {
        fontWeight: "800",
        letterSpacing: -1,
    },
    labelText: {
        color: "#8B8CA7",
        fontSize: 10,
        fontWeight: "600",
        marginTop: 1,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
});
