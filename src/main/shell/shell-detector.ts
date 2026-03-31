import { existsSync, accessSync, constants } from 'node:fs'
import { platform } from 'node:os'

const LINUX_SHELL_PATHS = ['/bin/bash', '/usr/bin/bash', '/bin/zsh', '/usr/bin/zsh', '/bin/sh']
const MACOS_SHELL_PATHS = ['/bin/zsh', '/bin/bash', '/bin/sh']

/**
 * Check if a path is an executable file.
 * Verifies both file existence and execute permission.
 */
function isExecutable(path: string): boolean {
  if (!existsSync(path)) {
    return false
  }
  try {
    accessSync(path, constants.X_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Detect available shells on the system.
 * Returns shells in priority order: $SHELL first (if valid), then platform defaults.
 * All returned paths are verified to exist and be executable.
 */
export function detectShells(): string[] {
  const shellFromEnv = process.env.SHELL?.trim()
  const platformPaths = platform() === 'darwin' ? MACOS_SHELL_PATHS : LINUX_SHELL_PATHS

  const candidates: string[] = []

  // Priority 1: $SHELL environment variable (must be non-empty after trim)
  if (shellFromEnv && shellFromEnv.length > 0 && isExecutable(shellFromEnv)) {
    candidates.push(shellFromEnv)
  }

  // Priority 2: Platform-specific fallback paths
  for (const path of platformPaths) {
    if (isExecutable(path) && !candidates.includes(path)) {
      candidates.push(path)
    }
  }

  return candidates
}

/**
 * Get the preferred shell for spawning PTY sessions.
 * Returns the first valid shell from detectShells(), or null if none found.
 */
export function getPreferredShell(): string | null {
  const shells = detectShells()
  return shells.length > 0 ? shells[0] : null
}
