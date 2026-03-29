import { describe, it, expect, vi, beforeEach } from 'vitest'

// Import logger - console will be spied on in beforeEach
import { logger } from './logger'

describe('logger', () => {
  let mockConsoleLog: ReturnType<typeof vi.spyOn>
  let mockConsoleDebug: ReturnType<typeof vi.spyOn>
  let mockConsoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Create fresh spies for each test
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
    mockConsoleDebug = vi.spyOn(console, 'debug').mockImplementation(() => {})
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('debug', () => {
    it('should call console.debug with formatted message', () => {
      logger.debug('Test debug message')

      expect(mockConsoleDebug).toHaveBeenCalledWith('[DEBUG] Test debug message', '')
    })

    it('should include optional data', () => {
      logger.debug('Debug with data', { key: 'value' })

      expect(mockConsoleDebug).toHaveBeenCalledWith('[DEBUG] Debug with data', { key: 'value' })
    })
  })

  describe('info', () => {
    it('should call console.log with formatted message', () => {
      logger.info('Test info message')

      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO] Test info message', '')
    })

    it('should include optional data', () => {
      logger.info('Info with data', { count: 42 })

      expect(mockConsoleLog).toHaveBeenCalledWith('[INFO] Info with data', { count: 42 })
    })
  })

  describe('error', () => {
    it('should call console.error with formatted message', () => {
      logger.error('Test error message')

      expect(mockConsoleError).toHaveBeenCalledWith('[ERROR] Test error message', '')
    })

    it('should include optional error data', () => {
      const err = new Error('Something failed')
      logger.error('Error with details', err)

      expect(mockConsoleError).toHaveBeenCalledWith('[ERROR] Error with details', err)
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
})
