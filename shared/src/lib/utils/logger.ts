export function log(message: string, ...args: any[]): void {
  console.log(`[MFE] ${message}`, ...args);
}

export function logError(message: string, error?: Error): void {
  console.error(`[MFE ERROR] ${message}`, error);
}

export function logWarn(message: string, ...args: any[]): void {
  console.warn(`[MFE WARN] ${message}`, ...args);
}
