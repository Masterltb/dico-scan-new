/**
 * src/hooks/useInterstitialAd.ts
 *
 * Hook quản lý Interstitial Ads (toàn màn hình):
 * - Tự động load khi mount.
 * - Caller gọi showIfReady() — ad chỉ hiển thị nếu đã load xong.
 * - Sau khi đóng, tự động load lại.
 *
 * GUARDRAIL: Interstitial chỉ được trigger TỐI ĐA 1 lần / phiên app.
 * Logic đếm scan count phải nằm ở component gọi hook này (ScannerScreen).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  InterstitialAd,
  AdEventType,
} from 'react-native-google-mobile-ads';
import { AD_UNITS } from '@/constants/adConfig';

interface UseInterstitialAdResult {
  isLoaded: boolean;
  showIfReady: () => void;
}

export function useInterstitialAd(): UseInterstitialAdResult {
  const [ad, setAd] = useState<InterstitialAd | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadAd = useCallback(() => {
    setIsLoaded(false);
    const interstitial = InterstitialAd.createForAdRequest(AD_UNITS.INTERSTITIAL, {
      requestNonPersonalizedAdsOnly: true,
    });

    const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      setIsLoaded(true);
    });

    const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      // Không load lại — interstitial chỉ 1 lần / phiên (caller quyết định)
    });

    interstitial.load();
    setAd(interstitial);

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
    };
  }, []);

  useEffect(() => {
    const cleanup = loadAd();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showIfReady = useCallback(() => {
    if (ad && isLoaded) {
      ad.show();
    }
  }, [ad, isLoaded]);

  return { isLoaded, showIfReady };
}
