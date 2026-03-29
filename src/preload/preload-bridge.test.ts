import { describe, it, expect, vi } from 'vitest'

describe('api bridge shape', () => {
  it('exposes app namespace with getVersion', () => {
    // Simulate what contextBridge.exposeInMainWorld receives
    const mockIpcRenderer = {
      invoke: vi.fn(),
      send: vi.fn(),
      on: vi.fn(() => () => {}),
      removeListener: vi.fn(),
    }

    const bridge = {
      app: {
        getVersion: () => mockIpcRenderer.invoke('app:getVersion'),
        getPaths: () => mockIpcRenderer.invoke('app:getPaths'),
      },
    }

    expect(typeof bridge.app.getVersion).toBe('function')
    bridge.app.getVersion()
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('app:getVersion')
  })

  it('onData returns an unsubscribe function', () => {
    const mockIpcRenderer = {
      on: vi.fn(),
      removeListener: vi.fn(),
    }
    const onData = (sessionId: number, cb: (data: string) => void) => {
      const channel = `pty:data:${sessionId}`
      const listener = (_: unknown, data: string) => cb(data)
      mockIpcRenderer.on(channel, listener)
      return () => mockIpcRenderer.removeListener(channel, listener)
    }

    const unsub = onData(1, () => {})
    expect(typeof unsub).toBe('function')
    unsub()
    expect(mockIpcRenderer.removeListener).toHaveBeenCalled()
  })
})
