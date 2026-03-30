import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockHandle = vi.fn()
const mockOn = vi.fn()
const mockGetVersion = vi.fn(() => '0.0.1')
const mockGetPath = vi.fn((name: string) => `/mock/${name}`)
const mockHandleQuitConfirm = vi.fn()
const mockHandleQuitCancel = vi.fn()
const mockRegisterQuitHandler = vi.fn()

class MockBrowserWindow {
  static getAllWindows = vi.fn(() => [new MockBrowserWindow()])

  on = vi.fn()
  show = vi.fn()
  loadURL = vi.fn()
  loadFile = vi.fn()
  webContents = {
    setWindowOpenHandler: vi.fn(() => ({ action: 'deny' as const }))
  }
}

vi.mock('electron', () => ({
  app: {
    getVersion: mockGetVersion,
    getPath: mockGetPath,
    whenReady: vi.fn(() => Promise.resolve()),
    on: vi.fn(),
    quit: vi.fn()
  },
  ipcMain: { handle: mockHandle, on: mockOn },
  BrowserWindow: MockBrowserWindow,
  shell: { openExternal: vi.fn() }
}))

vi.mock('@electron-toolkit/utils', () => ({
  electronApp: { setAppUserModelId: vi.fn() },
  optimizer: { watchWindowShortcuts: vi.fn() },
  is: { dev: false }
}))

vi.mock('./config-manager', () => ({
  getConfigPath: vi.fn(() => '/home/user/.verminal'),
  getLogsPath: vi.fn(() => '/home/user/.verminal/logs'),
  ensureConfigDirectory: vi.fn(() => ({ ok: true, data: undefined }))
}))

vi.mock('./app/quit-handler', () => ({
  handleQuitConfirm: mockHandleQuitConfirm,
  handleQuitCancel: mockHandleQuitCancel,
  registerQuitHandler: mockRegisterQuitHandler
}))

vi.mock('../../resources/icon.png?asset', () => ({ default: 'icon.png' }))

describe('main IPC registration', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('registers app:getVersion and app:getPaths handlers that return Result payloads', async () => {
    await import('./index')

    const getVersionCall = mockHandle.mock.calls.find((call) => call[0] === 'app:getVersion')
    const getPathsCall = mockHandle.mock.calls.find((call) => call[0] === 'app:getPaths')

    expect(getVersionCall).toBeTruthy()
    expect(getPathsCall).toBeTruthy()

    const versionHandler = getVersionCall?.[1] as () => { ok: boolean; data: string }
    const pathsHandler = getPathsCall?.[1] as () => {
      ok: boolean
      data: { home: string; userData: string; logsDir: string }
    }

    mockGetVersion.mockReturnValue('1.2.0')
    mockGetPath.mockImplementation((name: string) => {
      if (name === 'home') return '/home/user'
      if (name === 'userData') return '/home/user/.config/verminal'
      return `/mock/${name}`
    })

    expect(versionHandler()).toEqual({ ok: true, data: '1.2.0' })
    expect(pathsHandler()).toEqual({
      ok: true,
      data: {
        home: '/home/user',
        userData: '/home/user/.config/verminal',
        logsDir: '/home/user/.verminal/logs'
      }
    })
  })

  it('registers quit:confirm listener and delegates to handleQuitConfirm', async () => {
    await import('./index')

    const quitConfirmCall = mockOn.mock.calls.find((call) => call[0] === 'quit:confirm')
    expect(quitConfirmCall).toBeTruthy()

    const quitConfirmHandler = quitConfirmCall?.[1] as () => void
    quitConfirmHandler()

    expect(mockHandleQuitConfirm).toHaveBeenCalledTimes(1)
    expect(mockRegisterQuitHandler).toHaveBeenCalledTimes(1)
  })

  it('registers quit:cancel listener and delegates to handleQuitCancel', async () => {
    await import('./index')

    const quitCancelCall = mockOn.mock.calls.find((call) => call[0] === 'quit:cancel')
    expect(quitCancelCall).toBeTruthy()

    const quitCancelHandler = quitCancelCall?.[1] as () => void
    quitCancelHandler()

    expect(mockHandleQuitCancel).toHaveBeenCalledTimes(1)
  })
})
