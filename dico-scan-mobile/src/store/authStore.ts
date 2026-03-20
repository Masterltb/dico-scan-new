// src/store/authStore.ts
// Zustand store: authentication state + AsyncStorage persistence.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import type { AuthResponse } from "@/api/auth";

const AUTH_KEY = "@dico_auth";

interface AuthState {
    token: string | null;
    userId: string | null;
    email: string | null;
    displayName: string | null;
    subscriptionTier: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    // Actions
    logout: () => Promise<void>;
    hydrate: () => Promise<void>;
    setFromResponse: (res: AuthResponse) => void;
    updateSubscriptionTier: (tier: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    token: null,
    userId: null,
    email: null,
    displayName: null,
    subscriptionTier: null,
    isAuthenticated: false,
    isLoading: true,

    setFromResponse: (res: AuthResponse) => {
        const authData = {
            token: res.token,
            userId: res.userId,
            email: res.email,
            displayName: res.displayName,
            subscriptionTier: res.subscriptionTier,
        };
        set({ ...authData, isAuthenticated: true, isLoading: false });

        // Persist to AsyncStorage
        AsyncStorage.setItem(AUTH_KEY, JSON.stringify(authData)).catch(console.error);
    },

    updateSubscriptionTier: (tier: string) => {
        set({ subscriptionTier: tier });
        const currentData = get();
        const authData = {
            token: currentData.token,
            userId: currentData.userId,
            email: currentData.email,
            displayName: currentData.displayName,
            subscriptionTier: tier,
        };
        AsyncStorage.setItem(AUTH_KEY, JSON.stringify(authData)).catch(console.error);
    },

    logout: async () => {
        set({
            token: null,
            userId: null,
            email: null,
            displayName: null,
            subscriptionTier: null,
            isAuthenticated: false,
            isLoading: false,
        });
        await AsyncStorage.removeItem(AUTH_KEY);
    },

    hydrate: async () => {
        try {
            const raw = await AsyncStorage.getItem(AUTH_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                set({
                    token: data.token,
                    userId: data.userId,
                    email: data.email,
                    displayName: data.displayName,
                    subscriptionTier: data.subscriptionTier,
                    isAuthenticated: true,
                    isLoading: false,
                });
            } else {
                set({ isLoading: false });
            }
        } catch {
            set({ isLoading: false });
        }
    },
}));
