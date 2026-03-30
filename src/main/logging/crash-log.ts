import { app } from 'electron'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { getLogsPath } from '../config-manager'

let crashLoggerInitialized = false

function getSafeAppVersion(): string {
  try {
    return app.getVersion()
  } catch {
    return 'unknown'
  }
}

/**
 * Format crash log content with all required fields
 * Includes timestamp, versions, platform info, error message and stack trace
 */
export function formatCrashLog(error: Error): string {
  const timestamp = new Date().toISOString()
  const appVersion = getSafeAppVersion()
  const electronVersion = process.versions.electron
  const platform = process.platform
  const arch = process.arch
  const nodeVersion = process.version

  return `=== VERMINAL CRASH LOG ===
Timestamp: ${timestamp}
App Version: ${appVersion}
Electron: ${electronVersion}
Platform: ${platform} ${arch}
Node.js: ${nodeVersion}
========================

Error: ${error.message}

Stack:
${error.stack || 'No stack trace available'}
`
}

/**
 * Resolve logs directory with fallback for early-boot scenarios
 * Falls back to process.env.HOME or os.homedir() if getLogsPath fails
 */
function resolveLogsDir(): string {
  try {
    return getLogsPath()
  } catch {
    // Fallback for extreme early-boot crash where app.getPath is unavailable
    const home = process.env.HOME ?? homedir()
    return join(home, '.verminal', 'logs')
  }
}

/**
 * Write crash log synchronously to disk
 * Uses writeFileSync to ensure complete before process exit
 */
export function writeCrashLog(error: Error): void {
  try {
    const logsDir = resolveLogsDir()

    // Ensure logs directory exists
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true })
    }

    const filename = `crash-${Date.now()}.log`
    const filepath = join(logsDir, filename)
    const content = formatCrashLog(error)

    writeFileSync(filepath, content, 'utf-8')
  } catch {
    // Best-effort: if we can't write the log, we can't do anything
    // Silent failure - crash handler should not throw
  }
}

/**
 * Initialize global crash handlers
 * Must be called before any async operations begin
 */
export function initCrashLogger(): void {
  if (crashLoggerInitialized) {
    return
  }
  crashLoggerInitialized = true

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    writeCrashLog(error)
    // Re-throw to let Electron handle the crash naturally
    throw error
  })

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error(String(reason))
    writeCrashLog(error)
    // Unhandled rejections are treated as critical failures.
    process.exitCode = 1
    process.exit(1)
  })
}

export function resetCrashLoggerForTests(): void {
  crashLoggerInitialized = false
}

/**
 * Log a non-fatal error for debugging purposes
 * Writes to stderr and optionally could be extended to write to log file
 */
export function logError(message: string): void {
  console.error(`[ERROR] ${message}`)
}
