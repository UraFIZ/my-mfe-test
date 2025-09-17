export enum EnvironmentVariable {
  USERS_MFE_PORT = 'NX_USERS_MFE_PORT',
  DASHBOARD_MFE_PORT = 'NX_DASHBOARD_MFE_PORT',
}

export function getEnvVar(key: EnvironmentVariable): string | undefined {
  return process.env[key];
}

export function getMfePort(mfeId: string): string {
  switch (mfeId) {
    case 'usersMfe':
      return getEnvVar(EnvironmentVariable.USERS_MFE_PORT) || '4201';
    case 'dashboardMfe':
      return getEnvVar(EnvironmentVariable.DASHBOARD_MFE_PORT) || '4202';
    default:
      throw new Error(`Unknown MFE ID: ${mfeId}`);
  }
}
