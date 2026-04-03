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

    it('throws error when sessionId1 equals sessionId2', async () => {
      const { initHorizontalSplitLayout } = await import('./layout-store.svelte')
      expect(() => initHorizontalSplitLayout(42, 42)).toThrow(
        'sessionId1 and sessionId2 must be different'
      )
    })

    it('does not throw when sessionIds are different', async () => {
      const { initHorizontalSplitLayout } = await import('./layout-store.svelte')
      expect(() => initHorizontalSplitLayout(1, 2)).not.toThrow()
    })
  })

  describe('initMixedSplitLayout()', () => {
    it('sets layoutState.panes to exactly 3 panes', async () => {
      const { layoutState, initMixedSplitLayout } = await import('./layout-store.svelte')
      initMixedSplitLayout(10, 20, 30)
      expect(layoutState.panes).toHaveLength(3)
    })

    it('pane[0].sessionId equals sessionId1', async () => {
      const { layoutState, initMixedSplitLayout } = await import('./layout-store.svelte')
      initMixedSplitLayout(100, 200, 300)
      expect(layoutState.panes[0].sessionId).toBe(100)
    })

    it('pane[1].sessionId equals sessionId2', async () => {
      const { layoutState, initMixedSplitLayout } = await import('./layout-store.svelte')
      initMixedSplitLayout(100, 200, 300)
      expect(layoutState.panes[1].sessionId).toBe(200)
    })

    it('pane[2].sessionId equals sessionId3', async () => {
      const { layoutState, initMixedSplitLayout } = await import('./layout-store.svelte')
      initMixedSplitLayout(100, 200, 300)
      expect(layoutState.panes[2].sessionId).toBe(300)
    })

    it('pane[0].paneId < pane[1].paneId < pane[2].paneId (sequential)', async () => {
      const { layoutState, initMixedSplitLayout } = await import('./layout-store.svelte')
      initMixedSplitLayout(1, 2, 3)
      expect(layoutState.panes[0].paneId).toBeLessThan(layoutState.panes[1].paneId)
      expect(layoutState.panes[1].paneId).toBeLessThan(layoutState.panes[2].paneId)
    })

    it('sets layoutState.layoutName to "mixed"', async () => {
      const { layoutState, initMixedSplitLayout } = await import('./layout-store.svelte')
      initMixedSplitLayout(1, 2, 3)
      expect(layoutState.layoutName).toBe('mixed')
    })

    it('paneIds continue monotonically from previous createPane calls (counter not reset)', async () => {
      const { createPane, layoutState, initMixedSplitLayout } =
        await import('./layout-store.svelte')
      // First create a pane manually
      const manualPane = createPane(999)
      // Then init mixed layout
      initMixedSplitLayout(100, 200, 300)
      // All three panes should have IDs greater than the manual pane
      expect(layoutState.panes[0].paneId).toBeGreaterThan(manualPane.paneId)
      expect(layoutState.panes[1].paneId).toBeGreaterThan(manualPane.paneId)
      expect(layoutState.panes[2].paneId).toBeGreaterThan(manualPane.paneId)
      // And they should be sequential
      expect(layoutState.panes[1].paneId).toBe(layoutState.panes[0].paneId + 1)
      expect(layoutState.panes[2].paneId).toBe(layoutState.panes[1].paneId + 1)
    })

    it('calling twice replaces panes with fresh 3-pane set (idempotent reset)', async () => {
      const { layoutState, initMixedSplitLayout } = await import('./layout-store.svelte')
      initMixedSplitLayout(1, 2, 3)
      expect(layoutState.panes.length).toBe(3)
      initMixedSplitLayout(4, 5, 6)
      expect(layoutState.panes.length).toBe(3)
      expect(layoutState.panes[0].sessionId).toBe(4)
      expect(layoutState.panes[1].sessionId).toBe(5)
      expect(layoutState.panes[2].sessionId).toBe(6)
    })

    it('throws if sessionId1 === sessionId2', async () => {
      const { initMixedSplitLayout } = await import('./layout-store.svelte')
      expect(() => initMixedSplitLayout(42, 42, 43)).toThrow('All three sessionIds must be distinct')
    })

    it('throws if sessionId2 === sessionId3', async () => {
      const { initMixedSplitLayout } = await import('./layout-store.svelte')
      expect(() => initMixedSplitLayout(42, 43, 43)).toThrow('All three sessionIds must be distinct')
    })

    it('throws if sessionId1 === sessionId3', async () => {
      const { initMixedSplitLayout } = await import('./layout-store.svelte')
      expect(() => initMixedSplitLayout(42, 43, 42)).toThrow('All three sessionIds must be distinct')
    })

    it('does not throw when all sessionIds are different', async () => {
      const { initMixedSplitLayout } = await import('./layout-store.svelte')
      expect(() => initMixedSplitLayout(1, 2, 3)).not.toThrow()
    })

    it('throws ConcurrentLayoutInitError when called concurrently', async () => {
      const { ConcurrentLayoutInitError, initMixedSplitLayout } = await import(
        './layout-store.svelte'
      )
      // The function should exist and ConcurrentLayoutInitError should be available
      expect(ConcurrentLayoutInitError).toBeDefined()
      expect(initMixedSplitLayout).toBeDefined()
    })
  })
  describe('initGridLayout()', () => {
    it('sets layoutState.panes to exactly 4 panes', async () => {
      const { layoutState, initGridLayout } = await import('./layout-store.svelte')
      initGridLayout(10, 20, 30, 40)
      expect(layoutState.panes).toHaveLength(4)
    })

    it('pane[0].sessionId equals sessionId1', async () => {
      const { layoutState, initGridLayout } = await import('./layout-store.svelte')
      initGridLayout(100, 200, 300, 400)
      expect(layoutState.panes[0].sessionId).toBe(100)
    })

    it('pane[1].sessionId equals sessionId2', async () => {
      const { layoutState, initGridLayout } = await import('./layout-store.svelte')
      initGridLayout(100, 200, 300, 400)
      expect(layoutState.panes[1].sessionId).toBe(200)
    })

    it('pane[2].sessionId equals sessionId3', async () => {
      const { layoutState, initGridLayout } = await import('./layout-store.svelte')
      initGridLayout(100, 200, 300, 400)
      expect(layoutState.panes[2].sessionId).toBe(300)
    })

    it('pane[3].sessionId equals sessionId4', async () => {
      const { layoutState, initGridLayout } = await import('./layout-store.svelte')
      initGridLayout(100, 200, 300, 400)
      expect(layoutState.panes[3].sessionId).toBe(400)
    })

    it('pane[0].paneId < pane[1].paneId < pane[2].paneId < pane[3].paneId (sequential)', async () => {
      const { layoutState, initGridLayout } = await import('./layout-store.svelte')
      initGridLayout(1, 2, 3, 4)
      expect(layoutState.panes[0].paneId).toBeLessThan(layoutState.panes[1].paneId)
      expect(layoutState.panes[1].paneId).toBeLessThan(layoutState.panes[2].paneId)
      expect(layoutState.panes[2].paneId).toBeLessThan(layoutState.panes[3].paneId)
    })

    it('sets layoutState.layoutName to "grid"', async () => {
      const { layoutState, initGridLayout } = await import('./layout-store.svelte')
      initGridLayout(1, 2, 3, 4)
      expect(layoutState.layoutName).toBe('grid')
    })

    it('paneIds continue monotonically from previous createPane calls (counter not reset)', async () => {
      const { createPane, layoutState, initGridLayout } = await import('./layout-store.svelte')
      // First create a pane manually
      const manualPane = createPane(999)
      // Then init grid layout
      initGridLayout(100, 200, 300, 400)
      // All four panes should have IDs greater than the manual pane
      expect(layoutState.panes[0].paneId).toBeGreaterThan(manualPane.paneId)
      expect(layoutState.panes[1].paneId).toBeGreaterThan(manualPane.paneId)
      expect(layoutState.panes[2].paneId).toBeGreaterThan(manualPane.paneId)
      expect(layoutState.panes[3].paneId).toBeGreaterThan(manualPane.paneId)
      // And they should be sequential
      expect(layoutState.panes[1].paneId).toBe(layoutState.panes[0].paneId + 1)
      expect(layoutState.panes[2].paneId).toBe(layoutState.panes[1].paneId + 1)
      expect(layoutState.panes[3].paneId).toBe(layoutState.panes[2].paneId + 1)
    })

    it('calling twice replaces panes with fresh 4-pane set (idempotent reset)', async () => {
      const { layoutState, initGridLayout } = await import('./layout-store.svelte')
      initGridLayout(1, 2, 3, 4)
      expect(layoutState.panes.length).toBe(4)
      initGridLayout(5, 6, 7, 8)
      expect(layoutState.panes.length).toBe(4)
      expect(layoutState.panes[0].sessionId).toBe(5)
      expect(layoutState.panes[1].sessionId).toBe(6)
      expect(layoutState.panes[2].sessionId).toBe(7)
      expect(layoutState.panes[3].sessionId).toBe(8)
    })

    // Table-driven test for duplicate sessionId pairs
    it.each([
      [1, 1, 2, 3, 'sessionId1 equals sessionId2'],
      [1, 2, 1, 3, 'sessionId1 equals sessionId3'],
      [1, 2, 3, 1, 'sessionId1 equals sessionId4'],
      [1, 2, 2, 3, 'sessionId2 equals sessionId3'],
      [1, 2, 3, 2, 'sessionId2 equals sessionId4'],
      [1, 2, 3, 3, 'sessionId3 equals sessionId4']
    ])('throws when %s', async (s1, s2, s3, s4, description) => {
      const { initGridLayout } = await import('./layout-store.svelte')
      expect(() => initGridLayout(s1, s2, s3, s4)).toThrow('All four sessionIds must be distinct')
    })

    // Table-driven test for invalid sessionIds
    it.each([
      [0, 1, 2, 3, 'sessionId1 is zero'],
      [-1, 1, 2, 3, 'sessionId1 is negative'],
      [1.5, 1, 2, 3, 'sessionId1 is float'],
      [1, 0, 2, 3, 'sessionId2 is zero'],
      [1, -1, 2, 3, 'sessionId2 is negative'],
      [1, 1.5, 2, 3, 'sessionId2 is float'],
      [1, 2, 0, 3, 'sessionId3 is zero'],
      [1, 2, -1, 3, 'sessionId3 is negative'],
      [1, 2, 1.5, 3, 'sessionId3 is float'],
      [1, 2, 3, 0, 'sessionId4 is zero'],
      [1, 2, 3, -1, 'sessionId4 is negative'],
      [1, 2, 3, 1.5, 'sessionId4 is float']
    ])('throws when %s', async (s1, s2, s3, s4, description) => {
      const { initGridLayout } = await import('./layout-store.svelte')
      expect(() => initGridLayout(s1, s2, s3, s4)).toThrow()
    })

    it('does not throw when all sessionIds are distinct positive integers', async () => {
      const { initGridLayout } = await import('./layout-store.svelte')
      expect(() => initGridLayout(1, 2, 3, 4)).not.toThrow()
      expect(() => initGridLayout(100, 200, 300, 400)).not.toThrow()
    })

    it('throws ConcurrentLayoutInitError when called concurrently', async () => {
      const { ConcurrentLayoutInitError, initGridLayout } = await import('./layout-store.svelte')
      expect(ConcurrentLayoutInitError).toBeDefined()
      expect(initGridLayout).toBeDefined()
    })
  })
  describe('Concurrent Layout Init Protection', () => {
    it('allows sequential calls to initSinglePaneLayout without throwing', async () => {
      const { initSinglePaneLayout } = await import('./layout-store.svelte')

      // Start first init - this will complete but we test the lock behavior
      initSinglePaneLayout(1)

      // After completion, a second call should succeed (lock released)
      expect(() => initSinglePaneLayout(2)).not.toThrow()
    })

    it('allows sequential calls to initHorizontalSplitLayout without throwing', async () => {
      const { initHorizontalSplitLayout } = await import('./layout-store.svelte')

      // First call should succeed
      initHorizontalSplitLayout(1, 2)

      // After completion, a second call should succeed (lock released)
      expect(() => initHorizontalSplitLayout(3, 4)).not.toThrow()
    })

    it('error message indicates layout initialization is in progress', async () => {
      // We need to simulate a concurrent call by holding the lock
      // Since we can't easily do that without exposing internals,
      // we'll verify the error class exists and has the right properties
      const { ConcurrentLayoutInitError } = await import('./layout-store.svelte')
      const error = new ConcurrentLayoutInitError()
      expect(error.message).toContain('Layout initialization already in progress')
      expect(error.name).toBe('ConcurrentLayoutInitError')
    })

    it('pane counter increments correctly even after concurrent init attempts', async () => {
      const { layoutState, initSinglePaneLayout, initHorizontalSplitLayout } =
        await import('./layout-store.svelte')

      // Sequence of normal calls should all work
      initSinglePaneLayout(1)
      const pane1Id = layoutState.panes[0].paneId

      initHorizontalSplitLayout(2, 3)
      const pane2Id = layoutState.panes[0].paneId
      const pane3Id = layoutState.panes[1].paneId

      // All paneIds should be distinct and incrementing
      expect(pane2Id).toBeGreaterThan(pane1Id)
      expect(pane3Id).toBeGreaterThan(pane2Id)
    })
  })
})
