import { ipcMain } from 'electron'
import { spawnPty, writePty, killPtySession, resizePty } from './pty-manager'

export function registerPtyIpcHandlers(): void {
  ipcMain.handle('pty:spawn', async (event, { shell, args, cwd }) => {
    return spawnPty(shell, args, cwd, {
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
  })

  ipcMain.handle('pty:kill', async (_event, sessionId: number) => {
    return killPtySession(sessionId)
  })

  ipcMain.on('pty:write', (_event, sessionId: number, data: string) => {
    writePty(sessionId, data)
  })

  ipcMain.on('pty:resize', (_event, sessionId: number, cols: number, rows: number) => {
    resizePty(sessionId, cols, rows)
  })
}
