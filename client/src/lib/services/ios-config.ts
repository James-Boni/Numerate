/**
 * iOS/Expo Configuration Placeholders
 * 
 * This file contains configuration values that will be used when
 * building for iOS via Expo. These are placeholders that should be
 * updated before creating an iOS build.
 * 
 * INTEGRATION REQUIREMENTS (for future implementation):
 * - expo-apple-authentication: For Sign in with Apple
 * - StoreKit library: For In-App Purchases (TBD - expo-in-app-purchases or similar)
 * - expo-secure-store: For secure credential storage
 */

export const IOSConfig = {
  bundleIdentifier: 'com.numerate.app',
  
  appStoreConnect: {
    appId: 'PLACEHOLDER_APP_ID',
    teamId: 'PLACEHOLDER_TEAM_ID',
  },
  
  capabilities: {
    signInWithApple: true,
    inAppPurchases: true,
  },
  
  associatedDomains: [
  ],
  
  entitlements: {
  },
};

export const IAPProducts = {
  PREMIUM_MONTHLY: {
    productId: 'com.numerate.premium.monthly',
    type: 'subscription' as const,
    displayName: 'Numerate Premium (Monthly)',
    period: 'P1M',
  },
  PREMIUM_YEARLY: {
    productId: 'com.numerate.premium.yearly',
    type: 'subscription' as const,
    displayName: 'Numerate Premium (Yearly)',
    period: 'P1Y',
  },
};

export function isExpoEnvironment(): boolean {
  return false;
}

export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function canUseAppleAuth(): boolean {
  return isExpoEnvironment() && isIOSDevice();
}

export function canUseAppleIAP(): boolean {
  return isExpoEnvironment() && isIOSDevice();
}
