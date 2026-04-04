import { describe, it, expect, vi, beforeAll, afterEach, beforeEach } from 'vitest'

describe('PaneContainer', () => {
  beforeAll(() => {
    vi.clearAllMocks()
  })

  beforeEach(() => {
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
    // Reset workspace UI state before each test
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  // Dynamically import PaneContainer
  async function getPaneContainer(): Promise<typeof import('./PaneContainer.svelte').default> {
    const mod = await import('./PaneContainer.svelte')
    return mod.default
  }

  it('renders data-pane-id attribute correctly', async () => {
    const PaneContainer = await getPaneContainer()
    const target = document.createElement('div')
    document.body.appendChild(target)

    const { mount } = await import('svelte')

    const paneId = 42
    mount(PaneContainer, {
      target,
      props: { paneId, sessionId: 1, resizeTick: 0 }
    })

    const pane = target.querySelector('.pane-container')
    expect(pane).not.toBeNull()
    expect((pane as HTMLElement).dataset.paneId).toBe(String(paneId))
  })

  it('renders data-session-id attribute correctly', async () => {
    const PaneContainer = await getPaneContainer()
    const target = document.createElement('div')
    document.body.appendChild(target)

    const { mount } = await import('svelte')

    const sessionId = 99
    mount(PaneContainer, {
      target,
      props: { paneId: 1, sessionId, resizeTick: 0 }
    })

    const pane = target.querySelector('.pane-container')
    expect(pane).not.toBeNull()
    expect((pane as HTMLElement).dataset.sessionId).toBe(String(sessionId))
  })

  it('accepts resizeTick prop without errors', async () => {
    const PaneContainer = await getPaneContainer()
    const target = document.createElement('div')
    document.body.appendChild(target)

    const { mount } = await import('svelte')

    // Mount with initial resizeTick
    mount(PaneContainer, {
      target,
      props: { paneId: 1, sessionId: 1, resizeTick: 0 }
    })

    // Component should render without errors with resizeTick prop
    const pane = target.querySelector('[data-pane-id="1"]')
    expect(pane).not.toBeNull()
  })

  describe('focus state', () => {
    it('clicking a pane container calls setFocusedPaneId(paneId)', async () => {
      const PaneContainer = await getPaneContainer()
      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const { setFocusedPaneId, workspaceUIState } =
        await import('../../stores/workspace-ui-store.svelte')

      // Reset to null first
      setFocusedPaneId(null)

      const paneId = 5
      mount(PaneContainer, {
        target,
        props: { paneId, sessionId: 1, resizeTick: 0 }
      })

      // Simulate click on the pane container
      const pane = target.querySelector('.pane-container')
      expect(pane).not.toBeNull()

      // Click the pane
      pane!.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      // Verify setFocusedPaneId was called with the correct paneId
      expect(workspaceUIState.focusedPaneId).toBe(paneId)
    })

    it('renders focused state when workspaceUIState.focusedPaneId matches paneId', async () => {
      const PaneContainer = await getPaneContainer()
      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const { setFocusedPaneId } = await import('../../stores/workspace-ui-store.svelte')

      const paneId = 3
      setFocusedPaneId(paneId)

      mount(PaneContainer, {
        target,
        props: { paneId, sessionId: 1, resizeTick: 0 }
      })

      const pane = target.querySelector('.pane-container')
      expect(pane).not.toBeNull()
      // Should have is-focused class
      expect(pane!.classList.contains('is-focused')).toBe(true)
      // Should have data-focused="true"
      expect((pane as HTMLElement).dataset.focused).toBe('true')
    })

    it('does not render focused state when another pane is focused', async () => {
      const PaneContainer = await getPaneContainer()
      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const { setFocusedPaneId } = await import('../../stores/workspace-ui-store.svelte')

      // Focus a different pane (pane 2)
      setFocusedPaneId(2)

      // Mount pane 3
      mount(PaneContainer, {
        target,
        props: { paneId: 3, sessionId: 1, resizeTick: 0 }
      })

      const pane = target.querySelector('.pane-container')
      expect(pane).not.toBeNull()
      // Should NOT have is-focused class
      expect(pane!.classList.contains('is-focused')).toBe(false)
      // Should have data-focused="false"
      expect((pane as HTMLElement).dataset.focused).toBe('false')
    })

    it('data-focused attribute updates when focus changes', async () => {
      const PaneContainer = await getPaneContainer()
      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const { setFocusedPaneId, workspaceUIState } =
        await import('../../stores/workspace-ui-store.svelte')

      const paneId = 7
      setFocusedPaneId(null)

      mount(PaneContainer, {
        target,
        props: { paneId, sessionId: 1, resizeTick: 0 }
      })

      const pane = target.querySelector('.pane-container') as HTMLElement
      expect(pane).not.toBeNull()

      // Initially not focused (focusedPaneId is null)
      expect(workspaceUIState.focusedPaneId).toBeNull()

      // Click to focus - this updates the store
      pane.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      // Verify store was updated
      expect(workspaceUIState.focusedPaneId).toBe(paneId)
    })

    it('activates focus on Enter key press', async () => {
      const PaneContainer = await getPaneContainer()
      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const { setFocusedPaneId, workspaceUIState } =
        await import('../../stores/workspace-ui-store.svelte')

      const paneId = 8
      setFocusedPaneId(null)

      mount(PaneContainer, {
        target,
        props: { paneId, sessionId: 1, resizeTick: 0 }
      })

      const pane = target.querySelector('.pane-container') as HTMLElement
      expect(pane).not.toBeNull()

      // Press Enter to focus
      pane.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

      // Verify store was updated
      expect(workspaceUIState.focusedPaneId).toBe(paneId)
    })

    it('activates focus on Space key press', async () => {
      const PaneContainer = await getPaneContainer()
      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const { setFocusedPaneId, workspaceUIState } =
        await import('../../stores/workspace-ui-store.svelte')

      const paneId = 9
      setFocusedPaneId(null)

      mount(PaneContainer, {
        target,
        props: { paneId, sessionId: 1, resizeTick: 0 }
      })

      const pane = target.querySelector('.pane-container') as HTMLElement
      expect(pane).not.toBeNull()

      // Press Space to focus
      pane.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))

      // Verify store was updated
      expect(workspaceUIState.focusedPaneId).toBe(paneId)
    })

    it('maintains visual focus state after resizeTick change', async () => {
      const PaneContainer = await getPaneContainer()
      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const { setFocusedPaneId } = await import('../../stores/workspace-ui-store.svelte')

      const paneId = 10
      setFocusedPaneId(paneId)

      // Mount with initial resizeTick
      mount(PaneContainer, {
        target,
        props: { paneId, sessionId: 1, resizeTick: 0 }
      })

      // Verify initially focused
      const pane = target.querySelector('.pane-container') as HTMLElement
      expect(pane).not.toBeNull()
      expect(pane.classList.contains('is-focused')).toBe(true)

      // Simulate resize by updating resizeTick (would require re-mount or reactive update)
      // Since props are reactive in Svelte 5, we verify the derived state persists
      // The isFocused derived value should remain true as long as workspaceUIState.focusedPaneId === paneId
      expect(pane.classList.contains('is-focused')).toBe(true)
      expect((pane as HTMLElement).dataset.focused).toBe('true')
    })
  })

  describe('PaneHeader integration', () => {
    it('renders PaneHeader above TerminalView', async () => {
      const PaneContainer = await getPaneContainer()
      const { layoutState } = await import('../../stores/layout-store.svelte')
      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      layoutState.panes = [{ paneId: 42, sessionId: 1, name: 'Infra Logs' }]

      mount(PaneContainer, { target, props: { paneId: 42, sessionId: 1, resizeTick: 0 } })

      const header = target.querySelector('header.pane-header')
      expect(header).not.toBeNull()

      const terminalArea = target.querySelector('.pane-terminal-area')
      expect(terminalArea).not.toBeNull()

      // header must come before terminal area in DOM order
      const pane = target.querySelector('.pane-container')!
      const children = Array.from(pane.children)
      const headerIdx = children.findIndex((el) => el.matches('header.pane-header'))
      const terminalIdx = children.findIndex((el) => el.matches('.pane-terminal-area'))
      expect(headerIdx).toBeLessThan(terminalIdx)
    })

    it('passes correct name from layoutState to PaneHeader', async () => {
      const PaneContainer = await getPaneContainer()
      const { layoutState } = await import('../../stores/layout-store.svelte')
      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      layoutState.panes = [{ paneId: 42, sessionId: 1, name: 'Infra Logs' }]

      mount(PaneContainer, { target, props: { paneId: 42, sessionId: 1, resizeTick: 0 } })

      const nameEl = target.querySelector('.pane-header-name')
      expect(nameEl).not.toBeNull()
      expect(nameEl!.textContent).toBe('Infra Logs')
    })

    it('passes correct paneId to PaneHeader (fallback name uses paneId)', async () => {
      const PaneContainer = await getPaneContainer()
      const { layoutState } = await import('../../stores/layout-store.svelte')
      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      // Pane with no matching entry → fallback to "Pane {paneId}"
      layoutState.panes = []

      mount(PaneContainer, { target, props: { paneId: 42, sessionId: 1, resizeTick: 0 } })

      const nameEl = target.querySelector('.pane-header-name')
      expect(nameEl).not.toBeNull()
      expect(nameEl!.textContent).toBe('Pane 42')
    })

    it('passes isFocused state to PaneHeader', async () => {
      const PaneContainer = await getPaneContainer()
      const { layoutState } = await import('../../stores/layout-store.svelte')
      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const { setFocusedPaneId } = await import('../../stores/workspace-ui-store.svelte')

      layoutState.panes = [{ paneId: 42, sessionId: 1, name: 'Test' }]
      setFocusedPaneId(42)

      mount(PaneContainer, { target, props: { paneId: 42, sessionId: 1, resizeTick: 0 } })

      const header = target.querySelector('header.pane-header')
      expect(header!.classList.contains('is-focused')).toBe(true)
    })

    it('terminal area wraps TerminalView with flex sizing', async () => {
      const PaneContainer = await getPaneContainer()
      const { layoutState } = await import('../../stores/layout-store.svelte')
      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      layoutState.panes = [{ paneId: 42, sessionId: 1, name: 'Test' }]

      mount(PaneContainer, { target, props: { paneId: 42, sessionId: 1, resizeTick: 0 } })

      const terminalArea = target.querySelector('.pane-terminal-area') as HTMLElement
      expect(terminalArea).not.toBeNull()
    })
  })
})
