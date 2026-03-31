import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted mock definitions
const { mockGetPreferredShell, mockExistsSync, mockStatSync, mockAccessSync } = vi.hoisted(() => ({
  mockGetPreferredShell: vi.fn(),
  mockExistsSync: vi.fn(),
  mockStatSync: vi.fn(),
  mockAccessSync: vi.fn()
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
  clearAllSessions
} from './pty-manager'

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

      const result = await spawnPty('/valid/shell')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.shell).toBe('/valid/shell')
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
        throw new Error('Permission denied')
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

      const result = await spawnPty('  /bin/zsh  ')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.shell).toBe('/bin/zsh')
      }
    })

    it('uses provided shell when available', async () => {
      const result = await spawnPty('/bin/zsh')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.shell).toBe('/bin/zsh')
        expect(result.data.sessionId).toBeGreaterThan(0)
      }
    })

    it('auto-detects shell when not provided', async () => {
      mockGetPreferredShell.mockReturnValue('/bin/bash')

      const result = await spawnPty()

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.shell).toBe('/bin/bash')
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

      const result = await spawnPty('/bin/zsh', '/custom/path')

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

      const result = await spawnPty('/bin/zsh', '/nonexistent/path')

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

      const result = await spawnPty('/bin/zsh', '/test/path')

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
    it('removes session and returns true', async () => {
      mockExistsSync.mockReturnValue(true)
      mockAccessSync.mockReturnValue(undefined)

      const result = await spawnPty('/bin/zsh')

      expect(result.ok).toBe(true)
      if (result.ok) {
        const removed = killSession(result.data.sessionId)
        expect(removed).toBe(true)
        expect(getSession(result.data.sessionId)).toBeUndefined()
      }
    })

    it('returns false for non-existent session', () => {
      const removed = killSession(999)
      expect(removed).toBe(false)
    })
  })

  describe('getActiveSessionIds', () => {
    it('returns empty array when no sessions', () => {
      expect(getActiveSessionIds()).toEqual([])
    })

    it('returns all active session IDs', async () => {
      mockExistsSync.mockReturnValue(true)
      mockAccessSync.mockReturnValue(undefined)

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
})
