// src/api/subscriptions.ts

import { apiClient } from "./client";

export type SubscriptionTier = "FREE" | "PREMIUM" | "PREMIUM_GOLD";

export interface UpgradeResponse {
    subscriptionTier: SubscriptionTier;
    message: string;
    upgraded: boolean;
}

export interface TierStatusResponse {
    subscriptionTier: SubscriptionTier;
    profileCompleted: boolean;
    userId: string;
}

/** GET /v1/subscriptions/status */
export const getTierStatus = async (): Promise<TierStatusResponse> => {
    const { data } = await apiClient.get<TierStatusResponse>("/v1/subscriptions/status");
    return data;
};

/** POST /v1/subscriptions/upgrade — Dev: instant upgrade, Prod: payment gateway */
export const upgradeToTier = async (tier: SubscriptionTier = "PREMIUM"): Promise<UpgradeResponse> => {
    const { data } = await apiClient.post<UpgradeResponse>(`/v1/subscriptions/upgrade?targetTier=${tier}`);
    return data;
};
