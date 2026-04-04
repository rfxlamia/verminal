import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SavedLayoutSummary } from '../shared/ipc-contract'

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
    removeListener: mockRemoveListener
  }
}))

vi.mock('@electron-toolkit/preload', () => ({
  electronAPI: { ipcRenderer: { send: vi.fn() } }
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

  it('returns unsubscribe function that removes matching command-center:open listener', async () => {
    await import('./index')

    const apiExposeCall = mockExposeInMainWorld.mock.calls.find((call) => call[0] === 'api')
    const api = apiExposeCall?.[1] as {
      commandCenter: { onOpen: (cb: () => void) => () => void }
    }

    const callback = vi.fn()
    const unsubscribe = api.commandCenter.onOpen(callback)

    expect(typeof unsubscribe).toBe('function')
    expect(mockOn).toHaveBeenCalledWith('command-center:open', expect.any(Function))

    unsubscribe()
    expect(mockRemoveListener).toHaveBeenCalledWith('command-center:open', expect.any(Function))
  })

  it('invokes layout:list through ipcRenderer.invoke and returns SavedLayoutSummary[]', async () => {
    const mockResult = {
      ok: true,
      data: [
        { name: 'dev', layout_name: 'horizontal' },
        { name: 'work', layout_name: 'grid' }
      ]
    }
    mockInvoke.mockResolvedValue(mockResult)

    await import('./index')

    const apiExposeCall = mockExposeInMainWorld.mock.calls.find((call) => call[0] === 'api')
    const api = apiExposeCall?.[1] as {
      layout: { list: () => Promise<{ ok: true; data: SavedLayoutSummary[] }> }
    }

    const result = await api.layout.list()

    expect(mockInvoke).toHaveBeenCalledWith('layout:list')
    // Verify the result structure matches SavedLayoutSummary[]
    if (result.ok) {
      expect(Array.isArray(result.data)).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toHaveProperty('name')
      expect(result.data[0]).toHaveProperty('layout_name')
    }
  })

  it('invokes layout:load with name through ipcRenderer.invoke', async () => {
    await import('./index')

    const apiExposeCall = mockExposeInMainWorld.mock.calls.find((call) => call[0] === 'api')
    const api = apiExposeCall?.[1] as {
      layout: { load: (name: string) => Promise<unknown> }
    }

    await api.layout.load('dev-workspace')

    expect(mockInvoke).toHaveBeenCalledWith('layout:load', 'dev-workspace')
  })
})
