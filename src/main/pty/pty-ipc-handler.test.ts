import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockSpawnPty,
  mockWritePty,
  mockKillPtySession,
  mockResizePty,
  mockIpcMainHandle,
  mockIpcMainOn
} = vi.hoisted(() => ({
  mockSpawnPty: vi.fn(),
  mockWritePty: vi.fn(),
  mockKillPtySession: vi.fn(),
  mockResizePty: vi.fn(),
  mockIpcMainHandle: vi.fn(),
  mockIpcMainOn: vi.fn()
}))

vi.mock('./pty-manager', () => ({
  spawnPty: mockSpawnPty,
  writePty: mockWritePty,
  killPtySession: mockKillPtySession,
  resizePty: mockResizePty
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: mockIpcMainHandle,
    on: mockIpcMainOn
  }
}))

import { registerPtyIpcHandlers } from './pty-ipc-handler'

describe('pty-ipc-handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers pty:spawn and forwards shell, args, cwd to spawnPty', async () => {
    registerPtyIpcHandlers()

    const spawnCall = mockIpcMainHandle.mock.calls.find(([channel]) => channel === 'pty:spawn')
    expect(spawnCall).toBeDefined()
    const [, handler] = spawnCall!
    const sender = { send: vi.fn(), isDestroyed: vi.fn(() => false) }

    mockSpawnPty.mockImplementation(async (_shell, _args, _cwd, hooks) => {
      hooks.onData?.(1, 'hello')
      hooks.onExit?.(1, 0)
      return { ok: true, data: { sessionId: 1 } }
    })

    const result = await handler({ sender }, { shell: '/bin/bash', args: ['-l'], cwd: '/tmp' })

    expect(mockSpawnPty).toHaveBeenCalledWith(
      '/bin/bash',
      ['-l'],
      '/tmp',
      expect.objectContaining({
        onData: expect.any(Function),
        onExit: expect.any(Function)
      })
    )
    expect(sender.send).toHaveBeenCalledWith('pty:data:1', 'hello')
    expect(sender.send).toHaveBeenCalledWith('pty:exit:1', 0)
    expect(result).toEqual({ ok: true, data: { sessionId: 1 } })
  })

  it('does not send PTY events to a destroyed sender', async () => {
    registerPtyIpcHandlers()

    const spawnCall = mockIpcMainHandle.mock.calls.find(([channel]) => channel === 'pty:spawn')
    expect(spawnCall).toBeDefined()
    const [, handler] = spawnCall!
    const sender = { send: vi.fn(), isDestroyed: vi.fn(() => true) }

    mockSpawnPty.mockImplementation(async (_shell, _args, _cwd, hooks) => {
      hooks.onData?.(1, 'hello')
      hooks.onExit?.(1, 0)
      return { ok: true, data: { sessionId: 1 } }
    })

    await handler({ sender }, { shell: '/bin/bash', args: [], cwd: '/tmp' })

    expect(sender.send).not.toHaveBeenCalled()
  })

  it('registers pty:kill as invoke and returns killPtySession result', async () => {
    registerPtyIpcHandlers()
    const killCall = mockIpcMainHandle.mock.calls.find(([channel]) => channel === 'pty:kill')
    expect(killCall).toBeDefined()
    const [, handler] = killCall!
    mockKillPtySession.mockReturnValue({ ok: true, data: undefined })

    const result = await handler({}, 2)

    expect(mockKillPtySession).toHaveBeenCalledWith(2)
    expect(result).toEqual({ ok: true, data: undefined })
  })

  it('registers pty:write and pty:resize as fire-and-forget listeners', () => {
    registerPtyIpcHandlers()
    expect(mockIpcMainOn).toHaveBeenCalledWith('pty:write', expect.any(Function))
    expect(mockIpcMainOn).toHaveBeenCalledWith('pty:resize', expect.any(Function))
  })

  it('forwards pty:write data to correct session', () => {
    registerPtyIpcHandlers()
    const writeCall = mockIpcMainOn.mock.calls.find(([channel]) => channel === 'pty:write')
    expect(writeCall).toBeDefined()
    const [, handler] = writeCall!

    handler({}, 1, 'echo hello\n')

    expect(mockWritePty).toHaveBeenCalledWith(1, 'echo hello\n')
  })

  it('validates pty:resize dimensions and rejects invalid values', () => {
    registerPtyIpcHandlers()
    const resizeCall = mockIpcMainOn.mock.calls.find(([channel]) => channel === 'pty:resize')
    expect(resizeCall).toBeDefined()
    const [, handler] = resizeCall!

    // Valid call - should forward to resizePty
    handler({}, 1, 120, 30)
    expect(mockResizePty).toHaveBeenCalledWith(1, 120, 30)

    // Invalid: zero cols
    mockResizePty.mockClear()
    handler({}, 1, 0, 30)
    expect(mockResizePty).not.toHaveBeenCalled()

    // Invalid: zero rows
    mockResizePty.mockClear()
    handler({}, 1, 80, 0)
    expect(mockResizePty).not.toHaveBeenCalled()

    // Invalid: negative cols
    mockResizePty.mockClear()
    handler({}, 1, -1, 30)
    expect(mockResizePty).not.toHaveBeenCalled()

    // Invalid: cols > 9999
    mockResizePty.mockClear()
    handler({}, 1, 10000, 30)
    expect(mockResizePty).not.toHaveBeenCalled()

    // Invalid: rows > 9999
    mockResizePty.mockClear()
    handler({}, 1, 80, 10000)
    expect(mockResizePty).not.toHaveBeenCalled()

    // Invalid: non-numeric sessionId
    mockResizePty.mockClear()
    handler({}, 'invalid', 80, 24)
    expect(mockResizePty).not.toHaveBeenCalled()

    // Invalid: non-numeric cols
    mockResizePty.mockClear()
    handler({}, 1, 'invalid', 24)
    expect(mockResizePty).not.toHaveBeenCalled()

    // Invalid: non-numeric rows
    mockResizePty.mockClear()
    handler({}, 1, 80, 'invalid')
    expect(mockResizePty).not.toHaveBeenCalled()

    // Invalid: float sessionId
    mockResizePty.mockClear()
    handler({}, 1.5, 80, 24)
    expect(mockResizePty).not.toHaveBeenCalled()

    // Invalid: NaN cols
    mockResizePty.mockClear()
    handler({}, 1, NaN, 24)
    expect(mockResizePty).not.toHaveBeenCalled()

    // Invalid: Infinity rows
    mockResizePty.mockClear()
    handler({}, 1, 80, Infinity)
    expect(mockResizePty).not.toHaveBeenCalled()
  })

  it('notifies renderer when spawnPty returns error', async () => {
    registerPtyIpcHandlers()

    const spawnCall = mockIpcMainHandle.mock.calls.find(([channel]) => channel === 'pty:spawn')
    expect(spawnCall).toBeDefined()
    const [, handler] = spawnCall!
    const sender = { send: vi.fn(), isDestroyed: vi.fn(() => false) }

    const errorResult = {
      ok: false,
      error: { code: 'SHELL_NOT_AVAILABLE', message: 'No shell found' }
    }
    mockSpawnPty.mockResolvedValue(errorResult)

    const result = await handler({ sender }, { shell: '/invalid', args: [], cwd: '/tmp' })

    expect(sender.send).toHaveBeenCalledWith('pty:spawn:error', errorResult.error)
    expect(result).toEqual(errorResult)
  })

  it('does not notify renderer of spawn error if sender is destroyed', async () => {
    registerPtyIpcHandlers()

    const spawnCall = mockIpcMainHandle.mock.calls.find(([channel]) => channel === 'pty:spawn')
    expect(spawnCall).toBeDefined()
    const [, handler] = spawnCall!
    const sender = { send: vi.fn(), isDestroyed: vi.fn(() => true) }

    const errorResult = {
      ok: false,
      error: { code: 'SHELL_NOT_AVAILABLE', message: 'No shell found' }
    }
    mockSpawnPty.mockResolvedValue(errorResult)

    await handler({ sender }, { shell: '/invalid', args: [], cwd: '/tmp' })

    expect(sender.send).not.toHaveBeenCalled()
  })

  describe('pty:data streaming (Story 2.6)', () => {
    it('sends data on per-session channel pty:data:${sessionId}', async () => {
      registerPtyIpcHandlers()
      const spawnCall = mockIpcMainHandle.mock.calls.find(([channel]) => channel === 'pty:spawn')
      expect(spawnCall).toBeDefined()
      const [, handler] = spawnCall!

      const sender = { send: vi.fn(), isDestroyed: vi.fn().mockReturnValue(false) }
      const event = { sender }

      // Capture hooks to simulate PTY data
      let capturedOnData: ((sessionId: number, data: string) => void) | undefined
      mockSpawnPty.mockImplementation(async (_shell, _args, _cwd, hooks) => {
        capturedOnData = hooks.onData
        return { ok: true, data: { sessionId: 42 } }
      })

      await handler(event, { shell: '/bin/bash', args: [], cwd: '/tmp' })

      // Simulate PTY output
      capturedOnData?.(42, 'hello world')

      // Verify per-session channel format
      expect(sender.send).toHaveBeenCalledWith('pty:data:42', 'hello world')
      // Verify NOT using generic channel
      expect(sender.send).not.toHaveBeenCalledWith('pty:data', expect.anything())
    })

    it('sends exit on per-session channel pty:exit:${sessionId}', async () => {
      registerPtyIpcHandlers()
      const spawnCall = mockIpcMainHandle.mock.calls.find(([channel]) => channel === 'pty:spawn')
      expect(spawnCall).toBeDefined()
      const [, handler] = spawnCall!

      const sender = { send: vi.fn(), isDestroyed: vi.fn().mockReturnValue(false) }
      const event = { sender }

      let capturedOnExit: ((sessionId: number, exitCode: number) => void) | undefined
      mockSpawnPty.mockImplementation(async (_shell, _args, _cwd, hooks) => {
        capturedOnExit = hooks.onExit
        return { ok: true, data: { sessionId: 42 } }
      })

      await handler(event, { shell: '/bin/bash', args: [], cwd: '/tmp' })

      // Simulate PTY exit
      capturedOnExit?.(42, 0)

      // Verify per-session channel format
      expect(sender.send).toHaveBeenCalledWith('pty:exit:42', 0)
    })

    it('does not send to destroyed WebContents sender (AC #5)', async () => {
      registerPtyIpcHandlers()
      const spawnCall = mockIpcMainHandle.mock.calls.find(([channel]) => channel === 'pty:spawn')
      expect(spawnCall).toBeDefined()
      const [, handler] = spawnCall!

      const sender = { send: vi.fn(), isDestroyed: vi.fn().mockReturnValue(true) }
      const event = { sender }

      let capturedOnData: ((sessionId: number, data: string) => void) | undefined
      mockSpawnPty.mockImplementation(async (_shell, _args, _cwd, hooks) => {
        capturedOnData = hooks.onData
        return { ok: true, data: { sessionId: 1 } }
      })

      await handler(event, { shell: '/bin/bash', args: [], cwd: '/tmp' })

      // Simulate PTY output while sender is destroyed
      capturedOnData?.(1, 'hello world')

      // sender.send should NOT be called when isDestroyed() returns true
      expect(sender.send).not.toHaveBeenCalled()
      // isDestroyed should have been checked
      expect(sender.isDestroyed).toHaveBeenCalled()
    })

    it('sends raw data string (not envelope object)', async () => {
      registerPtyIpcHandlers()
      const spawnCall = mockIpcMainHandle.mock.calls.find(([channel]) => channel === 'pty:spawn')
      expect(spawnCall).toBeDefined()
      const [, handler] = spawnCall!

      const sender = { send: vi.fn(), isDestroyed: vi.fn().mockReturnValue(false) }
      const event = { sender }

      let capturedOnData: ((sessionId: number, data: string) => void) | undefined
      mockSpawnPty.mockImplementation(async (_shell, _args, _cwd, hooks) => {
        capturedOnData = hooks.onData
        return { ok: true, data: { sessionId: 1 } }
      })

      await handler(event, { shell: '/bin/bash', args: [], cwd: '/tmp' })

      const rawData = 'terminal output line 1\nline 2\n'
      capturedOnData?.(1, rawData)

      // Verify raw string sent (not wrapped in object)
      expect(sender.send).toHaveBeenCalledWith('pty:data:1', rawData)
      const sendCall = sender.send.mock.calls.find(([channel]) => channel === 'pty:data:1')
      expect(sendCall).toBeDefined()
      const [, sentData] = sendCall!
      expect(typeof sentData).toBe('string')
      expect(sentData).toBe(rawData)
    })
  })
})
