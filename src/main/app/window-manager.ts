import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../../resources/icon.png?asset'

/**
 * Minimum window width in pixels
 * @constant {number}
 */
export const WINDOW_MIN_WIDTH = 1280

/**
 * Minimum window height in pixels
 * @constant {number}
 */
export const WINDOW_MIN_HEIGHT = 720

/**
 * Creates and configures the main application window.
 *
 * Configures a BrowserWindow with:
 * - Minimum dimensions of 1280x720
 * - Security settings: contextIsolation=true, nodeIntegration=false
 * - Platform-specific icon handling for Linux
 * - Preload script for IPC communication
 * - External URL handling via system browser
 *
 * @returns {BrowserWindow} The configured main window instance
 */
export function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: WINDOW_MIN_WIDTH,
    height: WINDOW_MIN_HEIGHT,
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    show: false,
    title: 'Verminal',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../../preload/index.js'),
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

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../../renderer/index.html'))
  }

  return mainWindow
}
