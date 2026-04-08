import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('workspace-ui-store', () => {
  beforeEach(() => {
    // Reset modules to get fresh state for each test
    vi.resetModules()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('workspaceUIState', () => {
    it('focusedPaneId defaults to null', async () => {
      const { workspaceUIState } = await import('./workspace-ui-store.svelte')
      expect(workspaceUIState.focusedPaneId).toBeNull()
    })
  })

  describe('setFocusedPaneId()', () => {
    it('setFocusedPaneId(3) sets focusedPaneId to 3', async () => {
      const { workspaceUIState, setFocusedPaneId } = await import('./workspace-ui-store.svelte')
      setFocusedPaneId(3)
      expect(workspaceUIState.focusedPaneId).toBe(3)
    })

    it('setFocusedPaneId(null) clears focusedPaneId to null', async () => {
      const { workspaceUIState, setFocusedPaneId } = await import('./workspace-ui-store.svelte')
      // First set to a value
      setFocusedPaneId(5)
      expect(workspaceUIState.focusedPaneId).toBe(5)
      // Then clear it
      setFocusedPaneId(null)
      expect(workspaceUIState.focusedPaneId).toBeNull()
    })

    it('setFocusedPaneId can be called multiple times without error', async () => {
      const { workspaceUIState, setFocusedPaneId } = await import('./workspace-ui-store.svelte')
      // Call multiple times
      setFocusedPaneId(1)
      setFocusedPaneId(2)
      setFocusedPaneId(3)
      setFocusedPaneId(1)
      setFocusedPaneId(null)
      setFocusedPaneId(10)
      // Final value should be 10
      expect(workspaceUIState.focusedPaneId).toBe(10)
    })

    it('focusedPaneId updates are reactive across multiple imports', async () => {
      const { setFocusedPaneId } = await import('./workspace-ui-store.svelte')
      // Import again to get fresh reference to the state object
      const { workspaceUIState: stateRef } = await import('./workspace-ui-store.svelte')
      setFocusedPaneId(42)
      expect(stateRef.focusedPaneId).toBe(42)
    })
  })

  describe('WorkspaceUIState - focus mode', () => {
    it('initializes with isFocusMode: false', async () => {
      const { workspaceUIState } = await import('./workspace-ui-store.svelte')
      expect(workspaceUIState.isFocusMode).toBe(false)
    })

    it('setFocusMode(true) sets isFocusMode to true', async () => {
      const { workspaceUIState, setFocusMode } = await import('./workspace-ui-store.svelte')
      setFocusMode(true)
      expect(workspaceUIState.isFocusMode).toBe(true)
    })

    it('setFocusMode(false) sets isFocusMode to false', async () => {
      const { workspaceUIState, setFocusMode } = await import('./workspace-ui-store.svelte')
      setFocusMode(true)
      setFocusMode(false)
      expect(workspaceUIState.isFocusMode).toBe(false)
    })
  })

  describe('enterFocusMode', () => {
    it('sets isFocusMode: true and focusedPaneId to the given paneId', async () => {
      const { workspaceUIState, enterFocusMode } = await import('./workspace-ui-store.svelte')
      enterFocusMode(3)
      expect(workspaceUIState.isFocusMode).toBe(true)
      expect(workspaceUIState.focusedPaneId).toBe(3)
    })

    it('does nothing if paneId is null (guard)', async () => {
      const { workspaceUIState, enterFocusMode } = await import('./workspace-ui-store.svelte')
      enterFocusMode(null)
      expect(workspaceUIState.isFocusMode).toBe(false)
    })

    it('does nothing if already in focus mode (re-entry guard, AC #5)', async () => {
      const { workspaceUIState, enterFocusMode } = await import('./workspace-ui-store.svelte')
      enterFocusMode(1)
      const before = { ...workspaceUIState }
      enterFocusMode(2) // different pane while already focused
      expect(workspaceUIState.focusedPaneId).toBe(before.focusedPaneId)
    })
  })

  describe('notifyBackgroundPaneOutput()', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.clearAllTimers()
      vi.useRealTimers()
    })

    it('adds paneId to pulsingPaneIds when focus mode is active and pane is background', async () => {
      const { workspaceUIState, enterFocusMode, notifyBackgroundPaneOutput } =
        await import('./workspace-ui-store.svelte')

      enterFocusMode(1)

      notifyBackgroundPaneOutput(2)

      expect(workspaceUIState.pulsingPaneIds.has(2)).toBe(true)
    })

    it('does NOT add paneId to pulsingPaneIds for the focused pane', async () => {
      const { workspaceUIState, enterFocusMode, notifyBackgroundPaneOutput } =
        await import('./workspace-ui-store.svelte')

      enterFocusMode(1)

      notifyBackgroundPaneOutput(1) // pane 1 is the focused pane

      expect(workspaceUIState.pulsingPaneIds.has(1)).toBe(false)
    })

    it('does NOT add paneId to pulsingPaneIds when focus mode is inactive', async () => {
      const { workspaceUIState, notifyBackgroundPaneOutput } =
        await import('./workspace-ui-store.svelte')

      notifyBackgroundPaneOutput(2)

      expect(workspaceUIState.pulsingPaneIds.has(2)).toBe(false)
    })

    it('removes paneId from pulsingPaneIds after 300ms', async () => {
      const { workspaceUIState, enterFocusMode, notifyBackgroundPaneOutput } =
        await import('./workspace-ui-store.svelte')

      enterFocusMode(1)

      notifyBackgroundPaneOutput(2)
      expect(workspaceUIState.pulsingPaneIds.has(2)).toBe(true)

      vi.advanceTimersByTime(300)
      expect(workspaceUIState.pulsingPaneIds.has(2)).toBe(false)
    })

    it('debounces: timer restarts if notifyBackgroundPaneOutput is called again within 300ms', async () => {
      const { workspaceUIState, enterFocusMode, notifyBackgroundPaneOutput } =
        await import('./workspace-ui-store.svelte')

      enterFocusMode(1)

      notifyBackgroundPaneOutput(2) // t=0ms
      vi.advanceTimersByTime(200) // t=200ms — still pulsing (not yet 300ms)
      expect(workspaceUIState.pulsingPaneIds.has(2)).toBe(true)

      notifyBackgroundPaneOutput(2) // restart timer at t=200ms
      vi.advanceTimersByTime(200) // t=400ms — only 200ms since last notify, still pulsing
      expect(workspaceUIState.pulsingPaneIds.has(2)).toBe(true)

      vi.advanceTimersByTime(100) // t=500ms — 300ms since last notify, should be gone
      expect(workspaceUIState.pulsingPaneIds.has(2)).toBe(false)
    })
  })
})
