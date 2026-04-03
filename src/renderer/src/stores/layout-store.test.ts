import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('layout-store', () => {
  beforeEach(() => {
    // Reset modules to get fresh state for each test
    vi.resetModules()
  })

  describe('createPane()', () => {
    it('returns pane with given sessionId and incrementing paneId starting at 1', async () => {
      const { createPane } = await import('./layout-store.svelte')
      const pane = createPane(42)
      expect(pane.sessionId).toBe(42)
      expect(pane.paneId).toBe(1)
    })

    it('paneId increments monotonically across multiple calls', async () => {
      const { createPane } = await import('./layout-store.svelte')
      const pane1 = createPane(100)
      const pane2 = createPane(101)
      const pane3 = createPane(102)

      expect(pane1.paneId).toBe(1)
      expect(pane2.paneId).toBe(2)
      expect(pane3.paneId).toBe(3)
    })

    it('name defaults to "Pane {N}" format when not specified', async () => {
      const { createPane } = await import('./layout-store.svelte')
      const pane1 = createPane(1)
      const pane2 = createPane(2)

      expect(pane1.name).toBe('Pane 1')
      expect(pane2.name).toBe('Pane 2')
    })

    it('uses provided name when specified', async () => {
      const { createPane } = await import('./layout-store.svelte')
      const pane = createPane(1, 'My Custom Pane')

      expect(pane.name).toBe('My Custom Pane')
    })

    it('generates unique paneId for each call', async () => {
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

  describe('initHorizontalSplitLayout()', () => {
    it('sets layoutState.panes to exactly 2 panes', async () => {
      const { layoutState, initHorizontalSplitLayout } = await import('./layout-store.svelte')
      initHorizontalSplitLayout(42, 43)
      expect(layoutState.panes.length).toBe(2)
    })

    it('pane[0].sessionId equals sessionId1', async () => {
      const { layoutState, initHorizontalSplitLayout } = await import('./layout-store.svelte')
      initHorizontalSplitLayout(100, 200)
      expect(layoutState.panes[0].sessionId).toBe(100)
    })

    it('pane[1].sessionId equals sessionId2', async () => {
      const { layoutState, initHorizontalSplitLayout } = await import('./layout-store.svelte')
      initHorizontalSplitLayout(100, 200)
      expect(layoutState.panes[1].sessionId).toBe(200)
    })

    it('pane[0].paneId < pane[1].paneId (sequential)', async () => {
      const { layoutState, initHorizontalSplitLayout } = await import('./layout-store.svelte')
      initHorizontalSplitLayout(1, 2)
      expect(layoutState.panes[0].paneId).toBeLessThan(layoutState.panes[1].paneId)
    })

    it('sets layoutState.layoutName to "horizontal"', async () => {
      const { layoutState, initHorizontalSplitLayout } = await import('./layout-store.svelte')
      initHorizontalSplitLayout(1, 2)
      expect(layoutState.layoutName).toBe('horizontal')
    })

    it('calling twice replaces panes with fresh 2-pane set (idempotent reset)', async () => {
      const { layoutState, initHorizontalSplitLayout } = await import('./layout-store.svelte')
      initHorizontalSplitLayout(1, 2)
      expect(layoutState.panes.length).toBe(2)
      initHorizontalSplitLayout(3, 4)
      expect(layoutState.panes.length).toBe(2)
      expect(layoutState.panes[0].sessionId).toBe(3)
      expect(layoutState.panes[1].sessionId).toBe(4)
    })

    it('paneIds are distinct and incrementing from previous createPane calls', async () => {
      const { createPane, layoutState, initHorizontalSplitLayout } =
        await import('./layout-store.svelte')
      // First create a pane manually
      const manualPane = createPane(999)
      // Then init horizontal layout
      initHorizontalSplitLayout(100, 200)
      // Both panes should have IDs greater than the manual pane
      expect(layoutState.panes[0].paneId).toBeGreaterThan(manualPane.paneId)
      expect(layoutState.panes[1].paneId).toBeGreaterThan(manualPane.paneId)
      // And they should be sequential
      expect(layoutState.panes[1].paneId).toBe(layoutState.panes[0].paneId + 1)
    })

    it('_paneIdCounter continues incrementing after initHorizontalSplitLayout (counter not reset)', async () => {
      const { layoutState, initHorizontalSplitLayout, createPane } =
        await import('./layout-store.svelte')
      initHorizontalSplitLayout(1, 2)
      const lastPaneId = layoutState.panes[1].paneId
      // Create another pane after - should continue from where we left off
      const newPane = createPane(3)
      expect(newPane.paneId).toBeGreaterThan(lastPaneId)
    })
  })
})
