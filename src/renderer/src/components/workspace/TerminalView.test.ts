import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'

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

// Mock all xterm modules before any imports
vi.mock('@xterm/xterm', () => ({
  Terminal: vi.fn().mockImplementation(() => ({
    open: mockTerminalOpen,
    write: mockTerminalWrite,
    onData: mockTerminalOnData,
    dispose: mockTerminalDispose,
    focus: mockTerminalFocus,
    loadAddon: mockLoadAddon,
    unicode: mockUnicode
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

// Mock window.api
const mockPtyWrite = vi.fn()
const mockOnDataUnsubscribe = vi.fn()
const mockOnExitUnsubscribe = vi.fn()
let onDataCallback: ((data: string) => void) | null = null
let onExitCallback: ((code: number) => void) | null = null

const mockOnData = vi.fn((sessionId: number, cb: (data: string) => void) => {
  onDataCallback = cb
  return mockOnDataUnsubscribe
})

const mockOnExit = vi.fn((sessionId: number, cb: (code: number) => void) => {
  onExitCallback = cb
  return mockOnExitUnsubscribe
})

Object.defineProperty(globalThis, 'window', {
  value: {
    api: {
      pty: {
        write: mockPtyWrite,
        onData: mockOnData,
        onExit: mockOnExit
      }
    }
  },
  writable: true
})

// ============================================================================
// Imports - after mocks
// ============================================================================

import { mount, unmount } from 'svelte'

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

  afterEach(() => {
    // Reset all mock state
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

  it('focuses terminal after opening', async () => {
    const TerminalView = await getTerminalView()
    const container = document.createElement('div')
    document.body.appendChild(container)

    mount(TerminalView, {
      target: container,
      props: { sessionId: 1 }
    })

    await waitFor(() => mockTerminalFocus.mock.calls.length > 0)

    expect(mockTerminalFocus).toHaveBeenCalled()
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
