import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies BEFORE imports
vi.mock('../fs/atomic-write', () => ({
  atomicWrite: vi.fn()
}))

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn()
}))

vi.mock('../config-manager', () => ({
  getLogsPath: vi.fn().mockReturnValue('/home/testuser/.verminal/logs')
}))

vi.mock('path', () => ({
  join: vi.fn((...parts: string[]) => parts.join('/'))
}))

// Import AFTER mocks
import { appendRuntimeLog } from './runtime-log'
import { atomicWrite } from '../fs/atomic-write'
import { existsSync, readFileSync } from 'fs'
import { getLogsPath } from '../config-manager'

describe('runtime-log', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getLogsPath).mockReturnValue('/home/testuser/.verminal/logs')
    vi.mocked(existsSync).mockReturnValue(false)
    vi.mocked(readFileSync).mockReturnValue('')
    vi.mocked(atomicWrite).mockImplementation(() => {})
  })

  describe('appendRuntimeLog', () => {
    it('should write to ~/.verminal/logs/verminal.log', () => {
      appendRuntimeLog('info', 'test message')

      expect(getLogsPath).toHaveBeenCalled()
      expect(atomicWrite).toHaveBeenCalledWith(
        expect.stringContaining('verminal.log'),
        expect.any(String)
      )
    })

    it('should format log line as [TIMESTAMP] [LEVEL] message\\n', () => {
      const mockDate = new Date('2024-03-30T12:00:00.000Z')
      vi.useFakeTimers({ shouldAdvanceTime: false })
      vi.setSystemTime(mockDate)

      appendRuntimeLog('info', 'test message')

      const callArgs = vi.mocked(atomicWrite).mock.calls[0]
      const content = callArgs[1] as string

      expect(content).toMatch(
        /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] test message\n$/
      )

      vi.useRealTimers()
    })

    it('should use atomicWrite for writing', () => {
      appendRuntimeLog('info', 'test message')

      expect(atomicWrite).toHaveBeenCalledTimes(1)
    })

    it('should append to existing file content', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue('[2024-03-30T10:00:00.000Z] [DEBUG] previous log\n')

      const mockDate = new Date('2024-03-30T12:00:00.000Z')
      vi.useFakeTimers({ shouldAdvanceTime: false })
      vi.setSystemTime(mockDate)

      appendRuntimeLog('info', 'new message')

      const callArgs = vi.mocked(atomicWrite).mock.calls[0]
      const content = callArgs[1] as string

      expect(content).toContain('[DEBUG] previous log')
      expect(content).toContain('[INFO] new message')

      vi.useRealTimers()
    })

    it('should throw if logs directory does not exist', () => {
      vi.mocked(atomicWrite).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory')
      })

      expect(() => {
        appendRuntimeLog('info', 'test')
      }).toThrow()
    })

    it('should format debug level correctly', () => {
      const mockDate = new Date('2024-03-30T12:00:00.000Z')
      vi.useFakeTimers({ shouldAdvanceTime: false })
      vi.setSystemTime(mockDate)

      appendRuntimeLog('debug', 'debug message')

      const callArgs = vi.mocked(atomicWrite).mock.calls[0]
      const content = callArgs[1] as string

      expect(content).toContain('[DEBUG] debug message')

      vi.useRealTimers()
    })

    it('should format error level correctly', () => {
      const mockDate = new Date('2024-03-30T12:00:00.000Z')
      vi.useFakeTimers({ shouldAdvanceTime: false })
      vi.setSystemTime(mockDate)

      appendRuntimeLog('error', 'error message')

      const callArgs = vi.mocked(atomicWrite).mock.calls[0]
      const content = callArgs[1] as string

      expect(content).toContain('[ERROR] error message')

      vi.useRealTimers()
    })

    it('should use ISO 8601 timestamp format', () => {
      const mockDate = new Date('2024-03-30T15:30:45.123Z')
      vi.useFakeTimers({ shouldAdvanceTime: false })
      vi.setSystemTime(mockDate)

      appendRuntimeLog('info', 'test')

      const callArgs = vi.mocked(atomicWrite).mock.calls[0]
      const content = callArgs[1] as string

      expect(content).toContain('[2024-03-30T15:30:45.123Z]')

      vi.useRealTimers()
    })

    it('should create new file if it does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      appendRuntimeLog('info', 'first message')

      const callArgs = vi.mocked(atomicWrite).mock.calls[0]
      const content = callArgs[1] as string

      // Should not try to read existing content
      expect(readFileSync).not.toHaveBeenCalled()
      // Should only contain the new message
      expect(content).toContain('[INFO] first message')
    })
  })
})
