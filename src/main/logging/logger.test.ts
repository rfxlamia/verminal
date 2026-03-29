import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
const mockConsoleDebug = vi.spyOn(console, 'debug').mockImplementation(() => {})
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

// Import after mock setup
import { logger } from './logger'

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })


  afterEach(() => {
    vi.restoreAllMocks()
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
