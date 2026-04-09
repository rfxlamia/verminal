/**
 * Copyright 2026 V
 * SPDX-License-Identifier: Apache-2.0
 *
 * Layout Store - Svelte 5 runes-based state management
 * Defines pane state and layout configuration
 */

import type { PaneColor } from '../../../shared/ipc-contract'

export type { PaneColor }

export interface PaneState {
  paneId: number
  sessionId: number
  name: string
  color?: PaneColor
  command?: string
}

export interface LayoutState {
  layoutName: LayoutName
  panes: PaneState[]
}

/** Valid layout preset names */
export type LayoutName = 'single' | 'horizontal' | 'mixed' | 'grid' | ''

// CRITICAL: Only createPane() may read/write this counter
// Sequential integer IDs starting from 1
let _paneIdCounter = 0

// Guard flag to prevent concurrent layout initialization
let _layoutInitLock = false

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
 * Error thrown when a layout initialization is attempted while another is in progress.
 */
export class ConcurrentLayoutInitError extends Error {
  constructor() {
    super('Layout initialization already in progress. Cannot start another layout init.')
    this.name = 'ConcurrentLayoutInitError'
  }
}

/**
 * Acquires the layout initialization lock.
 * Returns true if lock acquired, false otherwise.
 */
function acquireLayoutInitLock(): boolean {
  if (_layoutInitLock) {
    return false
  }
  _layoutInitLock = true
  return true
}

/**
 * Releases the layout initialization lock.
 */
function releaseLayoutInitLock(): void {
  _layoutInitLock = false
}

/**
 * Initializes the layout with a single pane (FR13).
 * Resets panes array to [1 pane].
 * Note: _paneIdCounter is NOT reset - IDs are monotonically increasing.
 * @throws {ConcurrentLayoutInitError} If another layout initialization is in progress
 */
export function initSinglePaneLayout(sessionId: number): void {
  if (!acquireLayoutInitLock()) {
    throw new ConcurrentLayoutInitError()
  }

  try {
    validateSessionId(sessionId, 'sessionId')
    const pane = createPane(sessionId)
    layoutState.layoutName = 'single'
    layoutState.panes = [pane]
  } finally {
    releaseLayoutInitLock()
  }
}

/**
 * Initializes the layout with two side-by-side panes (FR14).
 * Resets panes array to [2 panes] in horizontal split.
 * Note: _paneIdCounter is NOT reset — IDs are monotonically increasing.
 * @throws {ConcurrentLayoutInitError} If another layout initialization is in progress
 */
export function initHorizontalSplitLayout(sessionId1: number, sessionId2: number): void {
  if (!acquireLayoutInitLock()) {
    throw new ConcurrentLayoutInitError()
  }

  try {
    validateSessionId(sessionId1, 'sessionId1')
    validateSessionId(sessionId2, 'sessionId2')
    if (sessionId1 === sessionId2) {
      throw new Error(
        `sessionId1 and sessionId2 must be different (both are ${sessionId1}). ` +
          'Each pane must control a unique PTY session.'
      )
    }
    const pane1 = createPane(sessionId1)
    const pane2 = createPane(sessionId2)
    layoutState.layoutName = 'horizontal'
    layoutState.panes = [pane1, pane2]
  } finally {
    releaseLayoutInitLock()
  }
}

/**
 * Validates that a session ID is a positive integer.
 * @throws {Error} If sessionId is not a positive integer
 */
function validateSessionId(sessionId: number, name: string): void {
  if (!Number.isFinite(sessionId) || !Number.isInteger(sessionId) || sessionId <= 0) {
    throw new Error(`${name} must be a positive integer. Got: ${sessionId}`)
  }
}

/**
 * Initializes the layout with mixed split: 1 top pane (full width) + 2 bottom panes (FR15).
 * Resets panes array to [3 panes]:
 *   panes[0] = top pane (will span full width via grid-column: 1 / -1)
 *   panes[1] = bottom-left pane
 *   panes[2] = bottom-right pane
 * Note: _paneIdCounter is NOT reset — IDs are monotonically increasing.
 * @throws {ConcurrentLayoutInitError} If another layout initialization is in progress
 */
