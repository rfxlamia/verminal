/**
 * Copyright 2026 V
 * SPDX-License-Identifier: Apache-2.0
 *
 * Workspace UI Store - Svelte 5 runes-based ephemeral state management
 * Tracks ephemeral UI state that should NOT be serialized to TOML
 */

import { SvelteSet, SvelteMap } from 'svelte/reactivity'

export interface WorkspaceUIState {
  focusedPaneId: number | null
  isFocusMode: boolean // NEW: true saat Focus Mode aktif
  pulsingPaneIds: SvelteSet<number> // NEW: panes yang sedang berpulse
}

export const workspaceUIState = $state<WorkspaceUIState>({
  focusedPaneId: null,
  isFocusMode: false, // default: tidak ada Focus Mode
  pulsingPaneIds: new SvelteSet<number>() // NEW
})

// Module-level timer registry (NOT reactive state – housekeeping only)
const _pulseTimers = new SvelteMap<number, ReturnType<typeof setTimeout>>()

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

/**
 * Dipanggil saat PTY data tiba pada pane yang sedang di-background dalam Focus Mode.
 * Menambahkan paneId ke pulsingPaneIds dan menjadwalkan penghapusan setelah 300ms (debounced).
 * Guard: no-op jika Focus Mode tidak aktif atau ini adalah focused pane.
 */
export function notifyBackgroundPaneOutput(paneId: number): void {
  if (!workspaceUIState.isFocusMode) return
  if (workspaceUIState.focusedPaneId === paneId) return

  // Tambahkan ke pulsing set (idempotent pada Set)
  workspaceUIState.pulsingPaneIds.add(paneId)

  // Debounce: restart timer agar pulse bertahan selama output terus datang
  const existing = _pulseTimers.get(paneId)
  if (existing) clearTimeout(existing)

  const timer = setTimeout(() => {
    workspaceUIState.pulsingPaneIds.delete(paneId)
    _pulseTimers.delete(paneId)
  }, 300)
  _pulseTimers.set(paneId, timer)
}

/**
 * Clears the pulse timer for a pane when the pane is destroyed.
 * Prevents orphaned timers from firing after pane destruction.
 */
export function clearPanePulseTimer(paneId: number): void {
  const existing = _pulseTimers.get(paneId)
  if (existing) {
    clearTimeout(existing)
    _pulseTimers.delete(paneId)
  }
}
