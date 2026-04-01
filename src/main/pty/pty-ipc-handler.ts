import { ipcMain } from 'electron'
import { spawnPty, writePty, killPtySession, resizePty } from './pty-manager'

export function registerPtyIpcHandlers(): void {
  ipcMain.handle('pty:spawn', async (event, { shell, args, cwd }) => {
    const result = await spawnPty(shell, args, cwd, {
      onData: (sessionId, data) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send(`pty:data:${sessionId}`, data)
        }
      },
      onExit: (sessionId, exitCode) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send(`pty:exit:${sessionId}`, exitCode)
        }
      }
    })
    // Notify renderer if spawn failed
    if (!result.ok && !event.sender.isDestroyed()) {
      event.sender.send('pty:spawn:error', result.error)
    }
    return result
  })

  ipcMain.handle('pty:kill', async (_event, sessionId: number) => {
    return killPtySession(sessionId)
  })

  ipcMain.on('pty:write', (_event, sessionId: number, data: string) => {
    // Validate inputs
    if (typeof sessionId !== 'number' || typeof data !== 'string') {
      console.warn('[pty:write] Invalid arguments:', { sessionId, data })
      return
    }
    writePty(sessionId, data)
  })

  ipcMain.on('pty:resize', (_event, sessionId: number, cols: number, rows: number) => {
    // Validate inputs
    if (typeof sessionId !== 'number' || typeof cols !== 'number' || typeof rows !== 'number') {
      console.warn('[pty:resize] Invalid arguments:', { sessionId, cols, rows })
      return
    }
    // Validate integers
    if (!Number.isInteger(sessionId) || !Number.isInteger(cols) || !Number.isInteger(rows)) {
      console.warn('[pty:resize] Non-integer arguments:', { sessionId, cols, rows })
      return
    }
    // Validate finite numbers (rejects NaN and Infinity)
    if (!Number.isFinite(sessionId) || !Number.isFinite(cols) || !Number.isFinite(rows)) {
      console.warn('[pty:resize] Non-finite arguments:', { sessionId, cols, rows })
      return
    }
    // Validate dimensions are positive
    if (cols <= 0 || rows <= 0 || cols > 9999 || rows > 9999) {
      console.warn('[pty:resize] Invalid dimensions:', { cols, rows })
      return
    }
    resizePty(sessionId, cols, rows)
  })
}
