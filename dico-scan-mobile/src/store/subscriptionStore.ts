// src/store/subscriptionStore.ts

import { create } from "zustand";
import { getSubscriptionStatus, rewardToken } from "../api/subscription";

interface SubscriptionState {
    tier: 'FREE' | 'PREMIUM' | 'PREMIUM_GOLD';
    tokens: number;
    premiumExpiryDate: string | null;
    isLoading: boolean;
    error: string | null;

    fetchStatus: () => Promise<void>;
    earnToken: () => Promise<void>;
    consumeTokenOptimistically: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
    tier: 'FREE',
    tokens: 0,
    premiumExpiryDate: null,
    isLoading: false,
    error: null,

    fetchStatus: async () => {
        set({ isLoading: true, error: null });
        try {
            const data = await getSubscriptionStatus();
            set({ 
                tier: data.tier, 
                tokens: data.availableTokens, 
                premiumExpiryDate: data.premiumExpiryDate,
                isLoading: false 
            });
        } catch (err: any) {
            set({ error: err.message || "Failed to fetch subscription status", isLoading: false });
        }
    },

    earnToken: async () => {
        // Typically triggered after a rewarded Ad finishes successfully
        set({ isLoading: true, error: null });
        try {
            const data = await rewardToken();
            set({ tokens: data.availableTokens, isLoading: false });
        } catch (err: any) {
            set({ error: err.message || "Failed to claim token", isLoading: false });
            throw err;
        }
    },

    consumeTokenOptimistically: () => {
        // Used when scanning with { useToken: true } to prevent UI lag.
        // Server will validate and throw 402 if there are issues.
        set((state) => ({
            tokens: Math.max(0, state.tokens - 1)
        }));
    }
}));
