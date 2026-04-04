/**
 * Copyright 2026 V
 * SPDX-License-Identifier: Apache-2.0
 *
 * Workspace UI Store - Svelte 5 runes-based ephemeral state management
 * Tracks ephemeral UI state that should NOT be serialized to TOML
 */

export interface WorkspaceUIState {
  focusedPaneId: number | null
}

export const workspaceUIState = $state<WorkspaceUIState>({
  focusedPaneId: null
})

export function setFocusedPaneId(paneId: number | null): void {
  workspaceUIState.focusedPaneId = paneId
}
