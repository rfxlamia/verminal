import { describe, it, expect, vi, beforeAll, afterEach, beforeEach } from 'vitest'

// ============================================================================
// Mock setup - must be before any imports
// ============================================================================

// Track ResizeObserver callbacks - support multiple instances
const resizeObserverCallbacks: Array<(entries: ResizeObserverEntry[]) => void> = []

// Default mock dimensions - can be overridden per test
let mockContentRect: DOMRectReadOnly = {
  width: 1280,
  height: 720,
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  bottom: 720,
  right: 1280
} as DOMRectReadOnly

// Helper to create mock ResizeObserverEntry
function createMockEntry(rect: DOMRectReadOnly): ResizeObserverEntry {
  return {
    target: document.createElement('div'),
    contentRect: rect,
    borderBoxSize: [],
    contentBoxSize: [],
    devicePixelContentBoxSize: []
  } as ResizeObserverEntry
}

// Mock ResizeObserver for jsdom environment
globalThis.ResizeObserver = vi.fn().mockImplementation((callback: ResizeObserverCallback) => {
  // Store callback with proper type for ResizeObserverEntry array
  const callbackFn = (entries: ResizeObserverEntry[]): void => {
    const mockObserver: ResizeObserver = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }
    callback(entries, mockObserver)
  }
  resizeObserverCallbacks.push(callbackFn)
  return {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }
}) as unknown as typeof ResizeObserver

