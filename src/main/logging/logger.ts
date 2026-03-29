/**
 * Logger facade for main process
 * Provides debug, info, and error logging
 *
 * NOTE: This is a minimal implementation. Full file-based logging
 * will be implemented in Story 1.7 with atomic-write.ts
 */
export const logger = {
  /**
   * Log debug message
   * Currently uses console.debug as fallback
   */
  debug: (msg: string, data?: unknown): void => {
    console.debug(`[DEBUG] ${msg}`, data ?? '')
  },

  /**
   * Log info message
   * Currently uses console.log as fallback
   */
  info: (msg: string, data?: unknown): void => {
    console.log(`[INFO] ${msg}`, data ?? '')
  },

  /**
   * Log error message
   * Currently uses console.error as fallback
   * Crash logs should use writeCrashLog() directly
   */
  error: (msg: string, data?: unknown): void => {
    console.error(`[ERROR] ${msg}`, data ?? '')
  },
}
