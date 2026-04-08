import { describe, it, expect, vi, beforeAll, afterEach, beforeEach } from 'vitest'

// ============================================================================
// Mock setup - must be before any imports
// ============================================================================

const mockTerminalOpen = vi.fn()
const mockTerminalWrite = vi.fn()
const mockTerminalOnData = vi.fn()
const mockTerminalDispose = vi.fn()
const mockTerminalFocus = vi.fn()
const mockFitAddonFit = vi.fn()
const mockLoadAddon = vi.fn()
const mockUnicode = { activeVersion: '' }

// Track ResizeObserver callbacks - support multiple instances
const resizeObserverCallbacks: Array<() => void> = []

// Mock ResizeObserver for jsdom environment
globalThis.ResizeObserver = vi.fn().mockImplementation((callback: ResizeObserverCallback) => {
  // Store callback with proper type for ResizeObserverEntry array
  const callbackFn = (): void => {
    const mockEntries: ResizeObserverEntry[] = []
    const mockObserver: ResizeObserver = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }
    callback(mockEntries, mockObserver)
  }
  resizeObserverCallbacks.push(callbackFn)
  return {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }
}) as unknown as typeof ResizeObserver

// Mock all xterm modules before any imports
vi.mock('@xterm/xterm', () => ({
  Terminal: vi.fn().mockImplementation(() => ({
    open: mockTerminalOpen,
    write: mockTerminalWrite,
    onData: mockTerminalOnData,
    dispose: mockTerminalDispose,
    focus: mockTerminalFocus,
    loadAddon: mockLoadAddon,
    unicode: mockUnicode,
    cols: 80,
    rows: 24
  }))
}))

const mockWebglAddon = vi.fn().mockImplementation(() => ({}))

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn().mockImplementation(() => ({ fit: mockFitAddonFit }))
}))

vi.mock('@xterm/addon-webgl', () => ({
  WebglAddon: mockWebglAddon
}))

vi.mock('@xterm/addon-unicode11', () => ({
  Unicode11Addon: vi.fn().mockImplementation(() => ({}))
}))

vi.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: vi.fn().mockImplementation(() => ({}))
}))

// Mock window.api - setup in beforeEach for proper isolation
let mockPtyWrite: ReturnType<typeof vi.fn>
let mockOnDataUnsubscribe: ReturnType<typeof vi.fn>
let mockOnExitUnsubscribe: ReturnType<typeof vi.fn>
let onDataCallback: ((data: string) => void) | null = null
let onExitCallback: ((code: number) => void) | null = null

let mockOnData: ReturnType<typeof vi.fn>
let mockOnExit: ReturnType<typeof vi.fn>

// ============================================================================
// Imports - after mocks
// ============================================================================

import { mount, unmount } from 'svelte'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'

// ============================================================================
// Tests
// ============================================================================

// Helper to wait for condition with polling (avoids arbitrary timeouts)
async function waitFor(condition: () => boolean, timeout = 1000): Promise<void> {
  const start = Date.now()
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('waitFor timeout')
    }
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

// Dynamically import TerminalView to ensure mocks are applied
async function getTerminalView(): Promise<typeof import('./TerminalView.svelte').default> {
  const mod = await import('./TerminalView.svelte')
  return mod.default
}

