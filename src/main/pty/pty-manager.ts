import { existsSync, statSync, accessSync, constants } from 'node:fs'
import type { Result } from '../../shared/ipc-contract'
import { getPreferredShell } from '../shell/shell-detector'

export interface PTYSession {
  sessionId: number
  shell: string
  cwd: string
}

const sessions = new Map<number, PTYSession>()
let sessionIdCounter = 1

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
 * Validate and resolve the working directory for a PTY session.
 * Falls back through: provided cwd → $HOME → /tmp → /
 * Only returns directories that exist and are accessible.
 */
function resolveCwd(preferredCwd?: string): string {
  const candidates = [preferredCwd, process.env.HOME, '/tmp', '/'].filter(
    (cwd): cwd is string => typeof cwd === 'string'
  )

  for (const cwd of candidates) {
    try {
      if (existsSync(cwd)) {
        const stats = statSync(cwd)
        if (stats.isDirectory()) {
          return cwd
        }
      }
    } catch {
      // Continue to next candidate
    }
  }

  // This should never happen on a functional Unix system
  return '/'
}

/**
 * Spawn a new PTY session with the specified or auto-detected shell.
 *
 * @param shell - Shell path to use (auto-detected if not provided)
 * @param cwd - Working directory (auto-resolved if not provided)
 * @returns Result with sessionId and shell path, or error if no shell available
 */
export async function spawnPty(
  shell?: string,
  cwd?: string
): Promise<Result<{ sessionId: number; shell: string }>> {
  let shellToUse: string | null

  if (shell) {
    // Validate explicitly provided shell
    shellToUse = shell.trim()
    if (!isExecutable(shellToUse)) {
      return {
        ok: false,
        error: {
          code: 'SHELL_NOT_AVAILABLE',
          message: `Provided shell path is not valid or not executable: ${shell}`
        }
      }
    }
  } else {
    shellToUse = getPreferredShell()
  }

  if (!shellToUse) {
    return {
      ok: false,
      error: {
        code: 'SHELL_NOT_AVAILABLE',
        message: 'No valid shell found. Please configure shell path in config.'
      }
    }
  }

  const cwdToUse = resolveCwd(cwd)

  const sessionId = sessionIdCounter++
  const session: PTYSession = {
    sessionId,
    shell: shellToUse,
    cwd: cwdToUse
  }

  sessions.set(sessionId, session)

  return {
    ok: true,
    data: {
      sessionId,
      shell: shellToUse
    }
  }
}

export function getSession(sessionId: number): PTYSession | undefined {
  return sessions.get(sessionId)
}

export function killSession(sessionId: number): boolean {
  return sessions.delete(sessionId)
}

export function getActiveSessionIds(): number[] {
  return Array.from(sessions.keys())
}

export function clearAllSessions(): void {
  sessions.clear()
  sessionIdCounter = 1
}
