import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'

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
})
