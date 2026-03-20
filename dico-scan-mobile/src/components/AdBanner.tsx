/**
 * src/components/AdBanner.tsx
 *
 * Banner Ads component — hiển thị ở đáy màn hình chỉ với FREE users.
 * PREMIUM và PREMIUM_GOLD không thấy quảng cáo này.
 *
 * Sử dụng:
 *   <AdBanner />   ← tự động ẩn nếu tier !== 'FREE'
 *
 * Kích thước: GAMBannerSize.BANNER (320x50) — cố định, không adaptive
 * để tránh layout jump khi load lần đầu.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_UNITS } from '@/constants/adConfig';
import { useSubscriptionStore } from '@/store/subscriptionStore';

interface AdBannerProps {
  /** Override tier check — useful for testing */
  forceShow?: boolean;
}

export function AdBanner({ forceShow = false }: AdBannerProps) {
  const { tier } = useSubscriptionStore();

  // Chỉ hiển thị với FREE tier
  if (!forceShow && tier !== 'FREE') {
    return null;
  }

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={AD_UNITS.BANNER}
        size={BannerAdSize.BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
          keywords: ['health', 'food', 'beauty', 'shopping'],
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    backgroundColor: 'transparent',
  },
});
