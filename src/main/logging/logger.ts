import { appendRuntimeLog } from './runtime-log'

/**
 * Logger facade for main process
 * Delegates to runtime-log.ts for file-based logging with atomic writes
 * Falls back to console if file logging fails (e.g., during early boot)
 */
export const logger = {
  /**
   * Log debug message
   * Writes to verminal.log with fallback to console.debug
   */
  debug: (msg: string, data?: unknown): void => {
    const full = data ? `${msg} ${JSON.stringify(data)}` : msg
    try {
      appendRuntimeLog('debug', full)
    } catch {
      console.debug(`[DEBUG] ${full}`)
    }
  },

  /**
   * Log info message
   * Writes to verminal.log with fallback to console.log
   */
  info: (msg: string, data?: unknown): void => {
    const full = data ? `${msg} ${JSON.stringify(data)}` : msg
    try {
      appendRuntimeLog('info', full)
    } catch {
      console.log(`[INFO] ${full}`)
    }
  },

  /**
   * Log error message
   * Writes to verminal.log with fallback to console.error
   * Crash logs should use writeCrashLog() directly for critical errors
   */
  error: (msg: string, data?: unknown): void => {
    const full = data ? `${msg} ${JSON.stringify(data)}` : msg
    try {
      appendRuntimeLog('error', full)
    } catch {
      console.error(`[ERROR] ${full}`)
    }
  }
}
