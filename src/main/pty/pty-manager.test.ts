import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Hoisted mock definitions
const { mockGetPreferredShell, mockExistsSync, mockStatSync, mockAccessSync, mockPtySpawn } =
  vi.hoisted(() => ({
    mockGetPreferredShell: vi.fn(),
    mockExistsSync: vi.fn(),
    mockStatSync: vi.fn(),
    mockAccessSync: vi.fn(),
    mockPtySpawn: vi.fn()
  }))

// Mock node-pty
vi.mock('node-pty', () => ({
  spawn: mockPtySpawn
}))

vi.mock('../shell/shell-detector', () => ({
  getPreferredShell: mockGetPreferredShell
}))

vi.mock('node:fs', () => ({
  existsSync: mockExistsSync,
  statSync: mockStatSync,
  accessSync: mockAccessSync,
  constants: {
    X_OK: 1
  }
}))

import {
  spawnPty,
  getSession,
  killSession,
  getActiveSessionIds,
  clearAllSessions,
  writePty,
  resizePty,
  killPtySession
} from './pty-manager'

// Helper to create a fake PTY instance
interface FakePty {
  pid: number
  process: string
  cols: number
  rows: number
  write: ReturnType<typeof vi.fn>
  resize: ReturnType<typeof vi.fn>
  kill: ReturnType<typeof vi.fn>
  onData: (cb: (...args: unknown[]) => void) => void
  onExit: (cb: (...args: unknown[]) => void) => void
  emitData: (data: string) => void
  emitExit: (exitCode: number, signal?: number | string) => void
}

function createFakePty(): FakePty {
  const eventHandlers: { [key: string]: ((...args: unknown[]) => void)[] } = {}

  const pty = {
    pid: 12345,
    process: 'bash',
    cols: 80,
    rows: 24,
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
    onData: vi.fn((cb: (...args: unknown[]) => void) => {
      if (!eventHandlers['data']) eventHandlers['data'] = []
      eventHandlers['data'].push(cb)
    }),
    onExit: vi.fn((cb: (...args: unknown[]) => void) => {
      if (!eventHandlers['exit']) eventHandlers['exit'] = []
      eventHandlers['exit'].push(cb)
    }),
    emitData: (data: string) => {
      eventHandlers['data']?.forEach((cb) => cb(data))
    },
    emitExit: (exitCode: number, signal?: number | string) => {
      eventHandlers['exit']?.forEach((cb) => cb({ exitCode, signal }))
    }
  }

  return pty
}

