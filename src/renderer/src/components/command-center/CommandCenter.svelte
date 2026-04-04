<!--
  Copyright 2026 V
  SPDX-License-Identifier: Apache-2.0

  Command Center Overlay - Launcher-style overlay for workspace selection
-->
<script lang="ts">
  import { onDestroy } from 'svelte'
  import { commandCenterState, closeCommandCenter } from '../../stores/command-center-store.svelte'
  import { workspaceUIState } from '../../stores/workspace-ui-store.svelte'
  import { layoutState, initSinglePaneLayout, initHorizontalSplitLayout, initMixedSplitLayout, initGridLayout } from '../../stores/layout-store.svelte'
  import { requestWorkspaceReplace, onWorkspaceReplaceConfirm } from '../../stores/workspace-replace-confirmation-store.svelte'
  import PresetLauncher from './PresetLauncher.svelte'

  let backdropEl: HTMLDivElement | null = $state(null)
  let isMounted = true

  // Local state for preset launcher
  let selectedPreset = $state(1)
  let isSpawning = $state(false)
  let spawnError = $state('')

  onDestroy(() => {
    isMounted = false
  })

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeAndRestoreFocus()
    }
    // Tab handling is now managed by PresetLauncher
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

  // Auto-focus first preset button when opened
  $effect(() => {
    if (commandCenterState.isOpen && backdropEl) {
      // Focus the first preset button after a small delay
      queueMicrotask(() => {
        const firstBtn = backdropEl?.querySelector<HTMLElement>('.preset-btn')
        if (firstBtn) {
          firstBtn.focus()
        } else {
          // Fallback to backdrop if buttons not yet rendered
          backdropEl?.focus()
        }
      })
    }
  })

  async function handlePresetSubmit(paneCount: number): Promise<void> {
    await launchPreset(paneCount)
  }

  async function launchPreset(paneCount: number): Promise<void> {
    // Step 1: Capture old session IDs
    const oldSessionIds = layoutState.panes.map((pane) => pane.sessionId)

    // Step 2: If there are active sessions, request confirmation
    if (oldSessionIds.length > 0) {
      requestWorkspaceReplace(oldSessionIds.length)

      // Wait for user confirmation
      return new Promise((resolve) => {
        onWorkspaceReplaceConfirm(async () => {
          await executeSpawnFlow(paneCount, oldSessionIds)
          resolve()
        })
      })
    } else {
      // No active sessions, proceed directly
      await executeSpawnFlow(paneCount, oldSessionIds)
    }
  }

  async function executeSpawnFlow(paneCount: number, oldSessionIds: number[]): Promise<void> {
    isSpawning = true
    spawnError = ''

    try {
      // Step 3: Detect shell
      const detectResult = await window.api.shell.detect()
      if (!detectResult.ok) {
        spawnError = `Shell detection failed: ${detectResult.error.message}`
        isSpawning = false
        return
      }

      const shell = detectResult.data[0]
      if (!shell) {
        spawnError = 'No shell detected. Please check your system configuration.'
        isSpawning = false
        return
      }

      // Step 4: Get paths
      const pathsResult = await window.api.app.getPaths()
      const cwd = pathsResult.ok ? pathsResult.data.home : ''

      // Step 5: Spawn PTY sessions sequentially
      const newSessionIds: number[] = []
      for (let i = 0; i < paneCount; i++) {
        const spawnResult = await window.api.pty.spawn(shell, [], cwd)
        if (!spawnResult.ok) {
          // Cleanup any spawned sessions
          for (const sessionId of newSessionIds) {
            window.api.pty.kill(sessionId).catch(() => {
              // Ignore cleanup errors
            })
          }
          spawnError = `Failed to spawn terminal: ${spawnResult.error.message}`
          isSpawning = false
          return
        }
        newSessionIds.push(spawnResult.data.sessionId)
      }

      // Step 6: Initialize layout based on paneCount
      switch (paneCount) {
        case 1:
          initSinglePaneLayout(newSessionIds[0])
          break
        case 2:
          initHorizontalSplitLayout(newSessionIds[0], newSessionIds[1])
          break
        case 3:
          initMixedSplitLayout(newSessionIds[0], newSessionIds[1], newSessionIds[2])
          break
        case 4:
          initGridLayout(newSessionIds[0], newSessionIds[1], newSessionIds[2], newSessionIds[3])
          break
      }

      // Step 7: Kill old sessions fire-and-forget
      for (const sessionId of oldSessionIds) {
        window.api.pty.kill(sessionId).catch(() => {
          // Ignore cleanup errors
        })
      }

      // Step 8: Reset state and close
      spawnError = ''
      closeCommandCenter()
      closeAndRestoreFocus()
    } finally {
      isSpawning = false
    }
  }
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

      <PresetLauncher
        {selectedPreset}
        {isSpawning}
        errorMessage={spawnError}
        onSelect={(preset) => { selectedPreset = preset }}
        onSubmit={handlePresetSubmit}
      />

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