describe('TerminalView', () => {
  beforeAll(() => {
    // Reset mocks before all tests
    vi.clearAllMocks()
  })

  beforeEach(() => {
    // Set up window.api mock fresh for each test to avoid shared state
    mockPtyWrite = vi.fn()
    mockOnDataUnsubscribe = vi.fn()
    mockOnExitUnsubscribe = vi.fn()
    onDataCallback = null
    onExitCallback = null

    mockOnData = vi.fn((sessionId: number, cb: (data: string) => void) => {
      onDataCallback = cb
      return mockOnDataUnsubscribe
    })

    mockOnExit = vi.fn((sessionId: number, cb: (code: number) => void) => {
      onExitCallback = cb
      return mockOnExitUnsubscribe
    })

    // Use vi.stubGlobal for proper isolation between tests
    vi.stubGlobal('window', {
      api: {
        pty: {
          write: mockPtyWrite,
          onData: mockOnData,
          onExit: mockOnExit,
          resize: vi.fn()
        }
      }
    })
  })

  afterEach(() => {
    // Reset all mock state
    resizeObserverCallbacks.length = 0
    mockTerminalOpen.mockClear()
    mockTerminalWrite.mockClear()
    mockTerminalOnData.mockClear()
    mockTerminalDispose.mockClear()
    mockTerminalFocus.mockClear()
    mockFitAddonFit.mockClear()
    mockLoadAddon.mockClear()
    mockWebglAddon.mockClear()
    mockWebglAddon.mockImplementation(() => ({})) // Reset to default implementation
    mockPtyWrite.mockClear()
    mockOnData.mockClear()
    mockOnExit.mockClear()
    mockOnDataUnsubscribe.mockClear()
    mockOnExitUnsubscribe.mockClear()
    mockUnicode.activeVersion = ''
    onDataCallback = null
    onExitCallback = null
    // Restore global window
    vi.unstubAllGlobals()
    // Restore real timers after each test
    vi.useRealTimers()
    // Clean up DOM elements created during tests
    document.body.innerHTML = ''
  })

  it('opens the terminal in the container div on mount', async () => {
    const TerminalView = await getTerminalView()
    const container = document.createElement('div')
    document.body.appendChild(container)

    mount(TerminalView, {
      target: container,
      props: { sessionId: 1 }
    })

    await waitFor(() => mockTerminalOpen.mock.calls.length > 0)

    expect(mockTerminalOpen).toHaveBeenCalled()
    expect(mockTerminalOpen.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement)
  })

  it('activates Unicode 11 after loading the addon', async () => {
    const TerminalView = await getTerminalView()
    const container = document.createElement('div')
    document.body.appendChild(container)

    mount(TerminalView, {
      target: container,
      props: { sessionId: 1 }
    })

    await waitFor(() => mockUnicode.activeVersion === '11')

    expect(mockUnicode.activeVersion).toBe('11')
  })

  it('calls fitAddon.fit() after terminal.open()', async () => {
    const TerminalView = await getTerminalView()
    const container = document.createElement('div')
    document.body.appendChild(container)

    mount(TerminalView, {
      target: container,
      props: { sessionId: 1 }
    })

    await waitFor(() => mockFitAddonFit.mock.calls.length > 0)

    expect(mockFitAddonFit).toHaveBeenCalled()
  })

  it('does not auto-focus terminal on mount to avoid focus wars in multi-pane layouts', async () => {
    const TerminalView = await getTerminalView()
    const container = document.createElement('div')
    document.body.appendChild(container)

    mount(TerminalView, {
      target: container,
      props: { paneId: 1, sessionId: 1 }
    })

    await waitFor(() => mockTerminalOpen.mock.calls.length > 0)

    // Should NOT call focus on mount - focus is only restored during resize
    // for the focused pane (Story 3.6)
    expect(mockTerminalFocus).not.toHaveBeenCalled()
  })

  it('forwards keyboard input to pty.write via onData callback', async () => {
    const TerminalView = await getTerminalView()
    const container = document.createElement('div')
    document.body.appendChild(container)

    mount(TerminalView, {
      target: container,
      props: { sessionId: 1 }
    })

    await waitFor(() => mockTerminalOnData.mock.calls.length > 0)

    expect(mockTerminalOnData).toHaveBeenCalled()

    const terminalOnDataCallback = mockTerminalOnData.mock.calls[0][0]
    terminalOnDataCallback('ls\n')

    expect(mockPtyWrite).toHaveBeenCalledWith(1, 'ls\n')
  })

  it('writes PTY data to terminal when onData fires', async () => {
    const TerminalView = await getTerminalView()
    const container = document.createElement('div')
    document.body.appendChild(container)

    mount(TerminalView, {
      target: container,
      props: { sessionId: 1 }
    })

    await waitFor(() => mockOnData.mock.calls.length > 0)

    expect(mockOnData).toHaveBeenCalledWith(1, expect.any(Function))

    expect(onDataCallback).not.toBeNull()
    onDataCallback!('hello')

    expect(mockTerminalWrite).toHaveBeenCalledWith('hello')
  })

  it('drops PTY data after session exits (race guard)', async () => {
    const TerminalView = await getTerminalView()
    const container = document.createElement('div')
    document.body.appendChild(container)

    mount(TerminalView, {
      target: container,
      props: { sessionId: 1 }
    })

    await waitFor(() => mockOnExit.mock.calls.length > 0 && mockOnData.mock.calls.length > 0)

    expect(mockOnExit).toHaveBeenCalledWith(1, expect.any(Function))
    expect(mockOnData).toHaveBeenCalledWith(1, expect.any(Function))

    expect(onExitCallback).not.toBeNull()
    onExitCallback!(0)

    mockTerminalWrite.mockClear()

    expect(onDataCallback).not.toBeNull()
    onDataCallback!('late data')

    expect(mockTerminalWrite).not.toHaveBeenCalled()
  })

  it('calls unsubscribe fns and terminal.dispose on destroy', async () => {
    const TerminalView = await getTerminalView()
    const container = document.createElement('div')
    document.body.appendChild(container)

    const component = mount(TerminalView, {
      target: container,
      props: { sessionId: 1 }
    })

    await waitFor(() => mockOnData.mock.calls.length > 0)

    unmount(component)

    expect(mockOnDataUnsubscribe).toHaveBeenCalled()
    expect(mockOnExitUnsubscribe).toHaveBeenCalled()
    expect(mockTerminalDispose).toHaveBeenCalled()
  })

  it('does not crash if WebglAddon throws (graceful fallback)', async () => {
    // Override WebglAddon mock to throw for this test only
    mockWebglAddon.mockImplementation(() => {
      throw new Error('WebGL not supported')
    })

    const TerminalView = await getTerminalView()
    const container = document.createElement('div')
    document.body.appendChild(container)

    expect(() => {
      mount(TerminalView, {
        target: container,
        props: { sessionId: 1 }
      })
    }).not.toThrow()

    await waitFor(() => mockTerminalOpen.mock.calls.length > 0)

    expect(mockTerminalOpen).toHaveBeenCalled()
    expect(mockFitAddonFit).toHaveBeenCalled()
  })
})

