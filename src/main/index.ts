import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import type { Result } from '../shared/ipc-contract'
import { ensureConfigDirectory, getConfigPath } from './config-manager'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    title: 'Verminal',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

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
  ipcMain.handle('app:getVersion', (): Result<string> => ({
    ok: true,
    data: app.getVersion(),
  }))

  ipcMain.handle('app:getPaths', (): Result<{ home: string; userData: string }> => ({
    ok: true,
    data: {
      home: app.getPath('home'),
      userData: app.getPath('userData'),
    },
  }))

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Add config:getPath handler
  ipcMain.handle('config:getPath', (): Result<string> => {
    try {
      return { ok: true, data: getConfigPath() }
    } catch (error) {
      return {
        ok: false,
        error: {
          code: 'PATH_RESOLUTION_ERROR',
          message: (error as Error).message,
        },
      }
    }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
