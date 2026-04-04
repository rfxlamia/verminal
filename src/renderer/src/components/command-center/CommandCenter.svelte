<!--
  Copyright 2026 V
  SPDX-License-Identifier: Apache-2.0

  Command Center Overlay - Launcher-style overlay for workspace selection
-->
<script lang="ts">
  import { onDestroy } from 'svelte'
  import { commandCenterState, closeCommandCenter } from '../../stores/command-center-store.svelte'
  import { workspaceUIState } from '../../stores/workspace-ui-store.svelte'

  let backdropEl: HTMLDivElement | null = $state(null)
  let isMounted = true

  onDestroy(() => {
    isMounted = false
  })

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

  function isFocusable(element: HTMLElement): boolean {
    return (
      element.tabIndex >= 0 &&
      !element.hasAttribute('disabled') &&
      !element.hasAttribute('hidden') &&
      getComputedStyle(element).display !== 'none'
    )
  }

  function closeAndRestoreFocus(): void {
    // Capture focusedPaneId BEFORE closing (state may change)
    const focusedPaneId = workspaceUIState.focusedPaneId
    closeCommandCenter()
    // Use queueMicrotask to ensure DOM updates before restoring focus
    queueMicrotask(() => {
      // Guard: component may have unmounted
      if (!isMounted) return

      if (focusedPaneId !== null && Number.isFinite(focusedPaneId)) {
        // Sanitize paneId for CSS selector safety
        const sanitizedId = String(focusedPaneId).replace(/[^a-zA-Z0-9_-]/g, '')
        const paneEl = document.querySelector<HTMLElement>(`[data-pane-id="${sanitizedId}"]`)
        // Defensive: only focus if element exists, is in DOM, and is focusable
        if (paneEl && document.contains(paneEl) && isFocusable(paneEl)) {
          paneEl.focus()
          return
        }
      }

      // Fallback to workspace container if no pane is focused or pane no longer exists
      const workspaceEl = document.querySelector<HTMLElement>('.workspace-container')
      if (workspaceEl) {
        workspaceEl.focus()
      }
    })
  }

  // Auto-focus backdrop when opened
  $effect(() => {
    if (commandCenterState.isOpen && backdropEl) {
      backdropEl.focus()
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
    background: var(--cc-backdrop);
  }

  .command-center-panel {
    background: var(--cc-surface-secondary);
    border-radius: 8px;
    padding: 32px;
    min-width: 480px;
    max-width: 640px;
    width: 100%;
    font-family: 'Work Sans', system-ui, sans-serif;
    color: var(--cc-text-primary);
    box-shadow: 0 16px 48px var(--cc-shadow);
  }

  .command-center-title {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 24px;
    color: var(--cc-text-primary);
  }

  .command-center-hint {
    font-size: 12px;
    color: var(--cc-text-muted);
    margin: 24px 0 0;
    text-align: center;
  }
</style>
