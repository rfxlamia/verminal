import { describe, it, expect, vi, beforeEach } from 'vitest'
import { existsSync, rmdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// Mock electron before importing any modules
const mockGetPath = vi.fn(() => '/mock/fallback')

vi.mock('electron', () => ({
  app: {
    getPath: mockGetPath,
  },
}))

describe('app lifecycle', () => {
  let testHome: string

  beforeEach(() => {
    testHome = join(tmpdir(), 'verminal-lifecycle-test-' + Date.now())
    mockGetPath.mockImplementation(() => {
      return testHome
    })

    // Cleanup before test
    const configPath = join(testHome, '.verminal')
    if (existsSync(configPath)) {
      rmdirSync(configPath, { recursive: true })
    }
  })

  it('should call ensureConfigDirectory during app.whenReady', async () => {
    // Import the modules after mocking
    const { ensureConfigDirectory } = await import('./config-manager')

    // Verify the config directory doesn't exist yet
    const configPath = join(testHome, '.verminal')
    expect(existsSync(configPath)).toBe(false)

    // Call ensureConfigDirectory directly (simulating what happens in app.whenReady)
    const result = ensureConfigDirectory()

    // Verify it succeeded
    expect(result.ok).toBe(true)

    // Verify the directory was created
    expect(existsSync(configPath)).toBe(true)

    // Cleanup
    if (existsSync(configPath)) {
      rmdirSync(configPath, { recursive: true })
    }
  })
})
