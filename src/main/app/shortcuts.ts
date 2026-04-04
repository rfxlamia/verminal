/**
 * Copyright 2026 V
 * SPDX-License-Identifier: Apache-2.0
 *
 * Global Shortcuts - Main process global shortcut registration
 * Handles Ctrl+Alt+T (Cmd+Alt+T on macOS) for Command Center
 */

import { globalShortcut, BrowserWindow } from 'electron'

const COMMAND_CENTER_SHORTCUT = 'CommandOrControl+Alt+T'

/**
 * Registers global shortcuts for the application.
 * Unregisters any existing shortcuts first to avoid stale bindings.
 *
 * @param mainWindow - The main BrowserWindow to send events to
 */
export function registerGlobalShortcuts(mainWindow: BrowserWindow): void {
  // Unregister first to avoid stale bindings when window is recreated (macOS activate)
  globalShortcut.unregister(COMMAND_CENTER_SHORTCUT)
  globalShortcut.register(COMMAND_CENTER_SHORTCUT, () => {
    if (mainWindow.isDestroyed()) return
    mainWindow.webContents.send('command-center:open')
  })
}

/**
 * Unregisters all global shortcuts.
 * Call this on app will-quit to avoid stale bindings.
 */
export function unregisterGlobalShortcuts(): void {
  globalShortcut.unregister(COMMAND_CENTER_SHORTCUT)
}