export function initMixedSplitLayout(
  sessionId1: number,
  sessionId2: number,
  sessionId3: number
): void {
  if (!acquireLayoutInitLock()) {
    throw new ConcurrentLayoutInitError()
  }

  try {
    validateSessionId(sessionId1, 'sessionId1')
    validateSessionId(sessionId2, 'sessionId2')
    validateSessionId(sessionId3, 'sessionId3')
    if (sessionId1 === sessionId2 || sessionId2 === sessionId3 || sessionId1 === sessionId3) {
      throw new Error(
        `All three sessionIds must be distinct. Got: ${sessionId1}, ${sessionId2}, ${sessionId3}`
      )
    }
    const pane1 = createPane(sessionId1)
    const pane2 = createPane(sessionId2)
    const pane3 = createPane(sessionId3)
    layoutState.layoutName = 'mixed'
    layoutState.panes = [pane1, pane2, pane3]
  } finally {
    releaseLayoutInitLock()
  }
}

/**
 * Initializes the layout with a 2×2 grid: 4 equal panes (FR16).
 * Resets panes array to [4 panes]:
 *   panes[0] = top-left (auto-placed)
 *   panes[1] = top-right (auto-placed)
 *   panes[2] = bottom-left (auto-placed)
 *   panes[3] = bottom-right (auto-placed)
 * Note: _paneIdCounter is NOT reset — IDs are monotonically increasing.
 * @throws {ConcurrentLayoutInitError} If another layout initialization is in progress
 */
export function initGridLayout(
  sessionId1: number,
  sessionId2: number,
  sessionId3: number,
  sessionId4: number
): void {
  if (!acquireLayoutInitLock()) {
    throw new ConcurrentLayoutInitError()
  }

  try {
    validateSessionId(sessionId1, 'sessionId1')
    validateSessionId(sessionId2, 'sessionId2')
    validateSessionId(sessionId3, 'sessionId3')
    validateSessionId(sessionId4, 'sessionId4')
    if (
      sessionId1 === sessionId2 ||
      sessionId1 === sessionId3 ||
      sessionId1 === sessionId4 ||
      sessionId2 === sessionId3 ||
      sessionId2 === sessionId4 ||
      sessionId3 === sessionId4
    ) {
      throw new Error(
        `All four sessionIds must be distinct. Got: ${sessionId1}, ${sessionId2}, ${sessionId3}, ${sessionId4}`
      )
    }
    const pane1 = createPane(sessionId1)
    const pane2 = createPane(sessionId2)
    const pane3 = createPane(sessionId3)
    const pane4 = createPane(sessionId4)
    layoutState.layoutName = 'grid'
    layoutState.panes = [pane1, pane2, pane3, pane4]
  } finally {
    releaseLayoutInitLock()
  }
}

/**
 * Resets the layout state for testing purposes.
 * Clears panes and layout name.
 * Also resets the layout initialization lock.
 */
export function resetLayoutState(): void {
  layoutState.panes = []
  layoutState.layoutName = ''
  _layoutInitLock = false
}

/**
 * Renames a pane by its paneId.
 * No-op if pane not found or newName is empty/whitespace.
 */
export function renamePaneInLayout(paneId: number, newName: string): void {
  const pane = layoutState.panes.find((p) => p.paneId === paneId)
  if (pane && newName.trim()) {
    pane.name = newName.trim()
  }
}

/**
 * Changes the color of a pane by its paneId.
 * No-op if pane not found.
 * Setting color to undefined removes the color tag.
 */
export function recolorPaneInLayout(paneId: number, color: PaneColor | undefined): void {
  // Runtime validation: only allow valid PaneColor values or undefined
  if (color !== undefined) {
    const validColors: PaneColor[] = [
      'gray',
      'red',
      'orange',
      'amber',
      'green',
      'teal',
      'blue',
      'purple'
    ]
    if (!validColors.includes(color)) {
      return
    }
  }
  const pane = layoutState.panes.find((p) => p.paneId === paneId)
  if (pane) {
    pane.color = color
  }
}
