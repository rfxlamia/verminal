import { app, type BrowserWindow } from 'electron'

type GetSessionCountFn = () => number
type GetActiveSessionIdsFn = () => number[]
type KillSessionFn = (sessionId: number) => void

let quitConfirmed = false

export function registerQuitHandler(
  mainWindow: BrowserWindow,
  getSessionCount: GetSessionCountFn
): void {
  mainWindow.on('close', (event) => {
    if (quitConfirmed) {
      return
    }

    const count = getSessionCount()
    if (count > 0) {
      event.preventDefault()
      mainWindow.webContents.send('quit:show-dialog', { sessionCount: count })
    }
  })
}

export function handleQuitConfirm(
  getActiveSessionIds: GetActiveSessionIdsFn,
  killSession: KillSessionFn
): void {
  quitConfirmed = true
  const sessionIds = getActiveSessionIds()

  if (sessionIds.length === 0) {
    app.quit()
    return
  }

  for (const sessionId of sessionIds) {
    try {
      killSession(sessionId)
    } catch {
      // Session may have already exited while quit flow is in progress.
    }
  }

  setTimeout(() => {
    app.quit()
  }, 2000)
}

export function resetQuitHandlerForTests(): void {
  quitConfirmed = false
}
