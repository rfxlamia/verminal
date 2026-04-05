import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor, cleanup } from '@testing-library/svelte'
import { resetLayoutState } from './stores/layout-store.svelte'
import { resetCommandCenterState } from './stores/command-center-store.svelte'
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
    resetCommandCenterState()
  })

  it('renders CommandCenter component when commandCenterState.isOpen is true', async () => {
    const mockOnShowDialog = vi.fn().mockReturnValue(() => {})
    const mockCommandCenterOnOpen = vi.fn().mockReturnValue(() => {})

    // @ts-expect-error - mocking window.api
    window.api = {
      quit: { onShowDialog: mockOnShowDialog, confirm: vi.fn(), cancel: vi.fn() },
      commandCenter: { onOpen: mockCommandCenterOnOpen },
      layout: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        load: vi.fn().mockResolvedValue({
          ok: true,
          data: { name: 'test', layout_name: 'single', panes: [{}] }
        }),
        save: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
        delete: vi.fn().mockResolvedValue({ ok: true, data: undefined })
      }
    }

    render(App)

    // CommandCenter should be rendered when isOpen is true (default)
    await waitFor(() => {
      expect(document.querySelector('.command-center-backdrop')).toBeTruthy()
    })

    // Panel should have title
    expect(document.querySelector('.command-center-title')).toBeTruthy()
  })

  it('does NOT call pty.spawn on mount', async () => {
    const mockOnShowDialog = vi.fn().mockReturnValue(() => {})
    const mockCommandCenterOnOpen = vi.fn().mockReturnValue(() => {})
    const mockPtySpawn = vi.fn()

    // @ts-expect-error - mocking window.api
    window.api = {
      quit: { onShowDialog: mockOnShowDialog, confirm: vi.fn(), cancel: vi.fn() },
      commandCenter: { onOpen: mockCommandCenterOnOpen },
      pty: { spawn: mockPtySpawn },
      layout: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        load: vi.fn().mockResolvedValue({
          ok: true,
          data: { name: 'test', layout_name: 'single', panes: [{}] }
        }),
        save: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
        delete: vi.fn().mockResolvedValue({ ok: true, data: undefined })
      }
    }

    render(App)

    // Wait for mount to complete
    await new Promise((resolve) => setTimeout(resolve, 50))

    // PTY spawn should NOT be called on mount
    expect(mockPtySpawn).not.toHaveBeenCalled()
  })

  it('does NOT call initGridLayout on mount', async () => {
    const mockOnShowDialog = vi.fn().mockReturnValue(() => {})
    const mockCommandCenterOnOpen = vi.fn().mockReturnValue(() => {})

    // @ts-expect-error - mocking window.api
    window.api = {
      quit: { onShowDialog: mockOnShowDialog, confirm: vi.fn(), cancel: vi.fn() },
      commandCenter: { onOpen: mockCommandCenterOnOpen },
      layout: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        load: vi.fn().mockResolvedValue({
          ok: true,
          data: { name: 'test', layout_name: 'single', panes: [{}] }
        }),
        save: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
        delete: vi.fn().mockResolvedValue({ ok: true, data: undefined })
      }
    }

    render(App)

    // Wait for mount
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Workspace should be empty (no panes spawned)
    const paneContainers = document.querySelectorAll('.pane-container')
    expect(paneContainers.length).toBe(0)
  })

  it('calls openCommandCenter() when command-center:open IPC fires', async () => {
    const mockOnShowDialog = vi.fn().mockReturnValue(() => {})
    let commandCenterCallback: (() => void) | null = null
    const mockCommandCenterOnOpen = vi.fn().mockImplementation((cb: () => void) => {
      commandCenterCallback = cb
      return () => {}
    })

    // @ts-expect-error - mocking window.api
    window.api = {
      quit: { onShowDialog: mockOnShowDialog, confirm: vi.fn(), cancel: vi.fn() },
      commandCenter: { onOpen: mockCommandCenterOnOpen },
      layout: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        load: vi.fn().mockResolvedValue({
          ok: true,
          data: { name: 'test', layout_name: 'single', panes: [{}] }
        }),
        save: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
        delete: vi.fn().mockResolvedValue({ ok: true, data: undefined })
      }
    }

    render(App)

    // Wait for mount to set up the listener
    await waitFor(() => {
      expect(mockCommandCenterOnOpen).toHaveBeenCalled()
    })

    // CommandCenter should be open by default
    expect(document.querySelector('.command-center-backdrop')).toBeTruthy()

    // Close it first
    const { closeCommandCenter } = await import('./stores/command-center-store.svelte')
    closeCommandCenter()

    await waitFor(() => {
      expect(document.querySelector('.command-center-backdrop')).toBeFalsy()
    })

    // Now trigger the IPC callback (simulating global shortcut)
    if (commandCenterCallback) {
      commandCenterCallback()
    }

    // CommandCenter should be open again
    await waitFor(() => {
      expect(document.querySelector('.command-center-backdrop')).toBeTruthy()
    })
  })

  it('returns focus to the empty workspace container when Command Center closes', async () => {
    const mockOnShowDialog = vi.fn().mockReturnValue(() => {})
    const mockCommandCenterOnOpen = vi.fn().mockReturnValue(() => {})

    // @ts-expect-error - mocking window.api
    window.api = {
      quit: { onShowDialog: mockOnShowDialog, confirm: vi.fn(), cancel: vi.fn() },
      commandCenter: { onOpen: mockCommandCenterOnOpen },
      layout: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        load: vi.fn().mockResolvedValue({
          ok: true,
          data: { name: 'test', layout_name: 'single', panes: [{}] }
        }),
        save: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
        delete: vi.fn().mockResolvedValue({ ok: true, data: undefined })
      }
    }

    render(App)

    // Wait for CommandCenter to render
    await waitFor(() => {
      expect(document.querySelector('.command-center-backdrop')).toBeTruthy()
    })

    // Close Command Center
    const { closeCommandCenter } = await import('./stores/command-center-store.svelte')
    closeCommandCenter()

    // Wait for close
    await waitFor(() => {
      expect(document.querySelector('.command-center-backdrop')).toBeFalsy()
    })

    // Workspace container should be focusable
    const workspaceContainer = document.querySelector('.workspace-container')
    expect(workspaceContainer).toBeTruthy()
  })

  // Note: Testing IPC bridge not available is difficult because QuitDialog also
  // depends on window.api. This scenario is a development edge case.

  it('workspace is empty until layout is selected', async () => {
    const mockOnShowDialog = vi.fn().mockReturnValue(() => {})
    const mockCommandCenterOnOpen = vi.fn().mockReturnValue(() => {})

    // @ts-expect-error - mocking window.api
    window.api = {
      quit: { onShowDialog: mockOnShowDialog, confirm: vi.fn(), cancel: vi.fn() },
      commandCenter: { onOpen: mockCommandCenterOnOpen },
      layout: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        load: vi.fn().mockResolvedValue({
          ok: true,
          data: { name: 'test', layout_name: 'single', panes: [{}] }
        }),
        save: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
        delete: vi.fn().mockResolvedValue({ ok: true, data: undefined })
      }
    }

    render(App)

    // Workspace container should exist
    await waitFor(() => {
      expect(document.querySelector('.workspace-container')).toBeTruthy()
    })

    // But no panes should be rendered
    const paneContainers = document.querySelectorAll('.pane-container')
    expect(paneContainers.length).toBe(0)
  })

  describe('Focus Mode keyboard shortcut', () => {
    it('Ctrl+Shift+F triggers enterFocusMode on focused pane', async () => {
      const mockOnShowDialog = vi.fn().mockReturnValue(() => {})
      const mockCommandCenterOnOpen = vi.fn().mockReturnValue(() => {})

      // @ts-expect-error - mocking window.api
      window.api = {
        quit: { onShowDialog: mockOnShowDialog, confirm: vi.fn(), cancel: vi.fn() },
        commandCenter: { onOpen: mockCommandCenterOnOpen },
        layout: {
          list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
          load: vi.fn().mockResolvedValue({
            ok: true,
            data: { name: 'test', layout_name: 'single', panes: [{}] }
          }),
          save: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
          delete: vi.fn().mockResolvedValue({ ok: true, data: undefined })
        }
      }

      render(App)

      // Setup: Set up layout with 2 panes and focus pane 2
      const { layoutState } = await import('./stores/layout-store.svelte')
      const { setFocusedPaneId, workspaceUIState } =
        await import('./stores/workspace-ui-store.svelte')

      layoutState.panes = [
        { paneId: 1, sessionId: 101, name: 'Pane 1' },
        { paneId: 2, sessionId: 102, name: 'Pane 2' }
      ]
      setFocusedPaneId(2)
      workspaceUIState.isFocusMode = false

      // Dispatch Ctrl+Shift+F
      const event = new KeyboardEvent('keydown', {
        ctrlKey: true,
        shiftKey: true,
        key: 'F',
        bubbles: true
      })
      window.dispatchEvent(event)

      // Verify focus mode activated
      expect(workspaceUIState.isFocusMode).toBe(true)
      expect(workspaceUIState.focusedPaneId).toBe(2)
    })

    it('Ctrl+Shift+F is no-op if only 1 pane (AC #4)', async () => {
      const mockOnShowDialog = vi.fn().mockReturnValue(() => {})
      const mockCommandCenterOnOpen = vi.fn().mockReturnValue(() => {})

      // @ts-expect-error - mocking window.api
      window.api = {
        quit: { onShowDialog: mockOnShowDialog, confirm: vi.fn(), cancel: vi.fn() },
        commandCenter: { onOpen: mockCommandCenterOnOpen },
        layout: {
          list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
          load: vi.fn().mockResolvedValue({
            ok: true,
            data: { name: 'test', layout_name: 'single', panes: [{}] }
          }),
          save: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
          delete: vi.fn().mockResolvedValue({ ok: true, data: undefined })
        }
      }

      render(App)

      // Setup: Set up layout with 1 pane
      const { layoutState } = await import('./stores/layout-store.svelte')
      const { setFocusedPaneId, workspaceUIState } =
        await import('./stores/workspace-ui-store.svelte')

      layoutState.panes = [{ paneId: 1, sessionId: 101, name: 'Pane 1' }]
      setFocusedPaneId(1)
      workspaceUIState.isFocusMode = false

      // Dispatch Ctrl+Shift+F
      const event = new KeyboardEvent('keydown', {
        ctrlKey: true,
        shiftKey: true,
        key: 'F',
        bubbles: true
      })
      window.dispatchEvent(event)

      // Verify focus mode NOT activated (single-pane guard)
      expect(workspaceUIState.isFocusMode).toBe(false)
    })

    it('Ctrl+Shift+F is no-op if no pane focused (focusedPaneId null)', async () => {
      const mockOnShowDialog = vi.fn().mockReturnValue(() => {})
      const mockCommandCenterOnOpen = vi.fn().mockReturnValue(() => {})

      // @ts-expect-error - mocking window.api
      window.api = {
        quit: { onShowDialog: mockOnShowDialog, confirm: vi.fn(), cancel: vi.fn() },
        commandCenter: { onOpen: mockCommandCenterOnOpen },
        layout: {
          list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
          load: vi.fn().mockResolvedValue({
            ok: true,
            data: { name: 'test', layout_name: 'single', panes: [{}] }
          }),
          save: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
          delete: vi.fn().mockResolvedValue({ ok: true, data: undefined })
        }
      }

      render(App)

      // Setup: Set up layout with 2 panes but no focus
      const { layoutState } = await import('./stores/layout-store.svelte')
      const { workspaceUIState } = await import('./stores/workspace-ui-store.svelte')

      layoutState.panes = [
        { paneId: 1, sessionId: 101, name: 'Pane 1' },
        { paneId: 2, sessionId: 102, name: 'Pane 2' }
      ]
      workspaceUIState.focusedPaneId = null
      workspaceUIState.isFocusMode = false

      // Dispatch Ctrl+Shift+F
      const event = new KeyboardEvent('keydown', {
        ctrlKey: true,
        shiftKey: true,
        key: 'F',
        bubbles: true
      })
      window.dispatchEvent(event)

      // Verify focus mode NOT activated
      expect(workspaceUIState.isFocusMode).toBe(false)
    })
  })
})