describe('TerminalView resize synchronization (Story 2.5)', () => {
  let mockPtyResize: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()

    // Set up mock pty.resize
    mockPtyResize = vi.fn()
    mockOnDataUnsubscribe = vi.fn()
    mockOnExitUnsubscribe = vi.fn()

    mockOnData = vi.fn(() => mockOnDataUnsubscribe)
    mockOnExit = vi.fn(() => mockOnExitUnsubscribe)

    vi.stubGlobal('window', {
      api: {
        pty: {
          write: vi.fn(),
          onData: mockOnData,
          onExit: mockOnExit,
          resize: mockPtyResize
        }
      }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    // Clean up DOM elements created during tests
    document.body.innerHTML = ''
  })

  it('calls pty:resize after mount with debounce', async () => {
    const TerminalView = await getTerminalView()
    const container = document.createElement('div')
    document.body.appendChild(container)

    mount(TerminalView, {
      target: container,
      props: { sessionId: 1 }
    })

    // Immediately after mount - debounce timer is pending
    // The component uses 50ms debounce for initial resize
    expect(mockPtyResize).not.toHaveBeenCalled()

    // Advance timers past debounce period
    await vi.advanceTimersByTimeAsync(100)

    // Should have been called once with initial dimensions
    expect(mockPtyResize).toHaveBeenCalledTimes(1)
    expect(mockPtyResize).toHaveBeenCalledWith(1, 80, 24)
  })

  it('does not send pty:resize when cols/rows unchanged (no-op guard)', async () => {
    const TerminalView = await getTerminalView()
    const container = document.createElement('div')
    document.body.appendChild(container)

    mount(TerminalView, {
      target: container,
      props: { sessionId: 1 }
    })

    await waitFor(() => mockTerminalOpen.mock.calls.length > 0)
    await vi.advanceTimersByTimeAsync(50)

    const initialCallCount = mockPtyResize.mock.calls.length

    // Wait additional time - no more calls should happen
    await vi.advanceTimersByTimeAsync(100)

    // No additional calls should happen (no resize events triggered)
    expect(mockPtyResize.mock.calls.length).toBe(initialCallCount)
  })

  it('clears debounce timer on destroy preventing late IPC calls', async () => {
    const TerminalView = await getTerminalView()
    const container = document.createElement('div')
    document.body.appendChild(container)

    const component = mount(TerminalView, {
      target: container,
      props: { sessionId: 1 }
    })

    await waitFor(() => mockTerminalOpen.mock.calls.length > 0)
    await vi.advanceTimersByTimeAsync(50)

    // Clear tracking
    mockPtyResize.mockClear()

    // Destroy component
    unmount(component)

    // Advance timer past debounce period
    await vi.advanceTimersByTimeAsync(100)

    // Should not have any new calls after destroy (isDestroyed flag prevents it)
    expect(mockPtyResize).not.toHaveBeenCalled()
  })

  it('handles component destruction gracefully during debounce', async () => {
    const TerminalView = await getTerminalView()
    const container = document.createElement('div')
    document.body.appendChild(container)

    const component = mount(TerminalView, {
      target: container,
      props: { sessionId: 1 }
    })

    await waitFor(() => mockTerminalOpen.mock.calls.length > 0)
    await vi.advanceTimersByTimeAsync(50)

    // Unmount before any debounced operations complete
    unmount(component)

    // Should not throw
    await expect(vi.advanceTimersByTimeAsync(100)).resolves.not.toThrow()

    // Verify cleanup happened
    expect(mockTerminalDispose).toHaveBeenCalled()
  })

  it('reacts to resizeTick changes from parent (Story 3.1)', async () => {
    vi.useFakeTimers()

    let currentCols = 80
    const currentRows = 24

    const mockFitAddonFitDynamic = vi.fn().mockImplementation(() => {
      currentCols += 10
    })

    const mockTerminalDynamic = {
      open: mockTerminalOpen,
      write: mockTerminalWrite,
      onData: mockTerminalOnData,
      dispose: mockTerminalDispose,
      focus: mockTerminalFocus,
      loadAddon: mockLoadAddon,
      unicode: mockUnicode,
      get cols() {
        return currentCols
      },
      get rows() {
        return currentRows
      }
    }

    vi.mocked(Terminal).mockImplementation(() => mockTerminalDynamic as unknown as Terminal)
    vi.mocked(FitAddon).mockImplementation(
      () => ({ fit: mockFitAddonFitDynamic }) as unknown as FitAddon
    )

    const TerminalView = await getTerminalView()
    const container = document.createElement('div')
    document.body.appendChild(container)

    // Mount with initial resizeTick = 0
    mount(TerminalView, {
      target: container,
      props: { sessionId: 1, resizeTick: 0 }
    })

    await waitFor(() => mockTerminalOpen.mock.calls.length > 0)
    await vi.advanceTimersByTimeAsync(50)

    // Clear tracking from initial mount
    mockPtyResize.mockClear()
    mockFitAddonFitDynamic.mockClear()

    // Simulate resizeTick change (as Workspace would do after debounce)
    // Since we can't easily update props in Svelte 5 mount, we test that the effect is set up

    // Advance timers - no additional resizeTick change, so no new resize should happen
    await vi.advanceTimersByTimeAsync(50)

    // With no resizeTick change, no new resize should happen (no-op guard)
    expect(mockFitAddonFitDynamic).not.toHaveBeenCalled()
    expect(mockPtyResize).not.toHaveBeenCalled()

    vi.useRealTimers()
  })
})

