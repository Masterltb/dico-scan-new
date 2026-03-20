// src/navigation/RootNavigator.tsx

import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TabNavigator from "./TabNavigator";
import ResultScreen from "@/screens/ResultScreen";
import ContributeScreen from "@/screens/ContributeScreen";
import AuthScreen from "@/screens/AuthScreen";
import UpgradeScreen from "@/screens/UpgradeScreen";
import CompareScreen from "@/screens/CompareScreen";
import FavoritesScreen from "@/screens/FavoritesScreen";
import FamilyProfilesScreen from "@/screens/FamilyProfilesScreen";
import FamilyProfileFormScreen from "@/screens/FamilyProfileFormScreen";
import WizardWelcomeScreen from "@/screens/wizard/WizardWelcomeScreen";
import WizardTargetsScreen from "@/screens/wizard/WizardTargetsScreen";
import WizardChildScreen from "@/screens/wizard/WizardChildScreen";
import WizardPregnancyScreen from "@/screens/wizard/WizardPregnancyScreen";
import WizardFoodAllergyScreen from "@/screens/wizard/WizardFoodAllergyScreen";
import WizardCosmeticScreen from "@/screens/wizard/WizardCosmeticScreen";
import WizardSkinTypeScreen from "@/screens/wizard/WizardSkinTypeScreen";
import WizardHealthScreen from "@/screens/wizard/WizardHealthScreen";
import WizardSeverityScreen from "@/screens/wizard/WizardSeverityScreen";
import WizardConfirmScreen from "@/screens/wizard/WizardConfirmScreen";
import { COLORS } from "@/constants/colors";
import { useAuthStore } from "@/store/authStore";
import { usePreferencesStore } from "@/store/userPreferencesStore";

export type WizardStackParamList = {
    WizardWelcome: undefined;
    WizardTargets: undefined;
    WizardChild: undefined;
    WizardPregnancy: undefined;
    WizardFoodAllergy: undefined;
    WizardCosmetic: undefined;
    WizardSkinType: undefined;
    WizardHealth: undefined;
    WizardSeverity: undefined;
    WizardConfirm: undefined;
};

export type RootStackParamList = {
    Auth: undefined;
    Tabs: undefined;
    Result: { barcode: string; useToken?: boolean; profileId?: string };
    Contribute: { barcode: string };
    SafetyWizard: undefined;
    Upgrade: undefined;
    Compare: { barcode1?: string };
    Favorites: undefined;
    FamilyProfiles: undefined;
    FamilyProfileForm: { editingProfile?: import("@/api/types").FamilyProfileResponse } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const WizardStack = createNativeStackNavigator<WizardStackParamList>();

function SafetyWizardNavigator() {
    return (
        <WizardStack.Navigator
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: COLORS.background },
                animation: "slide_from_right",
            }}
        >
            <WizardStack.Screen name="WizardWelcome" component={WizardWelcomeScreen} />
            <WizardStack.Screen name="WizardTargets" component={WizardTargetsScreen} />
            <WizardStack.Screen name="WizardChild" component={WizardChildScreen} />
            <WizardStack.Screen name="WizardPregnancy" component={WizardPregnancyScreen} />
            <WizardStack.Screen name="WizardFoodAllergy" component={WizardFoodAllergyScreen} />
            <WizardStack.Screen name="WizardCosmetic" component={WizardCosmeticScreen} />
            <WizardStack.Screen name="WizardSkinType" component={WizardSkinTypeScreen} />
            <WizardStack.Screen name="WizardHealth" component={WizardHealthScreen} />
            <WizardStack.Screen name="WizardSeverity" component={WizardSeverityScreen} />
            <WizardStack.Screen name="WizardConfirm" component={WizardConfirmScreen} />
        </WizardStack.Navigator>
    );
}

export function RootNavigator() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const isLoading = useAuthStore((s) => s.isLoading);
    const hydrateAuth = useAuthStore((s) => s.hydrate);
    const hydratePrefs = usePreferencesStore((s) => s.hydrate);

    useEffect(() => {
        hydrateAuth();
        hydratePrefs();
    }, [hydrateAuth, hydratePrefs]);

    // Show splash/loading while hydrating auth state
    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: COLORS.background },
                }}
            >
                {!isAuthenticated ? (
                    // Auth screen — no back gesture
                    <Stack.Screen
                        name="Auth"
                        component={AuthScreen}
                        options={{ gestureEnabled: false }}
                    />
                ) : (
                    // Main app flow
                    <>
                        <Stack.Screen name="Tabs" component={TabNavigator} />
                        <Stack.Screen
                            name="Result"
                            component={ResultScreen}
                            options={{ presentation: "modal", animation: "slide_from_bottom" }}
                        />
                        <Stack.Screen
                            name="Contribute"
                            component={ContributeScreen}
                            options={{ presentation: "modal", animation: "slide_from_bottom" }}
                        />
                        <Stack.Screen
                            name="SafetyWizard"
                            component={SafetyWizardNavigator}
                            options={{ presentation: "modal", animation: "slide_from_bottom" }}
                        />
                        <Stack.Screen
                            name="Upgrade"
                            component={UpgradeScreen}
                            options={{ presentation: "modal", animation: "slide_from_bottom" }}
                        />
                        <Stack.Screen
                            name="Compare"
                            component={CompareScreen}
                            options={{ presentation: "modal", animation: "slide_from_bottom" }}
                        />
                        <Stack.Screen
                            name="Favorites"
                            component={FavoritesScreen}
                            options={{ presentation: "modal", animation: "slide_from_bottom" }}
                        />
                        <Stack.Screen
                            name="FamilyProfiles"
                            component={FamilyProfilesScreen}
                            options={{ presentation: "modal", animation: "slide_from_bottom" }}
                        />
                        <Stack.Screen
                            name="FamilyProfileForm"
                            component={FamilyProfileFormScreen}
                            options={{ animation: "slide_from_right" }}
                        />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
