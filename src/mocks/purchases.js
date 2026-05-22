// Web stub for react-native-purchases (RevenueCat)
const Purchases = {
  configure: () => {},
  getOfferings: async () => ({ current: null }),
  purchasePackage: async () => ({}),
  restorePurchases: async () => ({}),
  getCustomerInfo: async () => ({ entitlements: { active: {} } }),
  isConfigured: false,
};
export default Purchases;
export const LOG_LEVEL = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
export const PACKAGE_TYPE = { MONTHLY: 'MONTHLY', ANNUAL: 'ANNUAL' };
