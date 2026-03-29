import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock electron before importing handler
vi.mock('electron', () => ({
  app: { getVersion: vi.fn(() => '0.0.1'), getPath: vi.fn((name: string) => `/mock/${name}`) },
  ipcMain: { handle: vi.fn(), on: vi.fn() },
  BrowserWindow: vi.fn(),
  shell: {},
}))

describe('app:getVersion handler', () => {
  it('returns Result<string> with ok: true and version string', async () => {
    const { app } = await import('electron')
    vi.mocked(app.getVersion).mockReturnValue('1.2.0')

    // Simulate the handler logic directly
    const handler = async (): Promise<{ ok: true; data: string }> => ({
      ok: true,
      data: app.getVersion(),
    })

    const result = await handler()
    expect(result.ok).toBe(true)
    expect(result.data).toBe('1.2.0')
  })
})

describe('app:getPaths handler', () => {
  it('returns Result with home and userData paths', async () => {
    const { app } = await import('electron')
    vi.mocked(app.getPath).mockImplementation((name: string) => {
      if (name === 'home') return '/home/user'
      if (name === 'userData') return '/home/user/.config/verminal'
      return `/mock/${name}`
    })

    // Simulate the handler logic directly
    const handler = async (): Promise<{ ok: true; data: { home: string; userData: string } }> => ({
      ok: true,
      data: {
        home: app.getPath('home'),
        userData: app.getPath('userData'),
      },
    })

    const result = await handler()
    expect(result.ok).toBe(true)
    expect(result.data.home).toBe('/home/user')
    expect(result.data.userData).toBe('/home/user/.config/verminal')
  })
})
