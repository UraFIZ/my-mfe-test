export const FEATURE_APP_ID = {
  USERS_MFE: 'usersMfe',
  DASHBOARD_MFE: 'dashboardMfe',
} as const;

export type FeatureAppId = (typeof FEATURE_APP_ID)[keyof typeof FEATURE_APP_ID];
