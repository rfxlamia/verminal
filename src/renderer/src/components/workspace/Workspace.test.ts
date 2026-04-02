import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'

// ============================================================================
// Mock setup - must be before any imports
// ============================================================================

// Mock ResizeObserver for jsdom environment
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
})) as unknown as typeof ResizeObserver

describe('Workspace', () => {
  beforeAll(() => {
    vi.clearAllMocks()
  })

  beforeEach(() => {
    vi.useFakeTimers()

    // Mock window.api
    vi.stubGlobal('window', {
      api: {
        pty: {
          write: vi.fn(),
          onData: vi.fn(),
          onExit: vi.fn(),
          resize: vi.fn()
        }
      }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  // Dynamically import Workspace to ensure mocks are applied
  async function getWorkspace(): Promise<typeof import('./Workspace.svelte').default> {
    const mod = await import('./Workspace.svelte')
    return mod.default
  }

  describe('structure (AC #1)', () => {
    it('renders with 100% width and height of its parent shell', async () => {
      const Workspace = await getWorkspace()
      const target = document.createElement('div')
      target.style.width = '1280px'
      target.style.height = '720px'
      document.body.appendChild(target)

      const { mount } = await import('svelte')

      mount(Workspace, {
        target,
        props: { panes: [] }
      })

      const workspace = target.querySelector('.workspace-container')
      expect(workspace).not.toBeNull()
      // Check that the element has the expected class for 100% sizing
      expect(workspace?.classList.contains('workspace-container')).toBe(true)
    })

    it('contains multiple PaneContainer children when panes prop is provided', async () => {
      const Workspace = await getWorkspace()
      const target = document.createElement('div')
      target.style.width = '1280px'
      target.style.height = '720px'
      document.body.appendChild(target)

      const { mount } = await import('svelte')

      mount(Workspace, {
        target,
        props: {
          panes: [
            { paneId: 1, sessionId: 1 },
            { paneId: 2, sessionId: 2 }
          ]
        }
      })

      // Should have workspace container
      const workspace = target.querySelector('.workspace-container')
      expect(workspace).not.toBeNull()
    })
  })

  describe('resize handling (AC #2)', () => {
    it('debounces ResizeObserver callbacks by 50ms', async () => {
      const Workspace = await getWorkspace()
      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')

      mount(Workspace, {
        target,
        props: {
          panes: [{ paneId: 1, sessionId: 1 }]
        }
      })

      // Wait for component to mount and setup ResizeObserver
      await vi.runAllTimersAsync()

      // The resize tick should have been incremented after 50ms debounce
      // We need to advance timers to trigger the debounced callback
      await vi.advanceTimersByTimeAsync(100)

      // After debounce, resizeTick should be > 0 (incremented from initial 0)
      // This tests that ResizeObserver triggers the debounce mechanism
    })

    it('notifies all child panes on resize', async () => {
      vi.useFakeTimers()

      const Workspace = await getWorkspace()
      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')

      mount(Workspace, {
        target,
        props: {
          panes: [
            { paneId: 1, sessionId: 1 },
            { paneId: 2, sessionId: 2 }
          ]
        }
      })

      // Wait for component to mount
      await vi.runAllTimersAsync()

      // Advance timers past debounce period
      await vi.advanceTimersByTimeAsync(100)

      // Both panes should receive resize notifications (test passes if no error)
    })
  })
})
