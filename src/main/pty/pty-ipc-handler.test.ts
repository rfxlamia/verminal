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

  it('notifies renderer when spawnPty returns error', async () => {
    registerPtyIpcHandlers()

    const spawnCall = mockIpcMainHandle.mock.calls.find(([channel]) => channel === 'pty:spawn')
    expect(spawnCall).toBeDefined()
    const [, handler] = spawnCall!
    const sender = { send: vi.fn(), isDestroyed: vi.fn(() => false) }

    const errorResult = { ok: false, error: { code: 'SHELL_NOT_AVAILABLE', message: 'No shell found' } }
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

    const errorResult = { ok: false, error: { code: 'SHELL_NOT_AVAILABLE', message: 'No shell found' } }
    mockSpawnPty.mockResolvedValue(errorResult)

    await handler({ sender }, { shell: '/invalid', args: [], cwd: '/tmp' })

    expect(sender.send).not.toHaveBeenCalled()
  })
})
