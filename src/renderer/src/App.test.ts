import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/svelte'
import { resetLayoutState } from './stores/layout-store.svelte'
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
    vi.resetAllMocks()
    cleanup()
    document.body.innerHTML = ''
    // Reset store state between tests
    resetLayoutState()
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

  it('shows error when shell is empty string', async () => {
    const mockShellDetect = vi.fn().mockResolvedValue({ ok: true, data: [''] })
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

  it('shows error when homeResult.data is not a valid object', async () => {
    const mockShellDetect = vi.fn().mockResolvedValue({ ok: true, data: ['/bin/bash'] })
    const mockGetPaths = vi.fn().mockResolvedValue({ ok: true, data: null })
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

  it('shows error when spawnResult.data is not a valid object', async () => {
    const mockShellDetect = vi.fn().mockResolvedValue({ ok: true, data: ['/bin/bash'] })
    const mockGetPaths = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { home: '/home/test', userData: '', logsDir: '' } })
    const mockPtySpawn = vi.fn().mockResolvedValue({ ok: true, data: null })
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

    expect(screen.getByText(/failed to initialize session/i)).toBeTruthy()
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

  describe('2-pane horizontal layout (Story 3.3)', () => {
    it('spawns 2 PTY sessions and initializes horizontal layout with both sessionIds', async () => {
      const mockShellDetect = vi.fn().mockResolvedValue({ ok: true, data: ['/bin/bash'] })
      const mockGetPaths = vi
        .fn()
        .mockResolvedValue({ ok: true, data: { home: '/home/test', userData: '', logsDir: '' } })
      const mockPtySpawn = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, data: { sessionId: 1 } })
        .mockResolvedValueOnce({ ok: true, data: { sessionId: 2 } })
      const mockOnShowDialog = vi.fn().mockReturnValue(() => {})
      const mockPtyKill = vi.fn()

      // @ts-expect-error - mocking window.api
      window.api = {
        shell: { detect: mockShellDetect },
        app: { getPaths: mockGetPaths },
        pty: { spawn: mockPtySpawn, kill: mockPtyKill },
        quit: { onShowDialog: mockOnShowDialog, confirm: vi.fn(), cancel: vi.fn() }
      }

      render(App)

      await waitFor(() => {
        expect(mockPtySpawn).toHaveBeenCalledTimes(2)
      })

      // Verify workspace is rendered
      const workspace = document.querySelector('.workspace-container')
      expect(workspace).toBeTruthy()

      // Verify 2 pane containers are rendered (grid columns should be 1fr 1fr)
      const paneContainers = document.querySelectorAll('.pane-container')
      expect(paneContainers.length).toBe(2)
    })

    it('shows recoverable error and leaves panes empty when second pty.spawn fails', async () => {
      const mockShellDetect = vi.fn().mockResolvedValue({ ok: true, data: ['/bin/bash'] })
      const mockGetPaths = vi
        .fn()
        .mockResolvedValue({ ok: true, data: { home: '/home/test', userData: '', logsDir: '' } })
      const mockPtySpawn = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, data: { sessionId: 1 } }) // First succeeds
        .mockResolvedValueOnce({
          ok: false,
          error: { code: 'SPAWN_FAILED', message: 'Spawn error' }
        }) // Second fails
      const mockOnShowDialog = vi.fn().mockReturnValue(() => {})
      const mockPtyKill = vi.fn()

      // @ts-expect-error - mocking window.api
      window.api = {
        shell: { detect: mockShellDetect },
        app: { getPaths: mockGetPaths },
        pty: { spawn: mockPtySpawn, kill: mockPtyKill },
        quit: { onShowDialog: mockOnShowDialog, confirm: vi.fn(), cancel: vi.fn() }
      }

      render(App)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeTruthy()
      })

      // Verify error is shown
      expect(screen.getByText(/failed to spawn shell/i)).toBeTruthy()

      // Verify no panes are rendered
      const paneContainers = document.querySelectorAll('.pane-container')
      expect(paneContainers.length).toBe(0)
    })

    it('kills first session when second pty.spawn fails (NFR15 no orphan guard)', async () => {
      const mockShellDetect = vi.fn().mockResolvedValue({ ok: true, data: ['/bin/bash'] })
      const mockGetPaths = vi
        .fn()
        .mockResolvedValue({ ok: true, data: { home: '/home/test', userData: '', logsDir: '' } })
      const mockPtySpawn = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, data: { sessionId: 42 } }) // First succeeds with sessionId 42
        .mockResolvedValueOnce({
          ok: false,
          error: { code: 'SPAWN_FAILED', message: 'Spawn error' }
        }) // Second fails
      const mockOnShowDialog = vi.fn().mockReturnValue(() => {})
      const mockPtyKill = vi.fn()

      // @ts-expect-error - mocking window.api
      window.api = {
        shell: { detect: mockShellDetect },
        app: { getPaths: mockGetPaths },
        pty: { spawn: mockPtySpawn, kill: mockPtyKill },
        quit: { onShowDialog: mockOnShowDialog, confirm: vi.fn(), cancel: vi.fn() }
      }

      render(App)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeTruthy()
      })

      // Verify first session was killed
      expect(mockPtyKill).toHaveBeenCalledWith(42)
    })

    it('kills first session and leaves panes empty when second pty.spawn returns malformed success data', async () => {
      const mockShellDetect = vi.fn().mockResolvedValue({ ok: true, data: ['/bin/bash'] })
      const mockGetPaths = vi
        .fn()
        .mockResolvedValue({ ok: true, data: { home: '/home/test', userData: '', logsDir: '' } })
      const mockPtySpawn = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, data: { sessionId: 1 } }) // First succeeds
        .mockResolvedValueOnce({ ok: true, data: null }) // Second returns malformed data
      const mockOnShowDialog = vi.fn().mockReturnValue(() => {})
      const mockPtyKill = vi.fn()

      // @ts-expect-error - mocking window.api
      window.api = {
        shell: { detect: mockShellDetect },
        app: { getPaths: mockGetPaths },
        pty: { spawn: mockPtySpawn, kill: mockPtyKill },
        quit: { onShowDialog: mockOnShowDialog, confirm: vi.fn(), cancel: vi.fn() }
      }

      render(App)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeTruthy()
      })

      // Verify first session was killed
      expect(mockPtyKill).toHaveBeenCalledWith(1)

      // Verify no panes are rendered
      const paneContainers = document.querySelectorAll('.pane-container')
      expect(paneContainers.length).toBe(0)
    })

    it('shows recoverable error when first pty.spawn fails (no second spawn attempted)', async () => {
      const mockShellDetect = vi.fn().mockResolvedValue({ ok: true, data: ['/bin/bash'] })
      const mockGetPaths = vi
        .fn()
        .mockResolvedValue({ ok: true, data: { home: '/home/test', userData: '', logsDir: '' } })
      const mockPtySpawn = vi.fn().mockResolvedValueOnce({
        ok: false,
        error: { code: 'SPAWN_FAILED', message: 'Spawn error' }
      }) // First fails
      const mockOnShowDialog = vi.fn().mockReturnValue(() => {})
      const mockPtyKill = vi.fn()

      // @ts-expect-error - mocking window.api
      window.api = {
        shell: { detect: mockShellDetect },
        app: { getPaths: mockGetPaths },
        pty: { spawn: mockPtySpawn, kill: mockPtyKill },
        quit: { onShowDialog: mockOnShowDialog, confirm: vi.fn(), cancel: vi.fn() }
      }

      render(App)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeTruthy()
      })

      // Verify only one spawn was attempted
      expect(mockPtySpawn).toHaveBeenCalledTimes(1)

      // Verify error is shown
      expect(screen.getByText(/failed to spawn shell/i)).toBeTruthy()
    })
  })
})
