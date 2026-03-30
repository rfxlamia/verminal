import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock runtime-log BEFORE importing logger
vi.mock('./runtime-log', () => ({
  appendRuntimeLog: vi.fn(),
}))

// Import AFTER mocks
import { logger } from './logger'
import { appendRuntimeLog } from './runtime-log'

describe('logger', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(appendRuntimeLog).mockImplementation(() => {})
  })

  describe('debug', () => {
    it('should call appendRuntimeLog with debug level', () => {
      logger.debug('Test debug message')

      expect(appendRuntimeLog).toHaveBeenCalledWith('debug', 'Test debug message')
    })

    it('should include optional data as JSON', () => {
      logger.debug('Debug with data', { key: 'value' })

      expect(appendRuntimeLog).toHaveBeenCalledWith(
        'debug',
        'Debug with data {"key":"value"}'
      )
    })
  })

  describe('info', () => {
    it('should call appendRuntimeLog with info level', () => {
      logger.info('Test info message')

      expect(appendRuntimeLog).toHaveBeenCalledWith('info', 'Test info message')
    })

    it('should include optional data as JSON', () => {
      logger.info('Info with data', { count: 42 })

      expect(appendRuntimeLog).toHaveBeenCalledWith(
        'info',
        'Info with data {"count":42}'
      )
    })
  })

  describe('error', () => {
    it('should call appendRuntimeLog with error level', () => {
      logger.error('Test error message')

      expect(appendRuntimeLog).toHaveBeenCalledWith('error', 'Test error message')
    })

    it('should include optional error data as JSON', () => {
      const err = new Error('Something failed')
      logger.error('Error with details', err)

      expect(appendRuntimeLog).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('Error with details')
      )
      expect(appendRuntimeLog).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('Something failed')
      )
    })
  })

  describe('logger structure', () => {
    it('should export logger with all required methods', () => {
      expect(logger).toHaveProperty('debug')
      expect(logger).toHaveProperty('info')
      expect(logger).toHaveProperty('error')

      expect(typeof logger.debug).toBe('function')
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.error).toBe('function')
    })
  })

  describe('fallback behavior', () => {
    it('should fallback to console.debug when appendRuntimeLog throws', () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
      vi.mocked(appendRuntimeLog).mockImplementation(() => {
        throw new Error('Logs directory not ready')
      })

      logger.debug('Fallback test')

      expect(consoleSpy).toHaveBeenCalledWith('[DEBUG] Fallback test')
    })

    it('should fallback to console.log when appendRuntimeLog throws', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      vi.mocked(appendRuntimeLog).mockImplementation(() => {
        throw new Error('Logs directory not ready')
      })

      logger.info('Fallback test')

      expect(consoleSpy).toHaveBeenCalledWith('[INFO] Fallback test')
    })

    it('should fallback to console.error when appendRuntimeLog throws', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(appendRuntimeLog).mockImplementation(() => {
        throw new Error('Logs directory not ready')
      })

      logger.error('Fallback test')

      expect(consoleSpy).toHaveBeenCalledWith('[ERROR] Fallback test')
    })
  })
})
