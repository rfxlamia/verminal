import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ensureConfigDirectory, getConfigPath } from './config-manager'
import { app } from 'electron'
import { existsSync, rmSync, statSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// Mock app.getPath to use temp directory (static fallback, overridden in beforeEach)
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/mock/fallback'),
  },
}))

describe('config-manager', () => {
  let testHome: string

  beforeEach(() => {
    testHome = join(tmpdir(), 'verminal-test-' + Date.now())
    vi.mocked(app.getPath).mockImplementation((name: string) => {
      if (name === 'home') return testHome
      return `/mock/${name}`
    })
  })

  afterEach(() => {
    // Cleanup
    const configPath = join(testHome, '.verminal')
    if (existsSync(configPath)) {
      rmSync(configPath, { recursive: true, force: true })
    }
  })

  it('should create config directory with correct permissions', () => {
    const result = ensureConfigDirectory()
    expect(result.ok).toBe(true)
    expect(existsSync(join(testHome, '.verminal'))).toBe(true)

    // Unix permission check (skip on Windows)
    if (process.platform !== 'win32') {
      const stats = statSync(join(testHome, '.verminal'))
      expect(stats.mode & 0o777).toBe(0o700)
    }
  })

  it('should create subdirectories: layouts, logs, snapshots', () => {
    ensureConfigDirectory()
    expect(existsSync(join(testHome, '.verminal', 'layouts'))).toBe(true)
    expect(existsSync(join(testHome, '.verminal', 'logs'))).toBe(true)
    expect(existsSync(join(testHome, '.verminal', 'snapshots'))).toBe(true)
  })

  it('should handle concurrent directory creation gracefully', () => {
    // Simultaneous calls should not throw
    const results = [
      ensureConfigDirectory(),
      ensureConfigDirectory(),
      ensureConfigDirectory(),
    ]
    // All should succeed (mkdirSync with recursive: true handles this)
    results.forEach(r => expect(r.ok).toBe(true))
  })

  it('should not use tilde literal in path resolution', () => {
    const path = getConfigPath()
    expect(path).not.toContain('~')
    // Absolute path check (Unix only - Windows uses C:\ style)
    if (process.platform !== 'win32') {
      expect(path).toMatch(/^\//)
    } else {
      expect(path).toMatch(/^[A-Za-z]:\\/)
    }
  })
})