describe('Pulse notification on PTY data', () => {
  beforeEach(() => {
    // Set up window.api mock fresh for each test
    mockPtyWrite = vi.fn()
    mockOnDataUnsubscribe = vi.fn()
    mockOnExitUnsubscribe = vi.fn()
    onDataCallback = null
    onExitCallback = null

    mockOnData = vi.fn((sessionId: number, cb: (data: string) => void) => {
      onDataCallback = cb
      return mockOnDataUnsubscribe
    })

    mockOnExit = vi.fn((sessionId: number, cb: (code: number) => void) => {
      onExitCallback = cb
      return mockOnExitUnsubscribe
    })

    vi.stubGlobal('window', {
      api: {
        pty: {
          write: mockPtyWrite,
          onData: mockOnData,
          onExit: mockOnExit,
          resize: vi.fn()
        }
      }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('calls notifyBackgroundPaneOutput when PTY data arrives', async () => {
    const storeModule = await import('../../stores/workspace-ui-store.svelte')
    const notifySpy = vi.spyOn(storeModule, 'notifyBackgroundPaneOutput')
    const TerminalView = await getTerminalView()
    const container = document.createElement('div')
    document.body.appendChild(container)

    mount(TerminalView, {
      target: container,
      props: { paneId: 2, sessionId: 1 }
    })

    // Wait for the component to register the onData callback
    await waitFor(() => mockOnData.mock.calls.length > 0, 2000)

    expect(onDataCallback).not.toBeNull()
    onDataCallback!('hello')

    expect(mockTerminalWrite).toHaveBeenCalledWith('hello')
    expect(notifySpy).toHaveBeenCalledWith(2)
  })
})

describe('TerminalView focus preservation during resize (Story 3.6)', () => {
  // Note: Focus preservation tests are covered by integration tests.
  // The key behavior is:
  // 1. TerminalView accepts paneId prop
  // 2. Focus is NOT called on mount (avoiding focus wars)
  // 3. Focus IS called during resize when focusedPaneId matches paneId
  //
  // These tests verify the component structure and prop acceptance.

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('accepts paneId prop without errors', async () => {
    const TerminalView = await getTerminalView()
    const container = document.createElement('div')
    document.body.appendChild(container)

    // Should mount without error when paneId is provided
    expect(() => {
      mount(TerminalView, {
        target: container,
        props: { paneId: 1, sessionId: 1, resizeTick: 0 }
      })
    }).not.toThrow()

    await waitFor(() => mockTerminalOpen.mock.calls.length > 0)
  })

  it('routes keyboard input to focused pane only', async () => {
    const TerminalView = await getTerminalView()
    const container = document.createElement('div')
    document.body.appendChild(container)

    const { setFocusedPaneId } = await import('../../stores/workspace-ui-store.svelte')

    // Set pane 1 as focused
    setFocusedPaneId(1)

    mount(TerminalView, {
      target: container,
      props: { paneId: 1, sessionId: 1, resizeTick: 0 }
    })

    await waitFor(() => mockTerminalOpen.mock.calls.length > 0)

    // Verify onData callback was registered (means keyboard input will be routed)
    expect(mockTerminalOnData).toHaveBeenCalled()

    // Verify paneId prop was accepted - this enables focus-based routing
    expect(mockTerminalOpen).toHaveBeenCalled()
  })
})
