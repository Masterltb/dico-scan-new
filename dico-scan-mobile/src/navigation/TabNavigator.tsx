// src/navigation/TabNavigator.tsx
// Tab Bar — Light Mode theo Frame 2 Figma
// Màu: nền trắng, active = primary tím, center Scan button lớn tím nổi

import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "@/constants/colors";
import HomeScreen from "@/screens/HomeScreen";
import HistoryScreen from "@/screens/HistoryScreen";
import InsightsScreen from "@/screens/InsightsScreen";
import PreferencesScreen from "@/screens/PreferencesScreen";
import StatsScreen from "@/screens/StatsScreen";
import ScannerScreen from "@/screens/ScannerScreen";

const Tab = createBottomTabNavigator();

/** Custom center Scan tab button */
function ScanTabButton({ onPress }: { onPress?: () => void }) {
    return (
        <TouchableOpacity
            style={styles.scanBtnWrap}
            onPress={onPress}
            activeOpacity={0.85}
        >
            <View style={styles.scanBtn}>
                <View style={styles.scanIconInner}>
                    <View style={styles.scanCornerTL} />
                    <View style={styles.scanCornerTR} />
                    <View style={styles.scanCornerBL} />
                    <View style={styles.scanCornerBR} />
                    {[0, 1, 2].map(i => (
                        <View key={i} style={[styles.scanBar, { left: 6 + i * 7 }]} />
                    ))}
                </View>
            </View>
        </TouchableOpacity>
    );
}

export default function TabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarShowLabel: true,
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textMuted,
                tabBarLabel: ({ focused }) => {
                    const labels: Record<string, string> = {
                        Home: "Trang chủ",
                        History: "Lịch sử",
                        Scanner: "Scan",
                        Insights: "Yêu thích",
                        Profile: "Hồ sơ",
                    };
                    if (route.name === "Scanner") return null;
                    return (
                        <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                            {labels[route.name] ?? route.name}
                        </Text>
                    );
                },
                tabBarIcon: ({ focused }) => {
                    const icons: Record<string, string> = {
                        Home: "🏠",
                        History: "🕛",
                        Scanner: "",
                        Insights: "❤️",
                        Profile: "👤",
                    };
                    if (route.name === "Scanner") return null;
                    return (
                        <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>
                            {icons[route.name] ?? "●"}
                        </Text>
                    );
                },
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="History" component={HistoryScreen} />
            <Tab.Screen
                name="Scanner"
                component={ScannerScreen}
                options={{
                    tabBarStyle: { display: "none" },
                    tabBarButton: (props) => (
                        <ScanTabButton onPress={props.onPress ? () => props.onPress!({} as any) : undefined} />
                    ),
                }}
            />
            <Tab.Screen name="Insights" component={InsightsScreen} />
            <Tab.Screen name="Profile" component={PreferencesScreen} />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: COLORS.white,
        borderTopWidth: 0,
        height: Platform.OS === "ios" ? 80 : 64,
        paddingBottom: Platform.OS === "ios" ? 20 : 8,
        paddingTop: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 10,
    },
    tabIcon: { fontSize: 22, opacity: 0.5 },
    tabIconActive: { opacity: 1 },
    tabLabel: { fontSize: 11, fontWeight: "500", color: COLORS.textMuted, marginTop: 2 },
    tabLabelActive: { color: COLORS.primary, fontWeight: "700" },

    // Center Scan button
    scanBtnWrap: {
        flex: 1,
        alignItems: "center",
        justifyContent: "flex-start",
        marginTop: -20,
    },
    scanBtn: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
    },
    scanIconInner: { width: 36, height: 36, position: "relative", justifyContent: "center", alignItems: "center" },
    scanCornerTL: { position: "absolute", top: 0, left: 0, width: 10, height: 10, borderTopWidth: 2, borderLeftWidth: 2, borderColor: "#fff" },
    scanCornerTR: { position: "absolute", top: 0, right: 0, width: 10, height: 10, borderTopWidth: 2, borderRightWidth: 2, borderColor: "#fff" },
    scanCornerBL: { position: "absolute", bottom: 0, left: 0, width: 10, height: 10, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: "#fff" },
    scanCornerBR: { position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderBottomWidth: 2, borderRightWidth: 2, borderColor: "#fff" },
    scanBar: { position: "absolute", width: 2, height: 18, backgroundColor: "#fff", borderRadius: 1, top: 9 },
});
