/**
 * Copyright 2026 V
 * SPDX-License-Identifier: Apache-2.0
 *
 * Layout Store - Svelte 5 runes-based state management
 * Defines pane state and layout configuration
 */

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
export const layoutState = $state<LayoutState>({
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

/**
 * Initializes the layout with two side-by-side panes (FR14).
 * Resets panes array to [2 panes] in horizontal split.
 * Note: _paneIdCounter is NOT reset — IDs are monotonically increasing.
 */
export function initHorizontalSplitLayout(sessionId1: number, sessionId2: number): void {
  const pane1 = createPane(sessionId1)
  const pane2 = createPane(sessionId2)
  layoutState.layoutName = 'horizontal'
  layoutState.panes = [pane1, pane2]
}

/**
 * Resets the layout state for testing purposes.
 * Clears panes and layout name.
 */
export function resetLayoutState(): void {
  layoutState.panes = []
  layoutState.layoutName = ''
}
