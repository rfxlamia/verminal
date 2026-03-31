import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BrowserWindow } from 'electron'
import {
  handleQuitCancel,
  handleQuitConfirm,
  registerQuitHandler,
  resetQuitHandlerForTests
} from './quit-handler'

const { mockAppQuit } = vi.hoisted(() => ({
  mockAppQuit: vi.fn()
}))

vi.mock('electron', () => ({
  app: {
    quit: mockAppQuit
  }
}))

vi.mock('../logging/crash-log', () => ({
  logError: vi.fn()
}))

interface MockWindow {
  on: ReturnType<typeof vi.fn>
  isDestroyed: ReturnType<typeof vi.fn>
  webContents: {
    send: ReturnType<typeof vi.fn>
    isDestroyed: ReturnType<typeof vi.fn>
  }
}

function createMockWindow(isDestroyed = false, webContentsDestroyed = false): MockWindow {
  return {
    on: vi.fn(),
    isDestroyed: vi.fn(() => isDestroyed),
    webContents: {
      send: vi.fn(),
      isDestroyed: vi.fn(() => webContentsDestroyed)
    }
  }
}

describe('registerQuitHandler', () => {
  beforeEach(() => {
    resetQuitHandlerForTests()
    vi.clearAllMocks()
  })

  it('prevents close and sends quit dialog when active sessions exist', () => {
    const mainWindow = createMockWindow()
    const getActiveSessionIds = vi.fn(() => [1, 2])

    registerQuitHandler(mainWindow as unknown as BrowserWindow, getActiveSessionIds)

    const closeHandler = mainWindow.on.mock.calls[0]?.[1] as (event: {
      preventDefault: () => void
    }) => void
    const event = { preventDefault: vi.fn() }

    closeHandler(event)

    expect(event.preventDefault).toHaveBeenCalledTimes(1)
    expect(mainWindow.webContents.send).toHaveBeenCalledWith('quit:show-dialog', {
      sessionCount: 2
    })
  })

  it('allows close to proceed when there are no active sessions', () => {
    const mainWindow = createMockWindow()
    const getActiveSessionIds = vi.fn(() => [])

    registerQuitHandler(mainWindow as unknown as BrowserWindow, getActiveSessionIds)

    const closeHandler = mainWindow.on.mock.calls[0]?.[1] as (event: {
      preventDefault: () => void
    }) => void
    const event = { preventDefault: vi.fn() }

    closeHandler(event)

    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(mainWindow.webContents.send).not.toHaveBeenCalled()
  })

  it('allows next close event through once quit has been confirmed', () => {
    const mainWindow = createMockWindow()

    handleQuitConfirm(mainWindow as unknown as BrowserWindow, () => [], vi.fn())
    registerQuitHandler(
      mainWindow as unknown as BrowserWindow,
      vi.fn(() => [1, 2, 3])
    )

    const closeHandler = mainWindow.on.mock.calls[0]?.[1] as (event: {
      preventDefault: () => void
    }) => void
    const event = { preventDefault: vi.fn() }

    closeHandler(event)

    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(mainWindow.webContents.send).not.toHaveBeenCalled()
  })

  it('prevents multiple dialogs when close triggered while dialog is showing', () => {
    const mainWindow = createMockWindow()
    const getActiveSessionIds = vi.fn(() => [1, 2])

    registerQuitHandler(mainWindow as unknown as BrowserWindow, getActiveSessionIds)

    const closeHandler = mainWindow.on.mock.calls[0]?.[1] as (event: {
      preventDefault: () => void
    }) => void
    const event = { preventDefault: vi.fn() }

    // First close - should show dialog
    closeHandler(event)
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
    expect(mainWindow.webContents.send).toHaveBeenCalledTimes(1)

    // Second close while dialog showing - should preventDefault but not send again
    const event2 = { preventDefault: vi.fn() }
    closeHandler(event2)
    expect(event2.preventDefault).toHaveBeenCalledTimes(1)
    expect(mainWindow.webContents.send).toHaveBeenCalledTimes(1) // Still only 1
  })

  it('does not send to destroyed webContents', () => {
    const mainWindow = createMockWindow(false, true) // window not destroyed, webContents destroyed
    const getActiveSessionIds = vi.fn(() => [1, 2])

    registerQuitHandler(mainWindow as unknown as BrowserWindow, getActiveSessionIds)

    const closeHandler = mainWindow.on.mock.calls[0]?.[1] as (event: {
      preventDefault: () => void
    }) => void
    const event = { preventDefault: vi.fn() }

    closeHandler(event)

    expect(event.preventDefault).toHaveBeenCalledTimes(1)
    expect(mainWindow.webContents.send).not.toHaveBeenCalled()
  })

  it('resets dialogShowing when cancel is called', () => {
    const mainWindow = createMockWindow()
    const getActiveSessionIds = vi.fn(() => [1, 2])

    registerQuitHandler(mainWindow as unknown as BrowserWindow, getActiveSessionIds)

    const closeHandler = mainWindow.on.mock.calls[0]?.[1] as (event: {
      preventDefault: () => void
    }) => void
    const event = { preventDefault: vi.fn() }

    // Show dialog
    closeHandler(event)
    expect(mainWindow.webContents.send).toHaveBeenCalledTimes(1)

    // Cancel the dialog
    handleQuitCancel(mainWindow as unknown as BrowserWindow)

    // Try close again - should show dialog again (not prevented by dialogShowing)
    const event2 = { preventDefault: vi.fn() }
    closeHandler(event2)
    expect(mainWindow.webContents.send).toHaveBeenCalledTimes(2)
  })
})

