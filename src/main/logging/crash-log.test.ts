import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Electron BEFORE any imports
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/home/testuser'),
    getVersion: vi.fn().mockReturnValue('1.0.0-test')
  }
}))

// Mock fs module
vi.mock('fs', () => ({
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(true)
}))

// Mock os module
vi.mock('os', () => ({
  homedir: vi.fn().mockReturnValue('/fallback/home')
}))

// Mock config-manager
vi.mock('../config-manager', () => ({
  getLogsPath: vi.fn().mockReturnValue('/home/testuser/.verminal/logs')
}))

// Import AFTER mocks are defined
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { app } from 'electron'
import { getLogsPath } from '../config-manager'
import {
  formatCrashLog,
  writeCrashLog,
  initCrashLogger,
  resetCrashLoggerForTests
} from './crash-log'

describe('crash-log', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetCrashLoggerForTests()
    // Default mock returns
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(getLogsPath).mockReturnValue('/home/testuser/.verminal/logs')
    vi.mocked(app.getVersion).mockReturnValue('1.0.0-test')
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('formatCrashLog', () => {
    it('should include error message and stack trace', () => {
      const error = new Error('Test error message')
      error.stack = 'Error: Test error message\n    at Test.method (/test/file.ts:1:1)'

      const result = formatCrashLog(error)

      expect(result).toContain('Error: Test error message')
      expect(result).toContain('Stack:')
      expect(result).toContain('at Test.method')
    })

    it('should include app version from electron app', () => {
      const error = new Error('Test')
      const result = formatCrashLog(error)

      expect(result).toContain('App Version: 1.0.0-test')
      expect(app.getVersion).toHaveBeenCalled()
    })

    it('should fallback to unknown app version when app.getVersion throws', () => {
      vi.mocked(app.getVersion).mockImplementation(() => {
        throw new Error('app not ready')
      })

      const result = formatCrashLog(new Error('Test'))
      expect(result).toContain('App Version: unknown')
    })

    it('should include electron version', () => {
      const error = new Error('Test')
      const result = formatCrashLog(error)

      expect(result).toContain(`Electron: ${process.versions.electron}`)
    })

    it('should include platform and arch', () => {
      const error = new Error('Test')
      const result = formatCrashLog(error)

      expect(result).toContain(`Platform: ${process.platform} ${process.arch}`)
    })

    it('should include Node.js version', () => {
      const error = new Error('Test')
      const result = formatCrashLog(error)

      expect(result).toContain(`Node.js: ${process.version}`)
    })

    it('should include ISO 8601 timestamp', () => {
      const error = new Error('Test')
      const result = formatCrashLog(error)

      // Should contain Timestamp line with valid ISO date
      expect(result).toMatch(/Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/)
    })

    it('should format with clear section headers', () => {
      const error = new Error('Test')
      const result = formatCrashLog(error)

      expect(result).toContain('=== VERMINAL CRASH LOG ===')
      expect(result).toContain('========================')
    })
  })

  describe('writeCrashLog', () => {
    it('should use crash-${Date.now()}.log filename format', () => {
      const mockDateNow = 1711700000000
      vi.spyOn(Date, 'now').mockReturnValue(mockDateNow)

      const error = new Error('Test')
      writeCrashLog(error)

      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('crash-1711700000000.log'),
        expect.any(String),
        'utf-8'
      )
    })

    it('should write to logs directory from getLogsPath()', () => {
      const error = new Error('Test')
      writeCrashLog(error)

      expect(getLogsPath).toHaveBeenCalled()
      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('/home/testuser/.verminal/logs'),
        expect.any(String),
        'utf-8'
      )
    })

    it('should write synchronously using writeFileSync', () => {
      const error = new Error('Test')
      writeCrashLog(error)

      expect(writeFileSync).toHaveBeenCalledTimes(1)
    })

    it('should create logs directory if it does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(getLogsPath).mockReturnValue('/home/testuser/.verminal/logs')

      const error = new Error('Test')
      writeCrashLog(error)

      expect(existsSync).toHaveBeenCalledWith('/home/testuser/.verminal/logs')
      expect(mkdirSync).toHaveBeenCalledWith('/home/testuser/.verminal/logs', { recursive: true })
    })

    it('should not create directory if it already exists', () => {
      vi.mocked(existsSync).mockReturnValue(true)

      const error = new Error('Test')
      writeCrashLog(error)

      expect(mkdirSync).not.toHaveBeenCalled()
    })

    it('should use fallback path when getLogsPath throws', () => {
      vi.mocked(getLogsPath).mockImplementation(() => {
        throw new Error('app not ready')
      })

      const error = new Error('Test')
      writeCrashLog(error)

      // Should still write using fallback (any .verminal/logs path is acceptable)
      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringMatching(/\.verminal\/logs\/crash-\d+\.log$/),
        expect.any(String),
        'utf-8'
      )
    })

    it('should silently swallow errors if write fails completely', () => {
      vi.mocked(writeFileSync).mockImplementation(() => {
        throw new Error('Disk full')
      })

      const error = new Error('Test')
      // Should not throw
      expect(() => writeCrashLog(error)).not.toThrow()
    })

    it('should write formatted crash log content', () => {
      const error = new Error('Test error')
      writeCrashLog(error)

      const calls = vi.mocked(writeFileSync).mock.calls
      expect(calls.length).toBeGreaterThan(0)
      const writtenContent = calls[0][1] as string
      expect(writtenContent).toContain('=== VERMINAL CRASH LOG ===')
      expect(writtenContent).toContain('Test error')
    })
  })

  describe('initCrashLogger', () => {
    it('should register uncaughtException handler', () => {
      const processOnSpy = vi.spyOn(process, 'on')

      initCrashLogger()

      expect(processOnSpy).toHaveBeenCalledWith('uncaughtException', expect.any(Function))
    })

    it('should register unhandledRejection handler', () => {
      const processOnSpy = vi.spyOn(process, 'on')

      initCrashLogger()

      expect(processOnSpy).toHaveBeenCalledWith('unhandledRejection', expect.any(Function))
    })

    it('should be idempotent and avoid duplicate listener registration', () => {
      const processOnSpy = vi.spyOn(process, 'on')

      initCrashLogger()
      initCrashLogger()

      const uncaughtCalls = processOnSpy.mock.calls.filter(
        ([event]) => event === 'uncaughtException'
      )
      const rejectionCalls = processOnSpy.mock.calls.filter(
        ([event]) => event === 'unhandledRejection'
      )

      expect(uncaughtCalls).toHaveLength(1)
      expect(rejectionCalls).toHaveLength(1)
    })

    it('should write crash log on uncaught exception', () => {
      vi.spyOn(process, 'on')
      initCrashLogger()

      const handler = vi
        .mocked(process.on)
        .mock.calls.find(([event]) => event === 'uncaughtException')?.[1] as (error: Error) => void

      expect(handler).toBeDefined()

      const testError = new Error('Uncaught test error')
      // The handler re-throws, so we expect it to throw
      expect(() => handler(testError)).toThrow('Uncaught test error')

      // Verify log was written before re-throw
      expect(writeFileSync).toHaveBeenCalled()
    })

    it('should write crash log on unhandled rejection', () => {
      vi.spyOn(process, 'on')
      initCrashLogger()

      const handler = vi
        .mocked(process.on)
        .mock.calls.find(([event]) => event === 'unhandledRejection')?.[1] as (
        reason: unknown
      ) => void

      expect(handler).toBeDefined()

      const testError = new Error('Unhandled rejection')
      handler(testError)

      expect(writeFileSync).toHaveBeenCalled()
      expect(process.exit).toHaveBeenCalledWith(1)
      expect(process.exitCode).toBe(1)
    })
  })
})
