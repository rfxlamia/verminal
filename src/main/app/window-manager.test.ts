import { describe, it, expect, vi, beforeEach } from 'vitest'

// Track event handlers for verification
const mockOnHandlers = new Map<string, Function>()
const mockWebContentsHandlers = new Map<string, Function>()

// Mock Electron modules
vi.mock('electron', () => ({
  BrowserWindow: vi.fn().mockImplementation((options) => ({
    _options: options,
    on: vi.fn((event: string, handler: Function) => {
      mockOnHandlers.set(event, handler)
    }),
    webContents: {
      setWindowOpenHandler: vi.fn((handler: Function) => {
        mockWebContentsHandlers.set('setWindowOpenHandler', handler)
      }),
    },
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
import { BrowserWindow, shell } from 'electron'

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
    mockOnHandlers.clear()
    mockWebContentsHandlers.clear()
  })

  it('should create window with 1280x720 dimensions and minimum size constraints', () => {
    createWindow()
    const calls = vi.mocked(BrowserWindow).mock.calls
    expect(calls.length).toBe(1)
    const opts = calls[0]![0] as BrowserWindowOptions

    // Window size
    expect(opts.width).toBe(1280)
    expect(opts.height).toBe(720)

    // Minimum size constraints (Electron enforces these)
    expect(opts.minWidth).toBe(1280)
    expect(opts.minHeight).toBe(720)
  })

  it('should set window title to "Verminal"', () => {
    createWindow()
    const opts = vi.mocked(BrowserWindow).mock.calls[0]![0] as BrowserWindowOptions
    expect(opts.title).toBe('Verminal')
  })

  it('should configure secure webPreferences', () => {
    createWindow()
    const opts = vi.mocked(BrowserWindow).mock.calls[0]![0] as BrowserWindowOptions

    // Security settings
    expect(opts.webPreferences?.contextIsolation).toBe(true)
    expect(opts.webPreferences?.nodeIntegration).toBe(false)

    // Preload script path
    expect(opts.webPreferences?.preload).toContain('preload/index.js')
  })

  it('should register ready-to-show event handler that shows window', () => {
    const mockWindow = createWindow()

    // Verify handler was registered
    expect(mockOnHandlers.has('ready-to-show')).toBe(true)

    // Call the handler and verify show() is called
    const handler = mockOnHandlers.get('ready-to-show')!
    handler()
    expect(mockWindow.show).toHaveBeenCalledTimes(1)
  })

  it('should configure external URL handling via setWindowOpenHandler', () => {
    createWindow()

    // Verify handler was registered
    expect(mockWebContentsHandlers.has('setWindowOpenHandler')).toBe(true)

    // Call the handler with a test URL
    const handler = mockWebContentsHandlers.get('setWindowOpenHandler')!
    const result = handler({ url: 'https://example.com' })

    // Should deny the window open (use external browser instead)
    expect(result).toEqual({ action: 'deny' })

    // Should open in external browser
    expect(shell.openExternal).toHaveBeenCalledWith('https://example.com')
  })

  it('should not show window until ready-to-show event fires', () => {
    createWindow()
    const opts = vi.mocked(BrowserWindow).mock.calls[0]![0] as BrowserWindowOptions
    expect(opts.show).toBe(false)
  })
})
