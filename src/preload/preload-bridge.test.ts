import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockExposeInMainWorld = vi.fn()
const mockInvoke = vi.fn()
const mockSend = vi.fn()
const mockOn = vi.fn()
const mockRemoveListener = vi.fn()

vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: mockExposeInMainWorld },
  ipcRenderer: {
    invoke: mockInvoke,
    send: mockSend,
    on: mockOn,
    removeListener: mockRemoveListener,
  },
}))

vi.mock('@electron-toolkit/preload', () => ({
  electronAPI: { ipcRenderer: { send: vi.fn() } },
}))

describe('preload bridge wiring', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    ;(process as typeof process & { contextIsolated?: boolean }).contextIsolated = true
  })

  it('exposes api and forwards app:getVersion through ipcRenderer.invoke', async () => {
    await import('./index')

    const apiExposeCall = mockExposeInMainWorld.mock.calls.find((call) => call[0] === 'api')
    expect(apiExposeCall).toBeTruthy()

    const api = apiExposeCall?.[1] as {
      app: { getVersion: () => Promise<unknown>; getPaths: () => Promise<unknown> }
    }

    await api.app.getVersion()
    expect(mockInvoke).toHaveBeenCalledWith('app:getVersion')
  })

  it('returns unsubscribe function that removes matching pty:data listener', async () => {
    await import('./index')

    const apiExposeCall = mockExposeInMainWorld.mock.calls.find((call) => call[0] === 'api')
    const api = apiExposeCall?.[1] as {
      pty: { onData: (sessionId: number, cb: (data: string) => void) => () => void }
    }

    const callback = vi.fn()
    const unsubscribe = api.pty.onData(1, callback)

    expect(typeof unsubscribe).toBe('function')
    expect(mockOn).toHaveBeenCalledWith('pty:data:1', expect.any(Function))

    unsubscribe()
    expect(mockRemoveListener).toHaveBeenCalledWith('pty:data:1', expect.any(Function))
  })

  it('sends quit:confirm through ipcRenderer.send', async () => {
    await import('./index')

    const apiExposeCall = mockExposeInMainWorld.mock.calls.find((call) => call[0] === 'api')
    const api = apiExposeCall?.[1] as {
      quit: { confirm: () => void }
    }

    api.quit.confirm()

    expect(mockSend).toHaveBeenCalledWith('quit:confirm')
  })

  it('sends quit:cancel through ipcRenderer.send', async () => {
    await import('./index')

    const apiExposeCall = mockExposeInMainWorld.mock.calls.find((call) => call[0] === 'api')
    const api = apiExposeCall?.[1] as {
      quit: { cancel: () => void }
    }

    api.quit.cancel()

    expect(mockSend).toHaveBeenCalledWith('quit:cancel')
  })

  it('returns unsubscribe function that removes matching quit:show-dialog listener', async () => {
    await import('./index')

    const apiExposeCall = mockExposeInMainWorld.mock.calls.find((call) => call[0] === 'api')
    const api = apiExposeCall?.[1] as {
      quit: { onShowDialog: (cb: (data: { sessionCount: number }) => void) => () => void }
    }

    const callback = vi.fn()
    const unsubscribe = api.quit.onShowDialog(callback)

    expect(typeof unsubscribe).toBe('function')
    expect(mockOn).toHaveBeenCalledWith('quit:show-dialog', expect.any(Function))

    unsubscribe()
    expect(mockRemoveListener).toHaveBeenCalledWith('quit:show-dialog', expect.any(Function))
  })
})
