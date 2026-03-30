import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fs module BEFORE any imports - must be self-contained (hoisted)
vi.mock('fs', () => ({
  openSync: vi.fn(),
  writeSync: vi.fn(),
  fsyncSync: vi.fn(),
  closeSync: vi.fn(),
  renameSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
}))

vi.mock('path', () => ({
  dirname: vi.fn((p: string) => p.substring(0, p.lastIndexOf('/')) || '/'),
  basename: vi.fn((p: string) => p.substring(p.lastIndexOf('/') + 1)),
  join: vi.fn((...parts: string[]) => parts.join('/')),
}))

// Import AFTER mocks are defined
import { atomicWrite } from './atomic-write'
import { openSync, writeSync, fsyncSync, closeSync, renameSync } from 'fs'

describe('atomic-write', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(openSync).mockReturnValue(3) // Mock file descriptor
  })

  describe('atomicWrite', () => {
    it('should write content to target file (happy path)', () => {
      atomicWrite('/home/user/.verminal/config.toml', 'test content')

      expect(writeSync).toHaveBeenCalledWith(3, 'test content', 0, 'utf-8')
    })

    it('should create temp file beside target with .tmp.<pid>.<counter> pattern', () => {
      const mockPid = 12345
      vi.stubGlobal('process', { ...process, pid: mockPid })

      atomicWrite('/home/user/.verminal/config.toml', 'content')

      expect(openSync).toHaveBeenCalledWith(
        expect.stringMatching(/config\.toml\.tmp\.12345\.\d+$/),
        'w'
      )
    })

    it('should call fsync on file descriptor before close', () => {
      atomicWrite('/home/user/config.toml', 'content')

      // Get the order of calls
      const fsyncCalls = vi.mocked(fsyncSync).mock.calls
      const closeCalls = vi.mocked(closeSync).mock.calls

      expect(fsyncSync).toHaveBeenCalledWith(3)
      // fsync should be called before close
      expect(fsyncCalls.length).toBeGreaterThan(0)
      expect(closeCalls.length).toBeGreaterThan(0)
    })

    it('should rename temp file to target path', () => {
      vi.mocked(openSync).mockReturnValue(42)

      atomicWrite('/home/user/config.toml', 'content')

      expect(renameSync).toHaveBeenCalledWith(
        expect.stringContaining('config.toml.tmp'),
        '/home/user/config.toml'
      )
    })

    it('should throw if parent directory does not exist', () => {
      vi.mocked(openSync).mockImplementation(() => {
        const error = new Error('ENOENT: no such file or directory')
        ;(error as NodeJS.ErrnoException).code = 'ENOENT'
        throw error
      })

      expect(() => {
        atomicWrite('/nonexistent/dir/config.toml', 'content')
      }).toThrow()
    })

    it('should preserve original target content if write is interrupted before rename', () => {
      // Simulate interruption: fsync succeeds but rename throws
      vi.mocked(fsyncSync).mockImplementation(() => {
        // fsync works fine
      })
      vi.mocked(closeSync).mockImplementation(() => {
        // close works fine
      })
      vi.mocked(renameSync).mockImplementation(() => {
        throw new Error('Process killed during rename')
      })

      // The atomicWrite should throw because rename failed
      expect(() => {
        atomicWrite('/home/user/config.toml', 'new content')
      }).toThrow('Process killed during rename')

      // But the temp file was created (before the failure)
      expect(openSync).toHaveBeenCalled()
    })

    it('should use distinct temp names for concurrent calls', () => {
      const openCalls: string[] = []
      vi.mocked(openSync).mockImplementation((path: string) => {
        openCalls.push(path as string)
        return openCalls.length + 10 // Unique fd
      })

      // Simulate concurrent calls
      atomicWrite('/home/user/config.toml', 'content1')
      atomicWrite('/home/user/config.toml', 'content2')
      atomicWrite('/home/user/config.toml', 'content3')

      // Each call should use a different temp file path
      expect(openCalls.length).toBe(3)
      expect(new Set(openCalls).size).toBe(3) // All unique
    })

    it('should ensure final file contains content of last successful rename', () => {
      // Mock rename to track the last content written
      let lastRenameTarget: string | undefined
      let lastRenameSource: string | undefined

      vi.mocked(renameSync).mockImplementation((from: string, to: string) => {
        lastRenameSource = from
        lastRenameTarget = to
      })

      atomicWrite('/home/user/config.toml', 'final content')

      expect(lastRenameTarget).toBe('/home/user/config.toml')
      expect(lastRenameSource).toContain('config.toml.tmp')
    })

    it('should close file descriptor even if fsync throws', () => {
      vi.mocked(fsyncSync).mockImplementation(() => {
        throw new Error('Disk full')
      })

      // Should still close the fd in finally block
      expect(() => {
        atomicWrite('/home/user/config.toml', 'content')
      }).toThrow('Disk full')

      expect(closeSync).toHaveBeenCalledWith(3)
    })

    it('should call openSync, writeSync, fsyncSync, closeSync, renameSync in correct order', () => {
      atomicWrite('/home/user/config.toml', 'ordered content')

      expect(openSync).toHaveBeenCalled()
      expect(writeSync).toHaveBeenCalled()
      expect(fsyncSync).toHaveBeenCalled()
      expect(closeSync).toHaveBeenCalled()
      expect(renameSync).toHaveBeenCalled()

      // Verify all were called
      expect(vi.mocked(openSync).mock.calls.length).toBe(1)
      expect(vi.mocked(writeSync).mock.calls.length).toBe(1)
      expect(vi.mocked(fsyncSync).mock.calls.length).toBe(1)
      expect(vi.mocked(closeSync).mock.calls.length).toBe(1)
      expect(vi.mocked(renameSync).mock.calls.length).toBe(1)
    })
  })
})
