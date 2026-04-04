/**
 * Copyright 2026 V
 * SPDX-License-Identifier: Apache-2.0
 *
 * Global Shortcuts Tests - Unit tests for shortcut registration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BrowserWindow } from 'electron'

// Track registered shortcuts and their handlers
const registeredShortcuts = new Map<string, () => void>()
let isDestroyedValue = false

const mockSend = vi.fn()
const mockIsDestroyed = vi.fn(() => isDestroyedValue)

// Mock electron globalShortcut
vi.mock('electron', () => ({
  globalShortcut: {
    register: vi.fn((accelerator: string, callback: () => void) => {
      registeredShortcuts.set(accelerator, callback)
    }),
    unregister: vi.fn((accelerator: string) => {
      registeredShortcuts.delete(accelerator)
    }),
    unregisterAll: vi.fn(() => {
      registeredShortcuts.clear()
    })
  },
  BrowserWindow: vi.fn()
}))

import { registerGlobalShortcuts, unregisterGlobalShortcuts } from './shortcuts'

describe('shortcuts', () => {
  beforeEach(() => {
    registeredShortcuts.clear()
    isDestroyedValue = false
    vi.clearAllMocks()
  })

  function createMockWindow(destroyed = false): BrowserWindow {
    isDestroyedValue = destroyed
    return {
      isDestroyed: mockIsDestroyed,
      webContents: {
        send: mockSend
      }
    } as unknown as BrowserWindow
  }

  describe('registerGlobalShortcuts', () => {
    it('registers CommandOrControl+Alt+T shortcut', () => {
      const mainWindow = createMockWindow()
      registerGlobalShortcuts(mainWindow)

      expect(registeredShortcuts.has('CommandOrControl+Alt+T')).toBe(true)
    })

    it('sends command-center:open to mainWindow.webContents on shortcut trigger', () => {
      const mainWindow = createMockWindow()
      registerGlobalShortcuts(mainWindow)

      // Get the registered handler and call it
      const handler = registeredShortcuts.get('CommandOrControl+Alt+T')
      expect(handler).toBeDefined()
      handler!()

      expect(mockSend).toHaveBeenCalledWith('command-center:open')
    })

    it('does not send if mainWindow is destroyed', () => {
      const mainWindow = createMockWindow(true) // destroyed = true
      registerGlobalShortcuts(mainWindow)

      // Get the registered handler and call it
      const handler = registeredShortcuts.get('CommandOrControl+Alt+T')
      expect(handler).toBeDefined()
      handler!()

      expect(mockSend).not.toHaveBeenCalled()
    })

    it('unregisters the accelerator before re-registering for a replacement window', async () => {
      const { globalShortcut } = vi.mocked(await import('electron'))

      const mainWindow1 = createMockWindow()
      registerGlobalShortcuts(mainWindow1)

      // unregister should have been called before register
      expect(globalShortcut.unregister).toHaveBeenCalledWith('CommandOrControl+Alt+T')
      expect(globalShortcut.register).toHaveBeenCalledWith(
        'CommandOrControl+Alt+T',
        expect.any(Function)
      )

      // Clear mocks to check second registration
      vi.clearAllMocks()

      // Simulate macOS activate window recreation
      const mainWindow2 = createMockWindow()
      registerGlobalShortcuts(mainWindow2)

      // unregister should be called again before register
      expect(globalShortcut.unregister).toHaveBeenCalledWith('CommandOrControl+Alt+T')
      expect(globalShortcut.register).toHaveBeenCalledWith(
        'CommandOrControl+Alt+T',
        expect.any(Function)
      )
    })
  })

  describe('unregisterGlobalShortcuts', () => {
    it('unregisters the CommandOrControl+Alt+T shortcut', async () => {
      const { globalShortcut } = vi.mocked(await import('electron'))

      unregisterGlobalShortcuts()

      expect(globalShortcut.unregister).toHaveBeenCalledWith('CommandOrControl+Alt+T')
    })
  })
})
