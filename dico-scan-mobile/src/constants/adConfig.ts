/**
 * src/constants/adConfig.ts
 *
 * Centralized Ad Unit IDs for Google AdMob.
 * 
 * IMPORTANT: Các ID dưới đây là TEST IDs của Google (luôn hiển thị quảng cáo thử nghiệm).
 * Trước khi phát hành production, thay thế bằng ID thật từ Google AdMob Console.
 *
 * Android Test IDs:
 *   https://developers.google.com/admob/android/test-ads
 * iOS Test IDs:
 *   https://developers.google.com/admob/ios/test-ads
 */

import { Platform } from 'react-native';

const IS_ANDROID = Platform.OS === 'android';

export const AD_UNITS = {
  /**
   * Banner Ads — hiển thị ở đáy màn hình, dành cho FREE users.
   * Kích thước: Adaptive Banner (tự điều chỉnh theo màn hình).
   */
  BANNER: IS_ANDROID
    ? 'ca-app-pub-5223099667588796/7139382394'  // Android Test
    : 'ca-app-pub-3940256099942544/2934735716', // iOS Test

  /**
   * Rewarded Video Ads — user chọn xem để nhận 1 DICO Xu.
   * Callback `onRewarded` sẽ trigger API `/v1/users/me/tokens/reward`.
   */
  REWARDED: IS_ANDROID
    ? 'ca-app-pub-5223099667588796/6947810707'  // Android Test
    : 'ca-app-pub-3940256099942544/1712485313', // iOS Test

  /**
   * Interstitial Ads — quảng cáo toàn màn hình, tối đa 1 lần / phiên.
   * Trigger sau mỗi ~3 lần quét sản phẩm.
   */
  INTERSTITIAL: IS_ANDROID
    ? 'ca-app-pub-5223099667588796/1773573321'  // Android Test
    : 'ca-app-pub-3940256099942544/4411468910', // iOS Test
} as const;
