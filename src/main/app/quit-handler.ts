import { app, type BrowserWindow } from 'electron'
import { logError } from '../logging/crash-log'

type GetActiveSessionIdsFn = () => number[]
type KillSessionFn = (sessionId: number) => void

const GRACEFUL_EXIT_TIMEOUT_MS = 2000

interface WindowQuitState {
  quitConfirmed: boolean
  dialogShowing: boolean
}

// Per-window state to avoid leaks between windows and test cases
const windowQuitStates = new WeakMap<BrowserWindow, WindowQuitState>()

function getWindowState(mainWindow: BrowserWindow): WindowQuitState {
  if (!windowQuitStates.has(mainWindow)) {
    windowQuitStates.set(mainWindow, { quitConfirmed: false, dialogShowing: false })
  }
  return windowQuitStates.get(mainWindow)!
}

export function registerQuitHandler(
  mainWindow: BrowserWindow,
  getActiveSessionIds: GetActiveSessionIdsFn
): void {
  mainWindow.on('close', (event) => {
    const state = getWindowState(mainWindow)

    if (state.quitConfirmed) {
      return
    }

    // Prevent multiple dialogs from showing
    if (state.dialogShowing) {
      event.preventDefault()
      return
    }

    const sessionIds = getActiveSessionIds()
    if (sessionIds.length > 0) {
      event.preventDefault()
      state.dialogShowing = true

      // Guard against destroyed webContents
      if (!mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
        mainWindow.webContents.send('quit:show-dialog', { sessionCount: sessionIds.length })
      }
    }
  })
}

export function handleQuitConfirm(
  mainWindow: BrowserWindow,
  getActiveSessionIds: GetActiveSessionIdsFn,
  killSession: KillSessionFn
): void {
  const state = getWindowState(mainWindow)
  state.quitConfirmed = true
  state.dialogShowing = false

  const sessionIds = getActiveSessionIds()

  if (sessionIds.length === 0) {
    app.quit()
    return
  }

  for (const sessionId of sessionIds) {
    try {
      killSession(sessionId)
    } catch (err) {
      // Session may have already exited while quit flow is in progress.
      // Log for debugging but don't block quit.
      logError(`Failed to kill session ${sessionId}: ${err}`)
    }
  }

  setTimeout(() => {
    app.quit()
  }, GRACEFUL_EXIT_TIMEOUT_MS)
}

export function handleQuitCancel(mainWindow: BrowserWindow): void {
  const state = getWindowState(mainWindow)
  state.dialogShowing = false
  // Note: quitConfirmed remains false so dialog can show again
}

export function resetQuitHandlerForTests(): void {
  // WeakMap clears automatically when windows are destroyed
  // This function is kept for API compatibility but no-op with WeakMap
}
