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
  // Guard: mainWindow must be valid
  if (!mainWindow) {
    console.error('[shortcuts] mainWindow is required')
    return
  }

  // Unregister first to avoid stale bindings when window is recreated (macOS activate)
  globalShortcut.unregister(COMMAND_CENTER_SHORTCUT)
  const registered = globalShortcut.register(COMMAND_CENTER_SHORTCUT, () => {
    // Guard: window and webContents must not be destroyed
    if (mainWindow.isDestroyed()) return
    if (mainWindow.webContents.isDestroyed()) return
    mainWindow.webContents.send('command-center:open')
  })
  if (!registered) {
    console.warn(
      `[shortcuts] Failed to register global shortcut ${COMMAND_CENTER_SHORTCUT}. ` +
        'This may happen if the shortcut is already in use by another application or the OS.'
    )
  }
}

/**
 * Unregisters all global shortcuts.
 * Call this on app will-quit to avoid stale bindings.
 */
export function unregisterGlobalShortcuts(): void {
  globalShortcut.unregister(COMMAND_CENTER_SHORTCUT)
}
