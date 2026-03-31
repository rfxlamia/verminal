import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted mock definitions
const { mockDetectShells } = vi.hoisted(() => ({
  mockDetectShells: vi.fn()
}))

vi.mock('./shell-detector', () => ({
  detectShells: mockDetectShells
}))

import { handleShellDetect } from './shell-manager'

describe('shell-manager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns success Result with shells when shells are detected', async () => {
    mockDetectShells.mockReturnValue(['/bin/zsh', '/bin/bash', '/bin/sh'])

    const result = await handleShellDetect()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual(['/bin/zsh', '/bin/bash', '/bin/sh'])
    }
  })

  it('returns error Result with SHELL_NOT_AVAILABLE code when no shells found', async () => {
    mockDetectShells.mockReturnValue([])

    const result = await handleShellDetect()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('SHELL_NOT_AVAILABLE')
      expect(result.error.message).toBe(
        'No valid shell found. Please configure shell path in config.'
      )
    }
  })

  it('returns single shell in array when only one shell detected', async () => {
    mockDetectShells.mockReturnValue(['/bin/bash'])

    const result = await handleShellDetect()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual(['/bin/bash'])
    }
  })
})
