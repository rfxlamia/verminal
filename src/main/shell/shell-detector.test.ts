import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted mock definitions (project convention)
const { mockExistsSync, mockAccessSync, mockPlatform } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockAccessSync: vi.fn(),
  mockPlatform: vi.fn().mockReturnValue('linux')
}))

vi.mock('node:fs', () => ({
  existsSync: mockExistsSync,
  accessSync: mockAccessSync,
  constants: {
    X_OK: 1
  }
}))

vi.mock('node:os', () => ({
  platform: mockPlatform
}))

import { detectShells, getPreferredShell } from './shell-detector'

describe('shell-detector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.SHELL
    // Default: files exist and are executable
    mockExistsSync.mockReturnValue(true)
    mockAccessSync.mockReturnValue(undefined)
  })

  it('returns array with $SHELL as first element when set and executable', () => {
    process.env.SHELL = '/bin/zsh'

    const result = detectShells()

    expect(result[0]).toBe('/bin/zsh')
    expect(mockExistsSync).toHaveBeenCalledWith('/bin/zsh')
    expect(mockAccessSync).toHaveBeenCalledWith('/bin/zsh', 1)
  })

  it('falls back to /bin/bash when $SHELL not set and bash is executable', () => {
    mockExistsSync.mockImplementation((path: string) => path === '/bin/bash')
    mockAccessSync.mockImplementation((path: string) => {
      if (path !== '/bin/bash') throw new Error('Not executable')
    })

    const result = detectShells()

    expect(result[0]).toBe('/bin/bash')
  })

  it('falls back to /bin/sh when neither $SHELL nor bash is executable', () => {
    mockExistsSync.mockImplementation((path: string) => path === '/bin/sh')
    mockAccessSync.mockImplementation((path: string) => {
      if (path !== '/bin/sh') throw new Error('Not executable')
    })

    const result = detectShells()

    expect(result[0]).toBe('/bin/sh')
  })

  it('filters out non-existent paths', () => {
    process.env.SHELL = '/nonexistent/shell'
    mockExistsSync.mockReturnValue(false)

    const result = detectShells()

    expect(result).toEqual([])
  })

  it('filters out paths that exist but are not executable', () => {
    process.env.SHELL = '/bin/not-executable'
    mockExistsSync.mockReturnValue(true)
    mockAccessSync.mockImplementation(() => {
      throw new Error('Permission denied')
    })

    const result = detectShells()

    expect(result).toEqual([])
  })

  it('returns empty array when no shells found', () => {
    mockExistsSync.mockReturnValue(false)

    const result = detectShells()

    expect(result).toEqual([])
  })

  it('getPreferredShell returns first valid shell or null', () => {
    mockExistsSync.mockImplementation((path: string) => path === '/bin/bash')
    mockAccessSync.mockImplementation((path: string) => {
      if (path !== '/bin/bash') throw new Error('Not executable')
    })

    expect(getPreferredShell()).toBe('/bin/bash')

    mockExistsSync.mockReturnValue(false)
    expect(getPreferredShell()).toBeNull()
  })

  it('uses macOS shell paths on darwin platform', () => {
    mockPlatform.mockReturnValue('darwin')
    mockExistsSync.mockImplementation((path: string) => path === '/bin/zsh')
    mockAccessSync.mockImplementation((path: string) => {
      if (path !== '/bin/zsh') throw new Error('Not executable')
    })

    const result = detectShells()

    expect(result[0]).toBe('/bin/zsh')
  })

  it('uses Linux shell paths on linux platform', () => {
    mockPlatform.mockReturnValue('linux')
    mockExistsSync.mockImplementation((path: string) =>
      ['/bin/bash', '/usr/bin/bash', '/bin/zsh', '/usr/bin/zsh', '/bin/sh'].includes(path)
    )

    const result = detectShells()

    // Linux order: bash variants first, then zsh variants, then sh
    expect(result).toContain('/bin/bash')
    expect(result).toContain('/usr/bin/bash')
    expect(result).toContain('/bin/zsh')
    expect(result).toContain('/usr/bin/zsh')
    expect(result).toContain('/bin/sh')
  })

  it('removes duplicates when $SHELL matches a fallback path', () => {
    process.env.SHELL = '/bin/bash'
    mockPlatform.mockReturnValue('linux')
    mockExistsSync.mockImplementation((path: string) =>
      ['/bin/bash', '/usr/bin/bash', '/bin/zsh'].includes(path)
    )

    const result = detectShells()

    // /bin/bash should appear only once, even though it's both $SHELL and in LINUX_SHELL_PATHS
    const bashCount = result.filter((s) => s === '/bin/bash').length
    expect(bashCount).toBe(1)
    expect(result[0]).toBe('/bin/bash')
  })
})
