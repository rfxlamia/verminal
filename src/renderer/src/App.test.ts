import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/svelte'
import App from './App.svelte'

// Mock ResizeObserver for jsdom
class MockResizeObserver {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  observe(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  unobserve(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  disconnect(): void {}
}

// @ts-expect-error - adding ResizeObserver to window
global.ResizeObserver = MockResizeObserver

describe('App.svelte', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.resetAllMocks()
  })

  it('renders panes from layoutState instead of a hardcoded array', async () => {
    // Mock successful API calls
    const mockShellDetect = vi.fn().mockResolvedValue({ ok: true, data: ['/bin/bash'] })
    const mockGetPaths = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { home: '/home/test', userData: '', logsDir: '' } })
    const mockPtySpawn = vi.fn().mockResolvedValue({ ok: true, data: { sessionId: 1 } })
    const mockOnShowDialog = vi.fn().mockReturnValue(() => {})

    // @ts-expect-error - mocking window.api
    window.api = {
      shell: { detect: mockShellDetect },
      app: { getPaths: mockGetPaths },
      pty: { spawn: mockPtySpawn },
      quit: { onShowDialog: mockOnShowDialog, confirm: vi.fn(), cancel: vi.fn() }
    }

    render(App)

    // Wait for async onMount to complete
    await waitFor(() => {
      expect(mockShellDetect).toHaveBeenCalled()
      expect(mockGetPaths).toHaveBeenCalled()
      expect(mockPtySpawn).toHaveBeenCalled()
    })

    // After successful spawn, workspace should be rendered
    expect(document.querySelector('.workspace-container')).toBeTruthy()
  })

  it('shows inline recoverable error when shell.detect fails', async () => {
    const mockShellDetect = vi.fn().mockResolvedValue({
      ok: false,
      error: { code: 'DETECT_FAILED', message: 'Detection error' }
    })
    const mockOnShowDialog = vi.fn().mockReturnValue(() => {})

    // @ts-expect-error - mocking window.api
    window.api = {
      shell: { detect: mockShellDetect },
      quit: { onShowDialog: mockOnShowDialog, confirm: vi.fn(), cancel: vi.fn() }
    }

    render(App)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy()
    })

    expect(screen.getByText(/shell detection failed/i)).toBeTruthy()
  })

  it('shows inline recoverable error when no shell is detected', async () => {
    const mockShellDetect = vi.fn().mockResolvedValue({ ok: true, data: [] })
    const mockOnShowDialog = vi.fn().mockReturnValue(() => {})

    // @ts-expect-error - mocking window.api
    window.api = {
      shell: { detect: mockShellDetect },
      quit: { onShowDialog: mockOnShowDialog, confirm: vi.fn(), cancel: vi.fn() }
    }

    render(App)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy()
    })

    expect(screen.getByText(/no shell was detected/i)).toBeTruthy()
  })

  it('shows inline recoverable error when app.getPaths fails and does not call pty.spawn', async () => {
    const mockShellDetect = vi.fn().mockResolvedValue({ ok: true, data: ['/bin/bash'] })
    const mockGetPaths = vi
      .fn()
      .mockResolvedValue({ ok: false, error: { code: 'PATHS_FAILED', message: 'Paths error' } })
    const mockPtySpawn = vi.fn()
    const mockOnShowDialog = vi.fn().mockReturnValue(() => {})

    // @ts-expect-error - mocking window.api
    window.api = {
      shell: { detect: mockShellDetect },
      app: { getPaths: mockGetPaths },
      pty: { spawn: mockPtySpawn },
      quit: { onShowDialog: mockOnShowDialog, confirm: vi.fn(), cancel: vi.fn() }
    }

    render(App)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy()
    })

    expect(screen.getByText(/home path could not be resolved/i)).toBeTruthy()
    expect(mockPtySpawn).not.toHaveBeenCalled()
  })

  it('shows inline recoverable error when pty.spawn fails and includes the shell path', async () => {
    const shellPath = '/bin/zsh'
    const mockShellDetect = vi.fn().mockResolvedValue({ ok: true, data: [shellPath] })
    const mockGetPaths = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { home: '/home/test', userData: '', logsDir: '' } })
    const mockPtySpawn = vi
      .fn()
      .mockResolvedValue({ ok: false, error: { code: 'SPAWN_FAILED', message: 'Spawn error' } })
    const mockOnShowDialog = vi.fn().mockReturnValue(() => {})

    // @ts-expect-error - mocking window.api
    window.api = {
      shell: { detect: mockShellDetect },
      app: { getPaths: mockGetPaths },
      pty: { spawn: mockPtySpawn },
      quit: { onShowDialog: mockOnShowDialog, confirm: vi.fn(), cancel: vi.fn() }
    }

    render(App)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy()
    })

    const errorElement = screen.getByRole('alert')
    expect(errorElement.textContent).toContain('Failed to spawn shell')
    expect(errorElement.textContent).toContain(shellPath)
  })
})