describe('pty-manager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAllSessions()
    // Preserve HOME environment
    if (!process.env.HOME) {
      process.env.HOME = '/home/test'
    }
    // Default: directories exist
    mockExistsSync.mockReturnValue(true)
    mockStatSync.mockReturnValue({ isDirectory: () => true })
    // Use fake timers for buffered data tests
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('spawnPty', () => {
    beforeEach(() => {
      // Default: files exist and are executable
      mockExistsSync.mockReturnValue(true)
      mockAccessSync.mockReturnValue(undefined)
    })

    it('returns error when no shell is available and none provided', async () => {
      mockGetPreferredShell.mockReturnValue(null)

      const result = await spawnPty()

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('SHELL_NOT_AVAILABLE')
        expect(result.error.message).toBe(
          'No valid shell found. Please configure shell path in config.'
        )
      }
    })

    it('validates explicitly provided shell path exists and is executable', async () => {
      mockExistsSync.mockImplementation((path: string) => path === '/valid/shell')
      mockAccessSync.mockImplementation((path: string) => {
        if (path !== '/valid/shell') throw new Error('Not executable')
      })
      const fakePty = createFakePty()
      mockPtySpawn.mockReturnValue(fakePty)

      const result = await spawnPty('/valid/shell')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.sessionId).toBeGreaterThan(0)
      }
    })

    it('returns error when explicitly provided shell does not exist', async () => {
      mockExistsSync.mockReturnValue(false)

      const result = await spawnPty('/nonexistent/shell')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('SHELL_NOT_AVAILABLE')
        expect(result.error.message).toContain('Provided shell path is not valid')
      }
    })

    it('returns error when explicitly provided shell is not executable', async () => {
      mockExistsSync.mockReturnValue(true)
      mockAccessSync.mockImplementation(() => {
        const error = new Error('Permission denied') as NodeJS.ErrnoException
        error.code = 'EACCES'
        throw error
      })

      const result = await spawnPty('/not-executable')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('SHELL_NOT_AVAILABLE')
        expect(result.error.message).toContain('Provided shell path is not valid')
      }
    })

    it('trims whitespace from explicitly provided shell path', async () => {
      mockExistsSync.mockImplementation((path: string) => path === '/bin/zsh')
      mockAccessSync.mockImplementation((path: string) => {
        if (path !== '/bin/zsh') throw new Error('Not executable')
      })
      const fakePty = createFakePty()
      mockPtySpawn.mockReturnValue(fakePty)

      const result = await spawnPty('  /bin/zsh  ')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.sessionId).toBeGreaterThan(0)
      }
    })

    it('uses provided shell when available', async () => {
      const fakePty = createFakePty()
      mockPtySpawn.mockReturnValue(fakePty)

      const result = await spawnPty('/bin/zsh')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.sessionId).toBeGreaterThan(0)
      }
    })

    it('auto-detects shell when not provided', async () => {
      mockGetPreferredShell.mockReturnValue('/bin/bash')
      const fakePty = createFakePty()
      mockPtySpawn.mockReturnValue(fakePty)

      const result = await spawnPty()

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.sessionId).toBeGreaterThan(0)
      }
    })

    it('uses provided cwd when specified and valid', async () => {
      mockExistsSync.mockImplementation(
        (path: string) => path === '/custom/path' || path === '/bin/zsh'
      )
      mockStatSync.mockImplementation((path: string) => ({
        isDirectory: () => path === '/custom/path'
      }))
      mockAccessSync.mockImplementation((path: string) => {
        if (path !== '/bin/zsh') throw new Error('Not executable')
      })
      const fakePty = createFakePty()
      mockPtySpawn.mockReturnValue(fakePty)

      const result = await spawnPty('/bin/zsh', [], '/custom/path')

      expect(result.ok).toBe(true)
      if (result.ok) {
        const session = getSession(result.data.sessionId)
        expect(session?.cwd).toBe('/custom/path')
      }
    })

    it('falls back to HOME when provided cwd does not exist', async () => {
      process.env.HOME = '/home/testuser'
      mockExistsSync.mockImplementation(
        (path: string) => path === '/home/testuser' || path === '/bin/zsh'
      )
      mockStatSync.mockImplementation((path: string) => ({
        isDirectory: () => path === '/home/testuser'
      }))
      mockAccessSync.mockImplementation((path: string) => {
        if (path !== '/bin/zsh') throw new Error('Not executable')
      })
      const fakePty = createFakePty()
      mockPtySpawn.mockReturnValue(fakePty)

      const result = await spawnPty('/bin/zsh', [], '/nonexistent/path')

      expect(result.ok).toBe(true)
      if (result.ok) {
        const session = getSession(result.data.sessionId)
        expect(session?.cwd).toBe('/home/testuser')
      }
    })

    it('falls back to /tmp when HOME is not set and cwd not provided', async () => {
      delete process.env.HOME
      mockExistsSync.mockImplementation((path: string) => path === '/tmp' || path === '/bin/zsh')
      mockStatSync.mockImplementation((path: string) => ({
        isDirectory: () => path === '/tmp'
      }))
      mockAccessSync.mockImplementation((path: string) => {
        if (path !== '/bin/zsh') throw new Error('Not executable')
      })
      const fakePty = createFakePty()
      mockPtySpawn.mockReturnValue(fakePty)

      const result = await spawnPty('/bin/zsh')

      expect(result.ok).toBe(true)
      if (result.ok) {
        const session = getSession(result.data.sessionId)
        expect(session?.cwd).toBe('/tmp')
      }
    })

    it('falls back to / when all other options fail', async () => {
      delete process.env.HOME
      mockExistsSync.mockImplementation((path: string) => path === '/' || path === '/bin/zsh')
      mockStatSync.mockImplementation((path: string) => ({
        isDirectory: () => path === '/'
      }))
      mockAccessSync.mockImplementation((path: string) => {
        if (path !== '/bin/zsh') throw new Error('Not executable')
      })
      const fakePty = createFakePty()
      mockPtySpawn.mockReturnValue(fakePty)

      const result = await spawnPty('/bin/zsh')

      expect(result.ok).toBe(true)
      if (result.ok) {
        const session = getSession(result.data.sessionId)
        expect(session?.cwd).toBe('/')
      }
    })

    it('defaults to HOME directory when cwd not provided', async () => {
      process.env.HOME = '/home/testuser'
      mockExistsSync.mockImplementation(
        (path: string) => path === '/home/testuser' || path === '/bin/zsh'
      )
      mockStatSync.mockImplementation((path: string) => ({
        isDirectory: () => path === '/home/testuser'
      }))
      mockAccessSync.mockImplementation((path: string) => {
        if (path !== '/bin/zsh') throw new Error('Not executable')
      })
      const fakePty = createFakePty()
      mockPtySpawn.mockReturnValue(fakePty)

      const result = await spawnPty('/bin/zsh')

      expect(result.ok).toBe(true)
      if (result.ok) {
        const session = getSession(result.data.sessionId)
        expect(session?.cwd).toBe('/home/testuser')
      }
    })

    it('assigns unique session IDs', async () => {
      mockExistsSync.mockReturnValue(true)
      mockAccessSync.mockReturnValue(undefined)

      const pty1 = createFakePty()
      const pty2 = createFakePty()
      mockPtySpawn.mockReturnValueOnce(pty1).mockReturnValueOnce(pty2)

      const result1 = await spawnPty('/bin/zsh')
      const result2 = await spawnPty('/bin/bash')

      expect(result1.ok).toBe(true)
      expect(result2.ok).toBe(true)
      if (result1.ok && result2.ok) {
        expect(result1.data.sessionId).not.toBe(result2.data.sessionId)
      }
    })
  })

  describe('getSession', () => {
    it('returns session data for valid session ID', async () => {
      mockExistsSync.mockImplementation(
        (path: string) => path === '/test/path' || path === '/bin/zsh'
      )
      mockStatSync.mockImplementation((path: string) => ({
        isDirectory: () => path === '/test/path'
      }))
      mockAccessSync.mockImplementation((path: string) => {
        if (path !== '/bin/zsh') throw new Error('Not executable')
      })
      const fakePty = createFakePty()
      mockPtySpawn.mockReturnValue(fakePty)

      const result = await spawnPty('/bin/zsh', [], '/test/path')

      expect(result.ok).toBe(true)
      if (result.ok) {
        const session = getSession(result.data.sessionId)
        expect(session).toBeDefined()
        expect(session?.shell).toBe('/bin/zsh')
        expect(session?.cwd).toBe('/test/path')
      }
    })

    it('returns undefined for invalid session ID', () => {
      const session = getSession(999)
      expect(session).toBeUndefined()
    })
  })

  describe('killSession', () => {
    it('removes session and kills PTY process', async () => {
      mockExistsSync.mockReturnValue(true)
      mockAccessSync.mockReturnValue(undefined)
      const fakePty = createFakePty()
      mockPtySpawn.mockReturnValue(fakePty)

      const result = await spawnPty('/bin/zsh')

      expect(result.ok).toBe(true)
      if (result.ok) {
        killSession(result.data.sessionId)
        expect(fakePty.kill).toHaveBeenCalled()
        expect(getSession(result.data.sessionId)).toBeUndefined()
      }
    })

    it('handles non-existent session gracefully', () => {
      // killSession returns Result<void>, should return error for non-existent session
      const result = killSession(999)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('SESSION_NOT_FOUND')
      }
    })
  })

  describe('getActiveSessionIds', () => {
    it('returns empty array when no sessions', () => {
      expect(getActiveSessionIds()).toEqual([])
    })

    it('returns all active session IDs', async () => {
      mockExistsSync.mockReturnValue(true)
      mockAccessSync.mockReturnValue(undefined)
      mockGetPreferredShell.mockReturnValue('/bin/bash')

      const fakePty1 = createFakePty()
      const fakePty2 = createFakePty()
      mockPtySpawn.mockReturnValueOnce(fakePty1).mockReturnValueOnce(fakePty2)

      const result1 = await spawnPty('/bin/zsh')
      const result2 = await spawnPty('/bin/bash')

      expect(result1.ok).toBe(true)
      expect(result2.ok).toBe(true)
      if (result1.ok && result2.ok) {
        const ids = getActiveSessionIds()
        expect(ids).toContain(result1.data.sessionId)
        expect(ids).toContain(result2.data.sessionId)
        expect(ids.length).toBe(2)
      }
    })
  })

  // ============================================================================
  // NEW LIFECYCLE TESTS for real node-pty integration
  // ============================================================================

  describe('node-pty lifecycle', () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(true)
      mockAccessSync.mockReturnValue(undefined)
      mockGetPreferredShell.mockReturnValue('/bin/bash')
    })

    it('calls node-pty spawn with shell, args, cwd, and xterm defaults', async () => {
      const fakePty = createFakePty()
      mockPtySpawn.mockReturnValue(fakePty)

      const result = await spawnPty('/bin/bash', ['-l'], '/tmp')

      expect(result).toEqual({ ok: true, data: { sessionId: 1 } })
      expect(mockPtySpawn).toHaveBeenCalledWith(
        '/bin/bash',
        ['-l'],
        expect.objectContaining({
          cwd: '/tmp',
          cols: 80,
          rows: 24,
          name: 'xterm-256color'
        })
      )
    })

    it('does not consume a session id when node-pty spawn throws', async () => {
      mockPtySpawn.mockImplementationOnce(() => {
        throw new Error('spawn failed')
      })
      const fakePty = createFakePty()
      mockPtySpawn.mockReturnValueOnce(fakePty)

      const failed = await spawnPty()
      const succeeded = await spawnPty()

      expect(failed.ok).toBe(false)
      expect(succeeded).toEqual({ ok: true, data: { sessionId: 1 } })
    })

    it('writes to the correct PTY session only', async () => {
      const pty1 = createFakePty()
      const pty2 = createFakePty()
      mockPtySpawn.mockReturnValueOnce(pty1).mockReturnValueOnce(pty2)

      const r1 = await spawnPty('/bin/bash')
      const r2 = await spawnPty('/bin/bash')

      if (r1.ok && r2.ok) {
        writePty(r1.data.sessionId, 'ls\n')
        expect(pty1.write).toHaveBeenCalledWith('ls\n')
        expect(pty2.write).not.toHaveBeenCalled()
      }
    })

    it('buffers PTY data in ~8ms windows before invoking the hook', async () => {
      const fakePty = createFakePty()
      const onData = vi.fn()
      mockPtySpawn.mockReturnValue(fakePty)

      const result = await spawnPty('/bin/bash', [], '/tmp', { onData })
      expect(result.ok).toBe(true)

      fakePty.emitData('he')
      fakePty.emitData('llo')
      expect(onData).not.toHaveBeenCalled()

      vi.advanceTimersByTime(8)
      expect(onData).toHaveBeenCalledWith(1, 'hello')
    })

    it('flushes buffered data and cleans up exactly once on PTY exit', async () => {
      const fakePty = createFakePty()
      const onData = vi.fn()
      const onExit = vi.fn()
      mockPtySpawn.mockReturnValue(fakePty)

      const result = await spawnPty('/bin/bash', [], '/tmp', { onData, onExit })
      expect(result.ok).toBe(true)

      fakePty.emitData('partial')
      fakePty.emitExit(0)

      expect(onData).toHaveBeenCalledWith(1, 'partial')
      expect(onExit).toHaveBeenCalledWith(1, 0)
      expect(getSession(1)).toBeUndefined()
    })

    it('killPtySession sends PTY kill to the targeted session and returns Result<void>', async () => {
      const pty1 = createFakePty()
      const pty2 = createFakePty()
      mockPtySpawn.mockReturnValueOnce(pty1).mockReturnValueOnce(pty2)

      await spawnPty('/bin/bash')
      await spawnPty('/bin/bash')

      const result = killPtySession(1)

      expect(result).toEqual({ ok: true, data: undefined })
      expect(pty1.kill).toHaveBeenCalled()
      expect(pty2.kill).not.toHaveBeenCalled()
    })

    it('killSession remains quit-handler compatible by delegating to real PTY shutdown', async () => {
      const fakePty = createFakePty()
      mockPtySpawn.mockReturnValue(fakePty)

      await spawnPty('/bin/bash')
      killSession(1)

      expect(fakePty.kill).toHaveBeenCalled()
    })

    it('resizes the correct PTY session', async () => {
      const fakePty = createFakePty()
      mockPtySpawn.mockReturnValue(fakePty)

      const result = await spawnPty('/bin/bash')
      if (result.ok) {
        resizePty(result.data.sessionId, 120, 40)
        expect(fakePty.resize).toHaveBeenCalledWith(120, 40)
      }
    })

    it('returns error when killing non-existent session', () => {
      const result = killPtySession(999)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('SESSION_NOT_FOUND')
      }
    })

    it('clears pending timer on overflow flush (no double flush)', async () => {
      const fakePty = createFakePty()
      const onData = vi.fn()
      mockPtySpawn.mockReturnValue(fakePty)
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      const result = await spawnPty('/bin/bash', [], '/tmp', { onData })
      expect(result.ok).toBe(true)

      // Emit small chunk to start timer
      fakePty.emitData('small')
      expect(clearTimeoutSpy).not.toHaveBeenCalled()

      // Emit large chunk to trigger overflow flush
      const largeChunk = 'a'.repeat(100001)
      fakePty.emitData(largeChunk)

      // Timer should be cleared during overflow flush
      expect(clearTimeoutSpy).toHaveBeenCalled()

      // Advance past original timer - should NOT fire again
      vi.advanceTimersByTime(8)
      expect(onData).toHaveBeenCalledTimes(1) // Only the overflow flush
    })
  })

  describe('PTY data buffering (Story 2.6)', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      clearAllSessions()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('coalesces chunks in 8ms window into single onData call', async () => {
      const fakePty = createFakePty()
      const onData = vi.fn()
      mockPtySpawn.mockReturnValue(fakePty)

      const result = await spawnPty('/bin/bash', [], '/tmp', { onData })
      expect(result.ok).toBe(true)

      fakePty.emitData('chunk1')
      fakePty.emitData('chunk2')
      fakePty.emitData('chunk3')
      // Not called yet — still in buffer window
      expect(onData).not.toHaveBeenCalled()

      vi.advanceTimersByTime(8)
      // Called once with all concatenated data
      expect(onData).toHaveBeenCalledTimes(1)
      expect(onData).toHaveBeenCalledWith(1, 'chunk1chunk2chunk3')
    })

    it('flushes immediately when buffer exceeds 100KB', async () => {
      const fakePty = createFakePty()
      const onData = vi.fn()
      mockPtySpawn.mockReturnValue(fakePty)

      const result = await spawnPty('/bin/bash', [], '/tmp', { onData })
      expect(result.ok).toBe(true)

      // Emit 100001 bytes of data
      const largeChunk = 'a'.repeat(100001)
      fakePty.emitData(largeChunk)

      // Immediate flush — no timer needed
      expect(onData).toHaveBeenCalledTimes(1)
      expect(onData).toHaveBeenCalledWith(1, largeChunk)
    })

    it('does not set multiple timers for rapid chunks in same window', async () => {
      const fakePty = createFakePty()
      const onData = vi.fn()
      mockPtySpawn.mockReturnValue(fakePty)
      const timerSpy = vi.spyOn(global, 'setTimeout')

      const result = await spawnPty('/bin/bash', [], '/tmp', { onData })
      expect(result.ok).toBe(true)

      // Emit 10 chunks rapidly
      for (let i = 0; i < 10; i++) {
        fakePty.emitData(`chunk${i}`)
      }

      // Only 1 setTimeout should be set for the buffer window
      const dataBufferTimers = timerSpy.mock.calls.filter(
        // setTimeout calls for 8ms (DATA_BUFFER_INTERVAL_MS)
        ([, delay]) => delay === 8
      )
      expect(dataBufferTimers).toHaveLength(1)

      vi.advanceTimersByTime(8)
      expect(onData).toHaveBeenCalledTimes(1)
    })

    it('flushes remaining buffer before calling onExit', async () => {
      const fakePty = createFakePty()
      const onData = vi.fn()
      const onExit = vi.fn()
      const callOrder: string[] = []
      mockPtySpawn.mockReturnValue(fakePty)

      onData.mockImplementation(() => callOrder.push('onData'))
      onExit.mockImplementation(() => callOrder.push('onExit'))

      const result = await spawnPty('/bin/bash', [], '/tmp', { onData, onExit })
      expect(result.ok).toBe(true)

      fakePty.emitData('last-data')
      fakePty.emitExit(0)

      // Order MUST be: onData (flush) → onExit — architecture rule
      expect(callOrder).toEqual(['onData', 'onExit'])
      expect(onData).toHaveBeenCalledWith(1, 'last-data')
      expect(onExit).toHaveBeenCalledWith(1, 0)
    })

    it('clears flushTimer when session is killed via killPtySession', async () => {
      const fakePty = createFakePty()
      const onData = vi.fn()
      mockPtySpawn.mockReturnValue(fakePty)
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      const result = await spawnPty('/bin/bash', [], '/tmp', { onData })
      expect(result.ok).toBe(true)
      if (!result.ok) throw new Error('spawn failed')

      // Emit data to start the timer
      fakePty.emitData('data')
      expect(onData).not.toHaveBeenCalled() // timer pending

      // Kill before timer fires
      killPtySession(result.data.sessionId)

      // Timer should be cleared
      expect(clearTimeoutSpy).toHaveBeenCalled()
      // Advance time — no callback should fire
      vi.advanceTimersByTime(8)
      expect(onData).not.toHaveBeenCalled()
    })

    it('drops data for session that no longer exists', async () => {
      const fakePty = createFakePty()
      const onData = vi.fn()
      mockPtySpawn.mockReturnValue(fakePty)

      const result = await spawnPty('/bin/bash', [], '/tmp', { onData })
      expect(result.ok).toBe(true)
      if (!result.ok) throw new Error('spawn failed')

      // Kill session externally (removes from Map)
      killPtySession(result.data.sessionId)

      // Simulate late onData callback (race condition — session gone from Map)
      fakePty.emitData('late-data')

      vi.advanceTimersByTime(8)
      // onData should NOT be called — session guard `if (!sessions.has(sessionId)) return`
      expect(onData).not.toHaveBeenCalled()
    })

    it('starts new buffer window after flush', async () => {
      const fakePty = createFakePty()
      const onData = vi.fn()
      mockPtySpawn.mockReturnValue(fakePty)

      const result = await spawnPty('/bin/bash', [], '/tmp', { onData })
      expect(result.ok).toBe(true)

      // First window
      fakePty.emitData('batch1')
      vi.advanceTimersByTime(8)
      expect(onData).toHaveBeenCalledTimes(1)
      expect(onData).toHaveBeenCalledWith(1, 'batch1')

      // Second window — timer should have been reset
      fakePty.emitData('batch2')
      vi.advanceTimersByTime(8)
      expect(onData).toHaveBeenCalledTimes(2)
      expect(onData).toHaveBeenCalledWith(1, 'batch2')
    })

    it('handles empty buffer flush gracefully (no-op)', async () => {
      const fakePty = createFakePty()
      const onData = vi.fn()
      mockPtySpawn.mockReturnValue(fakePty)

      const result = await spawnPty('/bin/bash', [], '/tmp', { onData })
      expect(result.ok).toBe(true)

      // No data emitted, exit fires (empty buffer)
      fakePty.emitExit(0)

      // onData should NOT be called with empty string
      expect(onData).not.toHaveBeenCalled()
    })
  })
})
