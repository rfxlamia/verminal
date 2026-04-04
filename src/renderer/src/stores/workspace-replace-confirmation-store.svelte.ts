/**
 * Copyright 2026 V
 * SPDX-License-Identifier: Apache-2.0
 *
 * Workspace Replace Confirmation Store - Svelte 5 runes-based state management
 * Manages confirmation dialog state when replacing workspace with active sessions
 */

export interface WorkspaceReplaceState {
  visible: boolean
  sessionCount: number
}

// Store for workspace replace confirmation dialog state
export const workspaceReplaceState = $state<WorkspaceReplaceState>({
  visible: false,
  sessionCount: 0
})

// Callback to be called when user confirms replace
let _confirmCallback: (() => void) | null = null

/**
 * Request workspace replace confirmation
 * Shows dialog if there are active sessions
 */
export function requestWorkspaceReplace(sessionCount: number): void {
  workspaceReplaceState.sessionCount = sessionCount
  workspaceReplaceState.visible = true
}

/**
 * Cancel workspace replace
 * Hides dialog without calling confirm callback
 */
export function cancelWorkspaceReplace(): void {
  workspaceReplaceState.visible = false
  workspaceReplaceState.sessionCount = 0
  _confirmCallback = null
}

/**
 * Confirm workspace replace
 * Hides dialog and calls confirm callback
 */
export function confirmWorkspaceReplace(): void {
  workspaceReplaceState.visible = false
  workspaceReplaceState.sessionCount = 0
  if (_confirmCallback) {
    _confirmCallback()
    _confirmCallback = null
  }
}

/**
 * Register callback for workspace replace confirmation
 * Called when user confirms the replace action
 */
export function onWorkspaceReplaceConfirm(callback: () => void): void {
  _confirmCallback = callback
}

/**
 * Resets the workspace replace state for testing purposes
 */
export function resetWorkspaceReplaceState(): void {
  workspaceReplaceState.visible = false
  workspaceReplaceState.sessionCount = 0
  _confirmCallback = null
}
