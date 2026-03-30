import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { getLogsPath } from '../config-manager'
import { atomicWrite } from '../fs/atomic-write'

/**
 * Appends a log line to the runtime log file (verminal.log).
 * Uses atomicWrite for crash-safe file updates.
 *
 * Log format: [ISO_TIMESTAMP] [LEVEL] message\n
 *
 * @param level - Log level: 'debug', 'info', or 'error'
 * @param message - The log message
 * @throws Error if the logs directory does not exist or write fails
 */
export function appendRuntimeLog(level: 'debug' | 'info' | 'error', message: string): void {
  const logsDir = getLogsPath()
  const logFile = join(logsDir, 'verminal.log')
  const timestamp = new Date().toISOString()
  const line = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`
  const existing = existsSync(logFile) ? readFileSync(logFile, 'utf-8') : ''
  atomicWrite(logFile, existing + line)
}