describe('handleQuitConfirm', () => {
  beforeEach(() => {
    resetQuitHandlerForTests()
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('kills all active sessions and quits after 2 seconds', () => {
    const mainWindow = createMockWindow()
    const killSession = vi
      .fn<() => { ok: true; data: undefined }>()
      .mockReturnValue({ ok: true, data: undefined })

    handleQuitConfirm(mainWindow as unknown as BrowserWindow, () => [1, 2], killSession)

    expect(killSession).toHaveBeenCalledWith(1)
    expect(killSession).toHaveBeenCalledWith(2)
    expect(mockAppQuit).not.toHaveBeenCalled()

    vi.advanceTimersByTime(2000)

    expect(mockAppQuit).toHaveBeenCalledTimes(1)
  })

  it('quits immediately when no active sessions remain', () => {
    const mainWindow = createMockWindow()
    handleQuitConfirm(mainWindow as unknown as BrowserWindow, () => [], vi.fn())

    expect(mockAppQuit).toHaveBeenCalledTimes(1)
  })

  it('still quits after timeout even when kill fails', () => {
    const mainWindow = createMockWindow()
    const killSession = vi
      .fn<() => { ok: false; error: { code: string; message: string } }>()
      .mockReturnValue({
        ok: false,
        error: { code: 'SESSION_NOT_FOUND', message: 'session already exited' }
      })

    handleQuitConfirm(mainWindow as unknown as BrowserWindow, () => [1], killSession)

    expect(killSession).toHaveBeenCalledWith(1)
    expect(mockAppQuit).not.toHaveBeenCalled()

    vi.advanceTimersByTime(2000)

    expect(mockAppQuit).toHaveBeenCalledTimes(1)
  })

  it('uses GRACEFUL_EXIT_TIMEOUT_MS constant for timing', () => {
    const mainWindow = createMockWindow()
    const killSession = vi
      .fn<() => { ok: true; data: undefined }>()
      .mockReturnValue({ ok: true, data: undefined })

    handleQuitConfirm(mainWindow as unknown as BrowserWindow, () => [1], killSession)

    // Verify timing - should NOT be called at 1999ms
    vi.advanceTimersByTime(1999)
    expect(mockAppQuit).not.toHaveBeenCalled()

    // Should be called at exactly 2000ms
    vi.advanceTimersByTime(1)
    expect(mockAppQuit).toHaveBeenCalledTimes(1)
  })

  it('handles race condition between count and session IDs', () => {
    const mainWindow = createMockWindow()
    // getActiveSessionIds returns empty even though dialog was shown for 2 sessions
    // This simulates sessions exiting between dialog show and quit confirm
    const getActiveSessionIds = vi.fn(() => [])

    handleQuitConfirm(mainWindow as unknown as BrowserWindow, getActiveSessionIds, vi.fn())

    // Should quit immediately since no sessions to kill
    expect(mockAppQuit).toHaveBeenCalledTimes(1)
  })
})
