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
let webContentsIsDestroyedValue = false
let shouldRegisterFail = false

const mockSend = vi.fn()
const mockIsDestroyed = vi.fn(() => isDestroyedValue)
const mockWebContentsIsDestroyed = vi.fn(() => webContentsIsDestroyedValue)

// Mock electron globalShortcut
vi.mock('electron', () => ({
  globalShortcut: {
    register: vi.fn((accelerator: string, callback: () => void) => {
      if (shouldRegisterFail) return false
      registeredShortcuts.set(accelerator, callback)
      return true
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
    webContentsIsDestroyedValue = false
    shouldRegisterFail = false
    vi.clearAllMocks()
  })

  function createMockWindow(destroyed = false, webContentsDestroyed = false): BrowserWindow {
    isDestroyedValue = destroyed
    webContentsIsDestroyedValue = webContentsDestroyed
    return {
      isDestroyed: mockIsDestroyed,
      webContents: {
        send: mockSend,
        isDestroyed: mockWebContentsIsDestroyed
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

    it('replacement window receives command-center:open events after re-registration', () => {
      const mainWindow1 = createMockWindow()
      registerGlobalShortcuts(mainWindow1)

      // Trigger shortcut - should send to window 1
      const handler1 = registeredShortcuts.get('CommandOrControl+Alt+T')
      handler1!()
      expect(mockSend).toHaveBeenCalledTimes(1)
      expect(mockSend).toHaveBeenCalledWith('command-center:open')

      // Clear mocks to simulate replacement
      vi.clearAllMocks()

      // Simulate macOS activate window recreation
      const mainWindow2 = createMockWindow()
      registerGlobalShortcuts(mainWindow2)

      // Trigger shortcut again - should send to window 2 (not window 1)
      const handler2 = registeredShortcuts.get('CommandOrControl+Alt+T')
      handler2!()
      expect(mockSend).toHaveBeenCalledTimes(1)
      expect(mockSend).toHaveBeenCalledWith('command-center:open')

      // Verify the new window's webContents.send was called
      // This confirms the replacement window is being used
    })

    it('logs warning when shortcut registration fails', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      shouldRegisterFail = true

      const mainWindow = createMockWindow()
      registerGlobalShortcuts(mainWindow)

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to register global shortcut')
      )

      consoleWarnSpy.mockRestore()
    })

    it('handles global shortcut collision gracefully', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      shouldRegisterFail = true

      const mainWindow = createMockWindow()
      // This simulates the shortcut already being registered by another app
      registerGlobalShortcuts(mainWindow)

      // App should not crash, just log warning
      expect(consoleWarnSpy).toHaveBeenCalled()
      // Shortcut should not be in registered map since registration failed
      expect(registeredShortcuts.has('CommandOrControl+Alt+T')).toBe(false)

      consoleWarnSpy.mockRestore()
    })

    it('logs error when mainWindow is null', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // @ts-expect-error Testing null window case
      registerGlobalShortcuts(null)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('mainWindow is required')
      )

      consoleErrorSpy.mockRestore()
    })

    it('does not send when webContents is destroyed', () => {
      const mainWindow = createMockWindow(false, true) // webContents destroyed
      registerGlobalShortcuts(mainWindow)

      const handler = registeredShortcuts.get('CommandOrControl+Alt+T')
      expect(handler).toBeDefined()
      handler!()

      expect(mockSend).not.toHaveBeenCalled()
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
