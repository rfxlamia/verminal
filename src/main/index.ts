import { app, BrowserWindow, ipcMain } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import type { Result } from '../shared/ipc-contract'
import { ensureConfigDirectory, getLogsPath } from './config-manager'
import { createWindow } from './app/window-manager'
import { handleQuitCancel, handleQuitConfirm, registerQuitHandler } from './app/quit-handler'
import { registerGlobalShortcuts, unregisterGlobalShortcuts } from './app/shortcuts'
import { initCrashLogger } from './logging/crash-log'
import { handleShellDetect } from './shell/shell-manager'
import { registerPtyIpcHandlers } from './pty/pty-ipc-handler'
import { getActiveSessionIds, killSession } from './pty/pty-manager'

// Initialize crash handler BEFORE any async operations
// This ensures crashes during startup are captured
initCrashLogger()

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.verminal.app')

  // CRITICAL: Ensure config directory exists before creating window
  const configResult = ensureConfigDirectory()
  if (!configResult.ok) {
    console.error('Failed to create config directory:', configResult.error)
    // App can continue but log the error - user will see degraded functionality
  }

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC handlers
  ipcMain.handle(
    'app:getVersion',
    (): Result<string> => ({
      ok: true,
      data: app.getVersion()
    })
  )

  ipcMain.handle(
    'app:getPaths',
    (): Result<{ home: string; userData: string; logsDir: string }> => {
      try {
        return {
          ok: true,
          data: {
            home: app.getPath('home'),
            userData: app.getPath('userData'),
            logsDir: getLogsPath()
          }
        }
      } catch (error) {
        return {
          ok: false,
          error: {
            code: 'PATH_RESOLUTION_ERROR',
            message: (error as Error).message
          }
        }
      }
    }
  )

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Shell detection IPC handler
  ipcMain.handle('shell:detect', handleShellDetect)

  // Register PTY IPC handlers
  registerPtyIpcHandlers()

  // Track mainWindow reference for quit handlers
  let mainWindow: BrowserWindow | null = null

  const createMainWindow = (): BrowserWindow => {
    mainWindow = createWindow()
    registerQuitHandler(mainWindow, getActiveSessionIds)
    registerGlobalShortcuts(mainWindow)
    return mainWindow
  }

  createMainWindow()

  // Quit IPC handlers with error boundaries
  ipcMain.on('quit:confirm', () => {
    if (!mainWindow) return
    try {
      handleQuitConfirm(mainWindow, getActiveSessionIds, killSession)
    } catch (error) {
      console.error('Error in quit:confirm handler:', error)
    }
  })

  ipcMain.on('quit:cancel', () => {
    if (!mainWindow) return
    try {
      handleQuitCancel(mainWindow)
    } catch (error) {
      console.error('Error in quit:cancel handler:', error)
    }
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Unregister global shortcuts before quitting to avoid stale bindings
app.on('will-quit', () => {
  unregisterGlobalShortcuts()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
