import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('layout-store', () => {
  beforeEach(() => {
    // Reset modules to get fresh state for each test
    vi.resetModules()
  })

  describe('createPane()', () => {
    it('returns pane with given sessionId and incrementing paneId', async () => {
      const { createPane } = await import('./layout-store.svelte')
      const pane = createPane(42)
      expect(pane.sessionId).toBe(42)
      expect(pane.paneId).toBe(1)
    })

    it('paneId starts at 1 and increments monotonically', async () => {
      const { createPane } = await import('./layout-store.svelte')
      const pane1 = createPane(100)
      const pane2 = createPane(101)
      const pane3 = createPane(102)

      expect(pane1.paneId).toBe(1)
      expect(pane2.paneId).toBe(2)
      expect(pane3.paneId).toBe(3)
    })

    it('name defaults to "Pane N" when not specified', async () => {
      const { createPane } = await import('./layout-store.svelte')
      const pane1 = createPane(1)
      const pane2 = createPane(2)

      expect(pane1.name).toBe('Pane 1')
      expect(pane2.name).toBe('Pane 2')
    })

    it('name uses provided name when specified', async () => {
      const { createPane } = await import('./layout-store.svelte')
      const pane = createPane(1, 'My Custom Pane')

      expect(pane.name).toBe('My Custom Pane')
    })

    it('does not generate the same paneId twice in a row', async () => {
      const { createPane } = await import('./layout-store.svelte')
      const pane1 = createPane(1)
      const pane2 = createPane(2)

      expect(pane1.paneId).not.toBe(pane2.paneId)
    })
  })

  describe('layoutState', () => {
    it('layoutState.panes is initially empty', async () => {
      const { layoutState } = await import('./layout-store.svelte')
      expect(layoutState.panes).toEqual([])
    })
  })

  describe('initSinglePaneLayout()', () => {
    it('sets layoutState.panes to exactly 1 pane', async () => {
      const { layoutState, initSinglePaneLayout } = await import('./layout-store.svelte')
      initSinglePaneLayout(42)
      expect(layoutState.panes.length).toBe(1)
    })

    it('pane in layout has the provided sessionId', async () => {
      const { layoutState, initSinglePaneLayout } = await import('./layout-store.svelte')
      initSinglePaneLayout(999)
      expect(layoutState.panes[0].sessionId).toBe(999)
    })

    it('sets layoutState.layoutName to "single"', async () => {
      const { layoutState, initSinglePaneLayout } = await import('./layout-store.svelte')
      initSinglePaneLayout(1)
      expect(layoutState.layoutName).toBe('single')
    })

    it('calling twice replaces panes (idempotent reset to 1 pane)', async () => {
      const { layoutState, initSinglePaneLayout } = await import('./layout-store.svelte')
      initSinglePaneLayout(1)
      initSinglePaneLayout(2)
      expect(layoutState.panes.length).toBe(1)
      expect(layoutState.panes[0].sessionId).toBe(2)
    })

    it('paneId in second call is higher than first (counter not reset)', async () => {
      const { layoutState, initSinglePaneLayout } = await import('./layout-store.svelte')
      initSinglePaneLayout(1)
      const firstPaneId = layoutState.panes[0].paneId
      initSinglePaneLayout(2)
      const secondPaneId = layoutState.panes[0].paneId
      expect(secondPaneId).toBeGreaterThan(firstPaneId)
    })
  })
})
