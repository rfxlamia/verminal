import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BrowserWindow } from 'electron'
import {
  handleQuitConfirm,
  registerQuitHandler,
  resetQuitHandlerForTests,
} from './quit-handler'

const { mockAppQuit } = vi.hoisted(() => ({
  mockAppQuit: vi.fn(),
}))

vi.mock('electron', () => ({
  app: {
    quit: mockAppQuit,
  },
}))

describe('registerQuitHandler', () => {
  beforeEach(() => {
    resetQuitHandlerForTests()
    vi.clearAllMocks()
  })

  it('prevents close and sends quit dialog when active sessions exist', () => {
    const mainWindow = {
      on: vi.fn(),
      webContents: {
        send: vi.fn(),
      },
    }
    const getSessionCount = vi.fn(() => 2)

    registerQuitHandler(mainWindow as unknown as BrowserWindow, getSessionCount)

    const closeHandler = mainWindow.on.mock.calls[0]?.[1] as ((event: { preventDefault: () => void }) => void)
    const event = { preventDefault: vi.fn() }

    closeHandler(event)

    expect(event.preventDefault).toHaveBeenCalledTimes(1)
    expect(mainWindow.webContents.send).toHaveBeenCalledWith('quit:show-dialog', { sessionCount: 2 })
  })

  it('allows close to proceed when there are no active sessions', () => {
    const mainWindow = {
      on: vi.fn(),
      webContents: {
        send: vi.fn(),
      },
    }
    const getSessionCount = vi.fn(() => 0)

    registerQuitHandler(mainWindow as unknown as BrowserWindow, getSessionCount)

    const closeHandler = mainWindow.on.mock.calls[0]?.[1] as ((event: { preventDefault: () => void }) => void)
    const event = { preventDefault: vi.fn() }

    closeHandler(event)

    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(mainWindow.webContents.send).not.toHaveBeenCalled()
  })

  it('allows next close event through once quit has been confirmed', () => {
    const mainWindow = {
      on: vi.fn(),
      webContents: {
        send: vi.fn(),
      },
    }

    handleQuitConfirm(() => [], vi.fn())
    registerQuitHandler(mainWindow as unknown as BrowserWindow, vi.fn(() => 3))

    const closeHandler = mainWindow.on.mock.calls[0]?.[1] as ((event: { preventDefault: () => void }) => void)
    const event = { preventDefault: vi.fn() }

    closeHandler(event)

    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(mainWindow.webContents.send).not.toHaveBeenCalled()
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
    const killSession = vi.fn()

    handleQuitConfirm(() => [1, 2], killSession)

    expect(killSession).toHaveBeenCalledWith(1)
    expect(killSession).toHaveBeenCalledWith(2)
    expect(mockAppQuit).not.toHaveBeenCalled()

    vi.advanceTimersByTime(2000)

    expect(mockAppQuit).toHaveBeenCalledTimes(1)
  })

  it('quits immediately when no active sessions remain', () => {
    handleQuitConfirm(() => [], vi.fn())

    expect(mockAppQuit).toHaveBeenCalledTimes(1)
  })

  it('still quits after timeout even when kill callback throws', () => {
    const killSession = vi.fn(() => {
      throw new Error('session already exited')
    })

    handleQuitConfirm(() => [1], killSession)

    expect(killSession).toHaveBeenCalledWith(1)
    expect(mockAppQuit).not.toHaveBeenCalled()

    vi.advanceTimersByTime(2000)

    expect(mockAppQuit).toHaveBeenCalledTimes(1)
  })
})
