import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Electron modules
vi.mock('electron', () => ({
  BrowserWindow: vi.fn().mockImplementation((options) => ({
    _options: options,
    on: vi.fn(),
    webContents: { setWindowOpenHandler: vi.fn() },
    loadURL: vi.fn(),
    loadFile: vi.fn(),
    show: vi.fn(),
    getSize: vi.fn(() => [options.width, options.height]),
    setMinimumSize: vi.fn(),
  })),
  shell: { openExternal: vi.fn() },
  app: {
    getPath: vi.fn((name: string) => `/mock/${name}`),
    isPackaged: false,
  },
}))

// Mock electron-toolkit/utils
vi.mock('@electron-toolkit/utils', () => ({
  is: { dev: false },
}))

vi.mock('../../../resources/icon.png?asset', () => ({ default: 'icon.png' }))

import { createWindow } from './window-manager'
import { BrowserWindow } from 'electron'

interface BrowserWindowOptions {
  width?: number
  height?: number
  minWidth?: number
  minHeight?: number
  title?: string
  show?: boolean
  webPreferences?: {
    preload?: string
    sandbox?: boolean
    contextIsolation?: boolean
    nodeIntegration?: boolean
  }
}

describe('window-manager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create window with minimum 1280x720 dimensions', () => {
    createWindow()
    const calls = vi.mocked(BrowserWindow).mock.calls
    expect(calls.length).toBe(1)
    const opts = calls[0]![0] as BrowserWindowOptions
    expect(opts.minWidth).toBe(1280)
    expect(opts.minHeight).toBe(720)
    expect(opts.width).toBeGreaterThanOrEqual(1280)
    expect(opts.height).toBeGreaterThanOrEqual(720)
  })

  it('should set window title to "Verminal"', () => {
    createWindow()
    const opts = vi.mocked(BrowserWindow).mock.calls[0]![0] as BrowserWindowOptions
    expect(opts.title).toBe('Verminal')
  })

  it('should have contextIsolation: true and nodeIntegration: false', () => {
    createWindow()
    const opts = vi.mocked(BrowserWindow).mock.calls[0]![0] as BrowserWindowOptions
    expect(opts.webPreferences?.contextIsolation).toBe(true)
    expect(opts.webPreferences?.nodeIntegration).toBe(false)
  })

  it('should set minWidth and minHeight to enforce minimum size', () => {
    createWindow()
    const opts = vi.mocked(BrowserWindow).mock.calls[0]![0] as BrowserWindowOptions
    // Electron enforces this — no resize below these values possible
    expect(opts.minWidth).toBe(1280)
    expect(opts.minHeight).toBe(720)
  })
})
