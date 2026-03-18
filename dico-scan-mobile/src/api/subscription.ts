// src/api/subscription.ts

import { apiClient } from "./client";
import { UserSubscriptionStatusResponse, TokenRewardResponse } from "./types";

/**
 * Lấy trạng thái gói cước (FREE/PREMIUM/PREMIUM_GOLD) và số điểm (Xu) hiện tại.
 */
export const getSubscriptionStatus = async (): Promise<UserSubscriptionStatusResponse> => {
    const { data } = await apiClient.get<UserSubscriptionStatusResponse>("/v1/users/me/subscription");
    return data;
};

/**
 * Tặng 1 xu sau khi người dùng xem xong Rewarded Ad.
 */
export const rewardToken = async (): Promise<TokenRewardResponse> => {
    const { data } = await apiClient.post<TokenRewardResponse>("/v1/users/me/tokens/reward");
    return data;
};
