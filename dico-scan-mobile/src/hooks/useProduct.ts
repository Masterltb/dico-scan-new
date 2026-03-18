// src/hooks/useProduct.ts
// TanStack Query wrapper for GET /v1/products/{barcode}
// Integrates offline cache: saves to AsyncStorage on success, reads on network failure.

import { useQuery } from "@tanstack/react-query";
import { getProduct } from "@/api/products";
import { queryKeys } from "@/constants/queryKeys";
import { usePreferencesStore } from "@/store/userPreferencesStore";
import { cacheProduct, getCachedProduct } from "@/utils/productCache";
import { ProductEvaluationResponse } from "@/api/types";

export const useProduct = (barcode: string, useToken?: boolean, profileId?: string) => {
    const allergies = usePreferencesStore((s) => s.allergies);

    return useQuery<ProductEvaluationResponse>({
        // Include useToken and profileId in queryKey to avoid cache collision
        queryKey: [...queryKeys.product(barcode), useToken, profileId],
        staleTime: 1000 * 60 * 5, // 5 minutes — aligns with backend 90-day cache TTL

        queryFn: async () => {
            try {
                // ── Network path ──────────────────────────────────────
                const product = await getProduct(barcode, allergies, useToken, profileId);
                
                // Cache result for offline use (non-blocking) - only cache default non-token queries
                if (!useToken && !profileId) {
                    cacheProduct(barcode, product).catch(() => { });
                }
                
                return product;
            } catch (error: unknown) {
                // ── Offline fallback ──────────────────────────────────
                // Only fallback for network errors, not 404 (product not found)
                const isNetworkError = !(
                    typeof error === "object" &&
                    error !== null &&
                    "errorCode" in error
                );

                if (isNetworkError) {
                    const cached = await getCachedProduct(barcode);
                    if (cached) {
                        // Return cached with a note that it might not be latest
                        return { ...cached, aiSummary: `[Offline] ${cached.aiSummary ?? ""}`.trim() };
                    }
                }

                // Re-throw if: no cache, or it's a real API error (404, etc.)
                throw error;
            }
        },

        retry: (failureCount, error: unknown) => {
            // Don't retry on 404 (product not in OFF)
            // Don't retry on 402 or 403 (Token/Premium required errors)
            if (typeof error === "object" && error !== null && "errorCode" in error) {
                const err = error as { errorCode: string };
                if (err.errorCode === "PRODUCT_NOT_FOUND") return false;
                if (err.errorCode === "NOT_ENOUGH_TOKENS") return false;
                if (err.errorCode === "PREMIUM_REQUIRED") return false;
            }
            return failureCount < 2;
        },
    });
};
