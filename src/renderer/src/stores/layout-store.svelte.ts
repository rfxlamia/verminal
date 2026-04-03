// Layout Store - Svelte 5 runes-based state management
// Defines pane state and layout configuration

export interface PaneState {
  paneId: number
  sessionId: number
  name: string
}

export interface LayoutState {
  layoutName: string
  panes: PaneState[]
}

// CRITICAL: Only createPane() may read/write this counter
// Sequential integer IDs starting from 1
let _paneIdCounter = 0

// Reactive layout state using Svelte 5 runes
export let layoutState = $state<LayoutState>({
  layoutName: '',
  panes: []
})

/**
 * Creates a new pane with the next sequential paneId.
 * ONLY this function may increment _paneIdCounter.
 */
export function createPane(sessionId: number, name = ''): PaneState {
  _paneIdCounter++
  return {
    paneId: _paneIdCounter,
    sessionId,
    name: name || `Pane ${_paneIdCounter}`
  }
}

/**
 * Initializes the layout with a single pane (FR13).
 * Resets panes array to [1 pane].
 * Note: _paneIdCounter is NOT reset - IDs are monotonically increasing.
 */
export function initSinglePaneLayout(sessionId: number): void {
  const pane = createPane(sessionId)
  layoutState.layoutName = 'single'
  layoutState.panes = [pane]
}
