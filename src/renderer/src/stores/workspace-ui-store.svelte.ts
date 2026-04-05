/**
 * Copyright 2026 V
 * SPDX-License-Identifier: Apache-2.0
 *
 * Workspace UI Store - Svelte 5 runes-based ephemeral state management
 * Tracks ephemeral UI state that should NOT be serialized to TOML
 */

export interface WorkspaceUIState {
  focusedPaneId: number | null
  isFocusMode: boolean // NEW: true saat Focus Mode aktif
}

export const workspaceUIState = $state<WorkspaceUIState>({
  focusedPaneId: null,
  isFocusMode: false // default: tidak ada Focus Mode
})

export function setFocusedPaneId(paneId: number | null): void {
  workspaceUIState.focusedPaneId = paneId
}

// NEW function:
export function setFocusMode(active: boolean): void {
  workspaceUIState.isFocusMode = active
}

/**
 * Activate Focus Mode on the given pane.
 * Guard: no-op if paneId is null or Focus Mode already active (AC #4, #5).
 */
export function enterFocusMode(paneId: number | null): void {
  if (paneId === null) return
  if (workspaceUIState.isFocusMode) return // already in focus mode
  workspaceUIState.focusedPaneId = paneId
  workspaceUIState.isFocusMode = true
}
