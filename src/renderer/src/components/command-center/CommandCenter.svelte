<!--
  Copyright 2026 V
  SPDX-License-Identifier: Apache-2.0

  Command Center Overlay - Launcher-style overlay for workspace selection
-->
<script lang="ts">
  import { onDestroy } from 'svelte'
  import { commandCenterState, closeCommandCenter } from '../../stores/command-center-store.svelte'
  import { workspaceUIState } from '../../stores/workspace-ui-store.svelte'
  import {
    layoutState,
    initSinglePaneLayout,
    initHorizontalSplitLayout,
    initMixedSplitLayout,
    initGridLayout
  } from '../../stores/layout-store.svelte'
  import {
    requestWorkspaceReplace,
    onWorkspaceReplaceConfirm
  } from '../../stores/workspace-replace-confirmation-store.svelte'
  import PresetLauncher from './PresetLauncher.svelte'
  import SavedLayoutList from './SavedLayoutList.svelte'
  import LayoutPreview from './LayoutPreview.svelte'
  import type {
    SavedLayoutData,
    SavedLayoutSummary,
    LayoutName
  } from '../../../../shared/ipc-contract'

  let backdropEl: HTMLDivElement | null = $state(null)
  let isMounted = true

  // Local state for preset launcher
  let selectedPreset = $state(1)
  let isSpawning = $state(false)
  let spawnError = $state('')

  // Saved layouts section state
  let savedLayouts = $state<SavedLayoutSummary[]>([])
  let selectedLayout = $state<string | null>(null)
  let isLoadingSavedLayouts = $state(false)
  let savedLayoutsError = $state('')

  // Load flow state
  let isLoadingLayout = $state(false)
  let loadLayoutError = $state('')

  // Active selection source for preview (AC #3)
  let activeSelectionSource = $state<'preset' | 'saved'>('preset')

  // Mapping preset to LayoutName for preview
  const presetToLayoutName: Record<number, LayoutName> = {
    1: 'single',
    2: 'horizontal',
    3: 'mixed',
    4: 'grid'
  }

  // Derived: get selected saved layout summary
  const selectedSavedLayoutSummary = $derived(
    selectedLayout ? savedLayouts.find((l) => l.name === selectedLayout) : undefined
  )

  // Derived: active preview layout name based on selection source (AC #1, #2, #3)
  const activePreviewLayoutName = $derived<LayoutName | null>(
    activeSelectionSource === 'preset'
      ? (presetToLayoutName[selectedPreset] ?? null)
      : (selectedSavedLayoutSummary?.layout_name ?? null)
  )

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
        // Guard: empty sanitizedId would create invalid selector matching unintended elements
        if (!sanitizedId) return
        const paneEl = document.querySelector<HTMLElement>(`[data-pane-id="${sanitizedId}"]`)
        // Defensive: only focus if element exists, is in DOM, and is focusable
        if (paneEl && document.contains(paneEl) && isFocusable(paneEl)) {
          try {
            paneEl.focus()
            return
          } catch {
            // Element may have become unfocusable between check and focus call
          }
        }
      }

      // Fallback to workspace container if no pane is focused or pane no longer exists
      const workspaceEl = document.querySelector<HTMLElement>('.workspace-container')
      if (workspaceEl) {
        try {
          workspaceEl.focus()
        } catch {
          // Workspace container may not be focusable
        }
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

  // Fetch saved layouts when Command Center opens
  $effect(() => {
    if (commandCenterState.isOpen) {
      fetchSavedLayouts()
    }
  })

  async function fetchSavedLayouts(): Promise<void> {
    isLoadingSavedLayouts = true
    savedLayoutsError = ''

    const result = await window.api.layout.list()

    if (result.ok) {
      savedLayouts = result.data
      // Auto-select first layout only on initial load (no previous selection)
      if (selectedLayout === null && savedLayouts.length > 0) {
        selectedLayout = savedLayouts[0].name
      } else if (selectedLayout !== null && !savedLayouts.find((l) => l.name === selectedLayout)) {
        // Previously selected layout no longer exists - clear selection, don't auto-select
        selectedLayout = null
      }
    } else {
      savedLayoutsError = `Failed to load saved layouts: ${result.error.message}`
      savedLayouts = []
      selectedLayout = null
    }

    isLoadingSavedLayouts = false
  }

  async function handlePresetSubmit(paneCount: number): Promise<void> {
    await launchPreset(paneCount)
  }

  async function handleSavedLayoutSubmit(layoutName: string): Promise<void> {
    await launchSavedLayout(layoutName)
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

  async function launchSavedLayout(layoutName: string): Promise<void> {
    // Step 1: Capture old session IDs
    const oldSessionIds = layoutState.panes.map((pane) => pane.sessionId)

    // Step 2: If there are active sessions, request confirmation
    if (oldSessionIds.length > 0) {
      requestWorkspaceReplace(oldSessionIds.length)

      // Wait for user confirmation
      return new Promise((resolve) => {
        onWorkspaceReplaceConfirm(async () => {
          await executeSavedLayoutFlow(layoutName, oldSessionIds)
          resolve()
        })
      })
    } else {
      // No active sessions, proceed directly
      await executeSavedLayoutFlow(layoutName, oldSessionIds)
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

      if (detectResult.data.length === 0) {
        spawnError = 'No shell detected. Please check your system configuration.'
        isSpawning = false
        return
      }

      const shell = detectResult.data[0]

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
            window.api.pty.kill(sessionId).catch((err: Error) => {
              console.warn('Failed to cleanup session during spawn error:', err.message)
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
        window.api.pty.kill(sessionId).catch((err: Error) => {
          console.warn('Failed to kill old session:', err.message)
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

  async function executeSavedLayoutFlow(
    layoutName: string,
    oldSessionIds: number[]
  ): Promise<void> {
    isLoadingLayout = true
    loadLayoutError = ''

    try {
      // Step 3: Load saved layout data
      const loadResult = await window.api.layout.load(layoutName)
      if (!loadResult.ok) {
        loadLayoutError = `Failed to load layout "${layoutName}": ${loadResult.error.message}`
        isLoadingLayout = false
        return
      }

      const savedLayout: SavedLayoutData = loadResult.data

      // Step 4: Check pane count (Phase 0 only supports up to 4 panes)
      const paneCount = savedLayout.panes.length
      if (paneCount > 4) {
        loadLayoutError = 'Layouts with more than 4 panes are not supported in this version.'
        isLoadingLayout = false
        return
      }

      if (paneCount === 0) {
        loadLayoutError = 'Layout contains no panes.'
        isLoadingLayout = false
        return
      }

      // Step 5: Detect shell
      const detectResult = await window.api.shell.detect()
      if (!detectResult.ok) {
        loadLayoutError = `Shell detection failed: ${detectResult.error.message}`
        isLoadingLayout = false
        return
      }

      if (detectResult.data.length === 0) {
        loadLayoutError = 'No shell detected. Please check your system configuration.'
        isLoadingLayout = false
        return
      }

      const shell = detectResult.data[0]

      // Step 6: Get paths
      const pathsResult = await window.api.app.getPaths()
      const cwd = pathsResult.ok ? pathsResult.data.home : ''

      // Step 7: Spawn PTY sessions sequentially
      const newSessionIds: number[] = []
      for (let i = 0; i < paneCount; i++) {
        const spawnResult = await window.api.pty.spawn(shell, [], cwd)
        if (!spawnResult.ok) {
          // Cleanup any spawned sessions
          for (const sessionId of newSessionIds) {
            window.api.pty.kill(sessionId).catch((err: Error) => {
              console.warn('Failed to cleanup session during load error:', err.message)
            })
          }
          loadLayoutError = `Failed to spawn terminal: ${spawnResult.error.message}`
          isLoadingLayout = false
          return
        }
        newSessionIds.push(spawnResult.data.sessionId)
      }

      // Step 8: Validate pane count matches layout type
      const expectedPaneCounts: Record<string, number> = {
        single: 1,
        horizontal: 2,
        mixed: 3,
        grid: 4
      }
      const expectedCount = expectedPaneCounts[savedLayout.layout_name]
      if (expectedCount && paneCount !== expectedCount) {
        loadLayoutError = `Layout "${savedLayout.layout_name}" expects ${expectedCount} panes, but found ${paneCount}`
        isLoadingLayout = false
        return
      }

      // Step 9: Initialize layout based on layout_name
      switch (savedLayout.layout_name) {
        case 'single':
          initSinglePaneLayout(newSessionIds[0])
          break
        case 'horizontal':
          initHorizontalSplitLayout(newSessionIds[0], newSessionIds[1])
          break
        case 'mixed':
          initMixedSplitLayout(newSessionIds[0], newSessionIds[1], newSessionIds[2])
          break
        case 'grid':
          initGridLayout(newSessionIds[0], newSessionIds[1], newSessionIds[2], newSessionIds[3])
          break
        default:
          // Fallback to single pane if unknown layout
          initSinglePaneLayout(newSessionIds[0])
      }

      // Step 10: Kill old sessions fire-and-forget
      for (const sessionId of oldSessionIds) {
        window.api.pty.kill(sessionId).catch((err: Error) => {
          console.warn('Failed to kill old session during load:', err.message)
        })
      }

      // Step 10: Reset state and close
      loadLayoutError = ''
      closeCommandCenter()
      closeAndRestoreFocus()
    } finally {
      isLoadingLayout = false
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
        onSelect={(preset) => {
          selectedPreset = preset
          activeSelectionSource = 'preset'
        }}
        onSubmit={handlePresetSubmit}
      />

      <!-- Saved Layouts Section -->
      <div class="saved-layouts-section">
        <h3 class="saved-layouts-title">Saved Layouts</h3>
        {#if isLoadingSavedLayouts}
          <p class="saved-layouts-status">Loading saved layouts...</p>
        {:else if savedLayoutsError}
          <p class="saved-layouts-error">{savedLayoutsError}</p>
        {:else if savedLayouts.length > 0}
          <SavedLayoutList
            layouts={savedLayouts}
            {selectedLayout}
            isLoading={isLoadingLayout}
            errorMessage={loadLayoutError}
            onSelect={(name) => {
              selectedLayout = name
              activeSelectionSource = 'saved'
            }}
            onSubmit={handleSavedLayoutSubmit}
          />
        {:else}
          <p class="saved-layouts-empty">No saved layouts yet. Create one from workspace.</p>
        {/if}
      </div>

      <!-- Shared Layout Preview (AC #5) -->
      <LayoutPreview layoutName={activePreviewLayoutName} />

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

  .saved-layouts-section {
    margin-top: 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 16px;
  }

  .saved-layouts-title {
    font-size: 12px;
    font-weight: 500;
    color: var(--cc-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 12px;
  }

  .saved-layouts-empty {
    font-size: 13px;
    color: var(--cc-text-muted);
    text-align: center;
    padding: 16px;
    margin: 0;
  }

  .saved-layouts-status,
  .saved-layouts-error {
    font-size: 13px;
    color: var(--cc-text-muted);
    margin: 0;
    padding: 12px;
    text-align: center;
  }

  .saved-layouts-error {
    color: #e06c75;
    background: rgba(224, 108, 117, 0.1);
    border-radius: 6px;
  }
</style>
