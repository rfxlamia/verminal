import { existsSync, statSync } from 'node:fs'
import { spawn } from 'node-pty'
import type { IPty } from 'node-pty'
import type { Result } from '../../shared/ipc-contract'
import { getPreferredShell } from '../shell/shell-detector'
import { isExecutable } from '../utils/fs-utils'

const DEFAULT_COLS = 80
const DEFAULT_ROWS = 24
const DATA_BUFFER_INTERVAL_MS = 8

export interface SpawnPtyHooks {
  onData?: (sessionId: number, data: string) => void
  onExit?: (sessionId: number, exitCode: number) => void
}

export interface PTYSession {
  sessionId: number
  shell: string
  args: string[]
  cwd: string
  pty: IPty
  bufferedData: string
  flushTimer: NodeJS.Timeout | null
}

const sessions = new Map<number, PTYSession>()
let sessionIdCounter = 1

function cleanupSession(sessionId: number): void {
  const session = sessions.get(sessionId)
  if (!session) return

  if (session.flushTimer) {
    clearTimeout(session.flushTimer)
    session.flushTimer = null
  }

  sessions.delete(sessionId)
}

function flushBufferedData(session: PTYSession, hooks?: SpawnPtyHooks): void {
  if (session.bufferedData.length === 0) return
  hooks?.onData?.(session.sessionId, session.bufferedData)
  session.bufferedData = ''
}

function resolveSpawnEnv(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  )
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
 * @param args - Arguments to pass to the shell
 * @param cwd - Working directory (auto-resolved if not provided)
 * @param hooks - Callbacks for PTY data and exit events
 * @returns Result with sessionId, or error if no shell available
 */
export async function spawnPty(
  shell?: string,
  args: string[] = [],
  cwd?: string,
  hooks: SpawnPtyHooks = {}
): Promise<Result<{ sessionId: number }>> {
  let shellToUse: string | null

  if (shell) {
    // Validate explicitly provided shell
    shellToUse = shell.trim()
    if (!isExecutable(shellToUse)) {
      return {
        ok: false,
        error: {
          code: 'SHELL_NOT_AVAILABLE',
          message: `Provided shell path is not valid or not executable: ${shellToUse}`
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

  try {
    const ptyProcess = spawn(shellToUse, args, {
      name: 'xterm-256color',
      cols: DEFAULT_COLS,
      rows: DEFAULT_ROWS,
      cwd: cwdToUse,
      env: resolveSpawnEnv()
    })

    const sessionId = sessionIdCounter++
    const session: PTYSession = {
      sessionId,
      shell: shellToUse,
      args,
      cwd: cwdToUse,
      pty: ptyProcess,
      bufferedData: '',
      flushTimer: null
    }

    ptyProcess.onData((chunk: string) => {
      session.bufferedData += chunk
      if (!session.flushTimer) {
        session.flushTimer = setTimeout(() => {
          session.flushTimer = null
          flushBufferedData(session, hooks)
        }, DATA_BUFFER_INTERVAL_MS)
      }
    })

    ptyProcess.onExit(({ exitCode }) => {
      flushBufferedData(session, hooks)
      cleanupSession(sessionId)
      hooks.onExit?.(sessionId, exitCode)
    })

    sessions.set(sessionId, session)

    return { ok: true, data: { sessionId } }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'PTY_SPAWN_ERROR',
        message: (error as Error).message
      }
    }
  }
}

export function getSession(sessionId: number): PTYSession | undefined {
  return sessions.get(sessionId)
}

export function writePty(sessionId: number, data: string): void {
  const session = sessions.get(sessionId)
  session?.pty.write(data)
}

export function resizePty(sessionId: number, cols: number, rows: number): void {
  const session = sessions.get(sessionId)
  session?.pty.resize(cols, rows)
}

export function killPtySession(sessionId: number): Result<void> {
  const session = sessions.get(sessionId)
  if (!session) {
    return {
      ok: false,
      error: {
        code: 'SESSION_NOT_FOUND',
        message: `Session ${sessionId} not found`
      }
    }
  }

  try {
    session.pty.kill()
    cleanupSession(sessionId)
    return { ok: true, data: undefined }
  } catch (error) {
    cleanupSession(sessionId)
    return {
      ok: false,
      error: {
        code: 'PTY_KILL_ERROR',
        message: (error as Error).message
      }
    }
  }
}

// Keep this export for quit-handler compatibility, but delegate to real PTY shutdown.
export function killSession(sessionId: number): void {
  void killPtySession(sessionId)
}

export function getActiveSessionIds(): number[] {
  return Array.from(sessions.keys())
}

export function clearAllSessions(): void {
  sessions.clear()
  sessionIdCounter = 1
}