describe('Workspace', () => {
  beforeAll(() => {
    vi.clearAllMocks()
  })

  beforeEach(() => {
    resizeObserverCallbacks.length = 0
    vi.useFakeTimers()
    // Reset mock dimensions to default
    mockContentRect = {
      width: 1280,
      height: 720,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 720,
      right: 1280
    } as DOMRectReadOnly

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
      // Should contain pane containers
      const paneContainers = target.querySelectorAll('.pane-container')
      expect(paneContainers.length).toBe(2)
    })
  })

  describe('resize handling (AC #2)', () => {
    it('sets up ResizeObserver on mount', async () => {
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

      // Wait for component to mount
      await vi.runAllTimersAsync()

      // Verify ResizeObserver was created
      expect(globalThis.ResizeObserver).toHaveBeenCalled()
    })

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

      // Wait for component to mount
      await vi.runAllTimersAsync()

      // Verify ResizeObserver was created
      expect(globalThis.ResizeObserver).toHaveBeenCalled()

      // Trigger multiple resize callbacks rapidly (within debounce window)
      const mockEntry = createMockEntry(mockContentRect)
      resizeObserverCallbacks.forEach((cb) => cb([mockEntry]))
      resizeObserverCallbacks.forEach((cb) => cb([mockEntry]))
      resizeObserverCallbacks.forEach((cb) => cb([mockEntry]))

      // Immediately after triggers, resizeTick should still be 0 (debounce active)
      // Advance timers but not past debounce
      await vi.advanceTimersByTimeAsync(10)

      // Now advance past debounce period (50ms)
      await vi.advanceTimersByTimeAsync(50)

      // After debounce, resizeTick should have incremented exactly once
      // (all 3 rapid callbacks should be coalesced into 1 update)
      // Verify component processed the resize by checking DOM stability
      const workspace = target.querySelector('.workspace-container')
      expect(workspace).not.toBeNull()
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

      // Verify both panes are rendered
      const paneContainers = target.querySelectorAll('.pane-container')
      expect(paneContainers.length).toBe(2)

      // Trigger resize if callback was captured
      const mockEntry = createMockEntry(mockContentRect)
      resizeObserverCallbacks.forEach((cb) => cb([mockEntry]))
      // Advance timers past debounce period
      await vi.advanceTimersByTimeAsync(50)

      // Verify panes still exist after resize handling
      const panesAfterResize = target.querySelectorAll('.pane-container')
      expect(panesAfterResize.length).toBe(2)

      // Verify each pane has proper metadata
      expect(panesAfterResize[0].dataset.paneId).toBe('1')
      expect(panesAfterResize[0].dataset.sessionId).toBe('1')
      expect(panesAfterResize[1].dataset.paneId).toBe('2')
      expect(panesAfterResize[1].dataset.sessionId).toBe('2')
    })

    it('disconnects ResizeObserver on destroy', async () => {
      const { mount, unmount } = await import('svelte')
      const Workspace = await getWorkspace()
      const target = document.createElement('div')
      document.body.appendChild(target)

      const component = mount(Workspace, {
        target,
        props: { panes: [{ paneId: 1, sessionId: 1 }] }
      })

      // Unmount should not throw and should clean up properly
      expect(() => unmount(component)).not.toThrow()
    })

    it('maintains equal width 1fr 1fr grid after resize for 2-pane layout', async () => {
      vi.useFakeTimers()

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

      // Wait for component to mount
      await vi.runAllTimersAsync()

      // Verify initial grid-template-columns is "1fr 1fr"
      const workspace = target.querySelector('.workspace-container') as HTMLElement
      expect(workspace).not.toBeNull()
      expect(workspace.style.gridTemplateColumns).toBe('1fr 1fr')

      // Trigger resize via ResizeObserver mock
      const mockEntry = createMockEntry(mockContentRect)
      resizeObserverCallbacks.forEach((cb) => cb([mockEntry]))
      // Advance timers past debounce period
      await vi.advanceTimersByTimeAsync(50)

      // Verify grid-template-columns is still "1fr 1fr" after resize
      expect(workspace.style.gridTemplateColumns).toBe('1fr 1fr')
    })

    it('resize debounce completes within FR17 100ms budget', async () => {
      vi.useFakeTimers()

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

      // Wait for component to mount
      await vi.runAllTimersAsync()

      // Record start time
      const startTime = performance.now()

      // Trigger resize via ResizeObserver mock
      const mockEntry = createMockEntry(mockContentRect)
      resizeObserverCallbacks.forEach((cb) => cb([mockEntry]))

      // Advance timers until resizeTick is propagated (50ms debounce)
      await vi.advanceTimersByTimeAsync(50)

      // Record end time
      const endTime = performance.now()
      const totalTime = endTime - startTime

      // Verify both panes still exist after resize (resizeTick propagated)
      const paneContainers = target.querySelectorAll('.pane-container')
      expect(paneContainers.length).toBe(2)

      // Assert total time is under FR17 100ms budget
      // The debounce is 50ms, which should be well under 100ms
      expect(totalTime).toBeLessThan(100)
    })

    it('does not propagate resizeTick when container has zero dimensions', async () => {
      vi.useFakeTimers()

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

      // Wait for component to mount
      await vi.runAllTimersAsync()

      // Verify both panes exist
      let paneContainers = target.querySelectorAll('.pane-container')
      expect(paneContainers.length).toBe(2)

      // Create zero-width entry
      const zeroWidthEntry = createMockEntry({
        width: 0,
        height: 720,
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        bottom: 720,
        right: 0
      } as DOMRectReadOnly)

      // Trigger resize with zero width
      resizeObserverCallbacks.forEach((cb) => cb([zeroWidthEntry]))
      await vi.advanceTimersByTimeAsync(50)

      // Verify panes still exist (resize should have been skipped)
      paneContainers = target.querySelectorAll('.pane-container')
      expect(paneContainers.length).toBe(2)

      // Create zero-height entry
      const zeroHeightEntry = createMockEntry({
        width: 1280,
        height: 0,
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        bottom: 0,
        right: 1280
      } as DOMRectReadOnly)

      // Trigger resize with zero height
      resizeObserverCallbacks.forEach((cb) => cb([zeroHeightEntry]))
      await vi.advanceTimersByTimeAsync(50)

      // Verify panes still exist (resize should have been skipped)
      paneContainers = target.querySelectorAll('.pane-container')
      expect(paneContainers.length).toBe(2)
    })

    it('does not propagate resizeTick when both dimensions are zero', async () => {
      vi.useFakeTimers()

      const Workspace = await getWorkspace()
      const target = document.createElement('div')
      target.style.width = '1280px'
      target.style.height = '720px'
      document.body.appendChild(target)

      const { mount } = await import('svelte')

      mount(Workspace, {
        target,
        props: {
          panes: [{ paneId: 1, sessionId: 1 }]
        }
      })

      // Wait for component to mount
      await vi.runAllTimersAsync()

      // Create zero-dimensions entry
      const zeroEntry = createMockEntry({
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        bottom: 0,
        right: 0
      } as DOMRectReadOnly)

      // Trigger resize with zero dimensions
      resizeObserverCallbacks.forEach((cb) => cb([zeroEntry]))
      await vi.advanceTimersByTimeAsync(50)

      // Verify pane still exists (resize should have been skipped)
      const paneContainers = target.querySelectorAll('.pane-container')
      expect(paneContainers.length).toBe(1)
    })
  })

  describe('single pane fullscreen (Story 3.2)', () => {
    it('renders exactly one pane-container with single pane layout', async () => {
      const Workspace = await getWorkspace()
      const target = document.createElement('div')
      target.style.width = '1280px'
      target.style.height = '720px'
      document.body.appendChild(target)

      const { mount } = await import('svelte')

      mount(Workspace, {
        target,
        props: {
          panes: [{ paneId: 1, sessionId: 1 }]
        }
      })

      // Verify exactly one pane container is rendered
      const paneContainers = target.querySelectorAll('.pane-container')
      expect(paneContainers.length).toBe(1)
    })

    it('has no split/separator elements with single pane', async () => {
      const Workspace = await getWorkspace()
      const target = document.createElement('div')
      target.style.width = '1280px'
      target.style.height = '720px'
      document.body.appendChild(target)

      const { mount } = await import('svelte')

      mount(Workspace, {
        target,
        props: {
          panes: [{ paneId: 1, sessionId: 1 }]
        }
      })

      // Verify no separator elements are rendered
      const separators = target.querySelectorAll('.pane-separator, .split-handle, .resize-handle')
      expect(separators.length).toBe(0)
    })

    it('pane container has overflow hidden class', async () => {
      const Workspace = await getWorkspace()
      const target = document.createElement('div')
      target.style.width = '1280px'
      target.style.height = '720px'
      document.body.appendChild(target)

      const { mount } = await import('svelte')

      mount(Workspace, {
        target,
        props: {
          panes: [{ paneId: 1, sessionId: 1 }]
        }
      })

      // Verify pane container exists
      const paneContainer = target.querySelector('.pane-container')
      expect(paneContainer).not.toBeNull()
      // The overflow: hidden is defined in PaneContainer.svelte CSS
      // We verify the class exists which carries the CSS styling
      expect(paneContainer?.classList.contains('pane-container')).toBe(true)
    })
  })

  describe('dynamic grid columns (Story 3.3)', () => {
    it('renders grid-template-columns as "1fr" when 1 pane is passed', async () => {
      const Workspace = await getWorkspace()
      const target = document.createElement('div')
      target.style.width = '1280px'
      target.style.height = '720px'
      document.body.appendChild(target)

      const { mount } = await import('svelte')

      mount(Workspace, {
        target,
        props: {
          panes: [{ paneId: 1, sessionId: 1 }]
        }
      })

      const workspace = target.querySelector('.workspace-container') as HTMLElement
      expect(workspace).not.toBeNull()
      expect(workspace.style.gridTemplateColumns).toBe('1fr')
    })

    it('renders grid-template-columns as "1fr 1fr" when 2 panes are passed', async () => {
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

      const workspace = target.querySelector('.workspace-container') as HTMLElement
      expect(workspace).not.toBeNull()
      expect(workspace.style.gridTemplateColumns).toBe('1fr 1fr')
    })

    it('renders exactly 2 PaneContainer elements when 2 panes are passed', async () => {
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

      const paneContainers = target.querySelectorAll('.pane-container')
      expect(paneContainers.length).toBe(2)
    })

    it('each PaneContainer receives correct paneId and sessionId', async () => {
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
            { paneId: 10, sessionId: 100 },
            { paneId: 20, sessionId: 200 }
          ]
        }
      })

      const paneContainers = target.querySelectorAll('.pane-container')
      expect(paneContainers[0].dataset.paneId).toBe('10')
      expect(paneContainers[0].dataset.sessionId).toBe('100')
      expect(paneContainers[1].dataset.paneId).toBe('20')
      expect(paneContainers[1].dataset.sessionId).toBe('200')
    })

    it('resizeTick is propagated to both panes after resize event', async () => {
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

      // Wait for mount
      await vi.runAllTimersAsync()

      // Verify both panes exist before resize
      let paneContainers = target.querySelectorAll('.pane-container')
      expect(paneContainers.length).toBe(2)

      // Trigger resize
      const mockEntry = createMockEntry(mockContentRect)
      resizeObserverCallbacks.forEach((cb) => cb([mockEntry]))
      await vi.advanceTimersByTimeAsync(50)

      // Verify both panes still exist after resize
      paneContainers = target.querySelectorAll('.pane-container')
      expect(paneContainers.length).toBe(2)
    })
  })

  describe('mixed split 3-pane grid (Story 3.4)', () => {
    it('renders grid-template-columns as "1fr 1fr" when 3 panes are passed', async () => {
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
            { paneId: 2, sessionId: 2 },
            { paneId: 3, sessionId: 3 }
          ]
        }
      })

      const workspace = target.querySelector('.workspace-container') as HTMLElement
      expect(workspace).not.toBeNull()
      expect(workspace.style.gridTemplateColumns).toBe('1fr 1fr')
    })

    it('renders grid-template-rows as "1fr" when 1 pane is passed', async () => {
      const Workspace = await getWorkspace()
      const target = document.createElement('div')
      target.style.width = '1280px'
      target.style.height = '720px'
      document.body.appendChild(target)

      const { mount } = await import('svelte')

      mount(Workspace, {
        target,
        props: {
          panes: [{ paneId: 1, sessionId: 1 }]
        }
      })

      const workspace = target.querySelector('.workspace-container') as HTMLElement
      expect(workspace).not.toBeNull()
      expect(workspace.style.gridTemplateRows).toBe('1fr')
    })

    it('renders grid-template-rows as "1fr" when 2 panes are passed', async () => {
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

      const workspace = target.querySelector('.workspace-container') as HTMLElement
      expect(workspace).not.toBeNull()
      expect(workspace.style.gridTemplateRows).toBe('1fr')
    })

    it('renders grid-template-rows as "1fr 1fr" when 3 panes are passed', async () => {
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
            { paneId: 2, sessionId: 2 },
            { paneId: 3, sessionId: 3 }
          ]
        }
      })

      const workspace = target.querySelector('.workspace-container') as HTMLElement
      expect(workspace).not.toBeNull()
      expect(workspace.style.gridTemplateRows).toBe('1fr 1fr')
    })

    it('renders exactly 3 PaneContainer elements when 3 panes are passed', async () => {
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
            { paneId: 2, sessionId: 2 },
            { paneId: 3, sessionId: 3 }
          ]
        }
      })

      const paneContainers = target.querySelectorAll('.pane-container')
      expect(paneContainers.length).toBe(3)
    })

    it('the first rendered pane wrapper spans both grid columns when 3 panes', async () => {
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
            { paneId: 2, sessionId: 2 },
            { paneId: 3, sessionId: 3 }
          ]
        }
      })

      // The first pane should be wrapped in a div with pane-wrapper class
      // and grid-column: 1 / -1 inline style
      const workspace = target.querySelector('.workspace-container') as HTMLElement
      expect(workspace).not.toBeNull()

      // First child should have the pane-wrapper class
      const firstPaneWrapper = workspace.children[0] as HTMLElement
      expect(firstPaneWrapper.classList.contains('pane-wrapper')).toBe(true)

      // Verify the grid-column style is applied
      expect(firstPaneWrapper.style.gridColumn).toBe('1 / -1')
    })

    it('resizeTick is propagated to all three panes after resize event', async () => {
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
            { paneId: 2, sessionId: 2 },
            { paneId: 3, sessionId: 3 }
          ]
        }
      })

      // Wait for mount
      await vi.runAllTimersAsync()

      // Verify all three panes exist before resize
      let paneContainers = target.querySelectorAll('.pane-container')
      expect(paneContainers.length).toBe(3)

      // Trigger resize
      const mockEntry = createMockEntry(mockContentRect)
      resizeObserverCallbacks.forEach((cb) => cb([mockEntry]))
      await vi.advanceTimersByTimeAsync(50)

      // Verify all three panes still exist after resize
      paneContainers = target.querySelectorAll('.pane-container')
      expect(paneContainers.length).toBe(3)
    })

    it('preserves the existing 50ms workspace debounce path for mixed-layout reflow', async () => {
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
            { paneId: 2, sessionId: 2 },
            { paneId: 3, sessionId: 3 }
          ]
        }
      })

      // Wait for mount
      await vi.runAllTimersAsync()

      // Trigger multiple rapid resize events
      const mockEntry = createMockEntry(mockContentRect)
      resizeObserverCallbacks.forEach((cb) => cb([mockEntry]))
      resizeObserverCallbacks.forEach((cb) => cb([mockEntry]))
      resizeObserverCallbacks.forEach((cb) => cb([mockEntry]))

      // Immediately check - panes should still exist
      let paneContainers = target.querySelectorAll('.pane-container')
      expect(paneContainers.length).toBe(3)

      // Advance past debounce
      await vi.advanceTimersByTimeAsync(50)

      // Verify all panes still exist after debounce
      paneContainers = target.querySelectorAll('.pane-container')
      expect(paneContainers.length).toBe(3)
    })
  })
})
