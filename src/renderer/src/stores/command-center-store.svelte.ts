/**
 * Copyright 2026 V
 * SPDX-License-Identifier: Apache-2.0
 *
 * Command Center Store - Svelte 5 runes-based ephemeral state management
 * Tracks Command Center open/close state (ephemeral - NOT serialized to TOML)
 */

export interface CommandCenterState {
  isOpen: boolean
}

// Starts OPEN per FR1: Command Center auto-shows on first launch
export const commandCenterState = $state<CommandCenterState>({
  isOpen: true
})

export function openCommandCenter(): void {
  commandCenterState.isOpen = true
}

export function closeCommandCenter(): void {
  commandCenterState.isOpen = false
}

/**
 * Resets the command center state for testing purposes.
 * Resets isOpen to default (true) for fresh test state.
 */
export function resetCommandCenterState(): void {
  commandCenterState.isOpen = true
}
