import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockExistsSync, mockAccessSync } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockAccessSync: vi.fn()
}))

vi.mock('node:fs', () => ({
  existsSync: mockExistsSync,
  accessSync: mockAccessSync,
  constants: {
    X_OK: 1
  }
}))

import { isExecutable } from './fs-utils'

describe('fs-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isExecutable', () => {
    it('returns false when path does not exist', () => {
      mockExistsSync.mockReturnValue(false)

      const result = isExecutable('/nonexistent/file')

      expect(result).toBe(false)
      expect(mockExistsSync).toHaveBeenCalledWith('/nonexistent/file')
    })

    it('returns false when path exists but is not executable', () => {
      mockExistsSync.mockReturnValue(true)
      mockAccessSync.mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const result = isExecutable('/not/executable')

      expect(result).toBe(false)
      expect(mockAccessSync).toHaveBeenCalledWith('/not/executable', 1) // X_OK = 1
    })

    it('returns true when path exists and is executable', () => {
      mockExistsSync.mockReturnValue(true)
      mockAccessSync.mockReturnValue(undefined)

      const result = isExecutable('/bin/bash')

      expect(result).toBe(true)
      expect(mockExistsSync).toHaveBeenCalledWith('/bin/bash')
      expect(mockAccessSync).toHaveBeenCalledWith('/bin/bash', 1)
    })

    it('uses defense-in-depth: checks existence before permissions', () => {
      mockExistsSync.mockReturnValue(false)

      isExecutable('/some/path')

      // Should not call accessSync if existsSync returns false
      expect(mockAccessSync).not.toHaveBeenCalled()
    })
  })
})
