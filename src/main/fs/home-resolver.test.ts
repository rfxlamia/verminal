import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Electron BEFORE any imports
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/home/testuser'),
  },
}))

// Import AFTER mocks are defined
import { app } from 'electron'
import { resolveHome } from './home-resolver'

describe('home-resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(app.getPath).mockReturnValue('/home/testuser')
  })

  describe('resolveHome', () => {
    it('should return app.getPath("home")', () => {
      const result = resolveHome()

      expect(app.getPath).toHaveBeenCalledWith('home')
      expect(result).toBe('/home/testuser')
    })

    it('should return path containing no literal tilde character', () => {
      const result = resolveHome()

      expect(result).not.toContain('~')
    })

    it('should return same value when called multiple times (idempotent)', () => {
      const first = resolveHome()
      const second = resolveHome()

      expect(first).toBe(second)
      expect(app.getPath).toHaveBeenCalledTimes(2)
    })

    it('should return absolute path from electron app', () => {
      vi.mocked(app.getPath).mockReturnValue('/home/v')

      const result = resolveHome()

      expect(result).toBe('/home/v')
      expect(result.startsWith('/')).toBe(true)
    })
  })
})
