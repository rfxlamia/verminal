<!--
  Copyright 2026 V
  SPDX-License-Identifier: Apache-2.0

  Command Center Overlay - Launcher-style overlay for workspace selection
-->
<script lang="ts">
  import { commandCenterState, closeCommandCenter } from '../../stores/command-center-store.svelte'
  import { workspaceUIState } from '../../stores/workspace-ui-store.svelte'

  let backdropEl: HTMLDivElement | null = $state(null)

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeAndRestoreFocus()
    } else if (event.key === 'Tab') {
      // Trap focus inside the overlay for Story 4.1
      // This prevents Tab from escaping to the workspace while CC is open
      event.preventDefault()
    }
  }

  function closeAndRestoreFocus(): void {
    const focusedPaneId = workspaceUIState.focusedPaneId
    closeCommandCenter()
    // Use queueMicrotask to ensure DOM updates before restoring focus
    queueMicrotask(() => {
      if (focusedPaneId !== null) {
        const paneEl = document.querySelector<HTMLElement>(`[data-pane-id="${focusedPaneId}"]`)
        paneEl?.focus()
        if (paneEl) return
      }

      // Fallback to workspace container if no pane is focused
      document.querySelector<HTMLElement>('.workspace-container')?.focus()
    })
  }

  // Auto-focus backdrop when opened
  $effect(() => {
    if (commandCenterState.isOpen) {
      backdropEl?.focus()
    }
  })
</script>

{#if commandCenterState.isOpen}
  <!-- Backdrop: full-viewport backdrop, click outside does NOT close (use Esc) -->
  <!-- Role: dialog, aria-modal: true for accessibility -->
  <div
    bind:this={backdropEl}
    class="command-center-backdrop"
    role="dialog"
    aria-modal="true"
    aria-label="Command Center"
    onkeydown={handleKeydown}
    tabindex="-1"
  >
    <div class="command-center-panel">
      <h2 class="command-center-title">Command Center</h2>
      <!-- Story 4.2: PresetLauncher goes here -->
      <!-- Story 4.3: SavedLayoutList goes here -->
      <!-- Story 4.4: LayoutPreview goes here -->
      <p class="command-center-hint">Press Esc to dismiss</p>
    </div>
  </div>
{/if}

<style>
  .command-center-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
  }

  .command-center-panel {
    background: #2c2c2c;
    border-radius: 8px;
    padding: 32px;
    min-width: 480px;
    max-width: 640px;
    width: 100%;
    font-family: 'Work Sans', system-ui, sans-serif;
    color: #f7f7f7;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
  }

  .command-center-title {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 24px;
    color: #f7f7f7;
  }

  .command-center-hint {
    font-size: 12px;
    color: #888;
    margin: 24px 0 0;
    text-align: center;
  }
</style>
