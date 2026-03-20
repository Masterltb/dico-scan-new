/**
 * src/hooks/useRewardedAd.ts
 *
 * Hook quản lý toàn bộ vòng đời của Rewarded Video Ad:
 * 1. Load ad khi hook mount.
 * 2. show() → hiển thị ad → user xem → trigger onRewarded.
 * 3. onRewarded → gọi API Backend để cộng 1 Token vào ví.
 *
 * GUARDRAIL: Token chỉ được cộng khi onRewarded callback từ AdMob SDK
 * được gọi thành công. KHÔNG tự cộng nếu user tắt giữa chừng.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
} from 'react-native-google-mobile-ads';
import { AD_UNITS } from '@/constants/adConfig';
import { useSubscriptionStore } from '@/store/subscriptionStore';

interface UseRewardedAdResult {
  /** true khi ad đã load xong và sẵn sàng hiển thị */
  isLoaded: boolean;
  /** true khi đang loading hoặc đang hiển thị */
  isLoading: boolean;
  /** Hiển thị rewarded ad. Throws nếu chưa load xong. */
  showAd: () => void;
  /** true ngay sau khi user đã xem xong và nhận thưởng thành công */
  didEarnReward: boolean;
}

export function useRewardedAd(): UseRewardedAdResult {
  const [rewardedAd, setRewardedAd] = useState<RewardedAd | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [didEarnReward, setDidEarnReward] = useState(false);
  const { earnToken } = useSubscriptionStore();

  // Helper: khởi tạo và load một ad mới
  const loadAd = useCallback(() => {
    setIsLoaded(false);
    setIsLoading(true);
    setDidEarnReward(false);

    const ad = RewardedAd.createForAdRequest(AD_UNITS.REWARDED, {
      requestNonPersonalizedAdsOnly: true,
      keywords: ['health', 'beauty', 'food', 'shopping'],
    });

    const unsubscribeLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setIsLoaded(true);
      setIsLoading(false);
    });

    const unsubscribeEarned = ad.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      async () => {
        // User đã xem xong → gọi Backend để cộng token thật
        try {
          await earnToken();
          setDidEarnReward(true);
        } catch {
          // earnToken throw nếu cooldown chưa hết — vẫn không crash app
        }
      }
    );

    const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      // Khi ad đóng → load lại để sẵn sàng cho lần tiếp theo
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
      loadAd();
    });

    const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, () => {
      setIsLoading(false);
      setIsLoaded(false);
    });

    ad.load();
    setRewardedAd(ad);

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, [earnToken]);

  // Load ad lần đầu khi hook mount
  useEffect(() => {
    const cleanup = loadAd();
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showAd = useCallback(() => {
    if (rewardedAd && isLoaded) {
      rewardedAd.show();
    }
  }, [rewardedAd, isLoaded]);

  return { isLoaded, isLoading, showAd, didEarnReward };
}
