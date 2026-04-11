<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import PaneContainer from './PaneContainer.svelte'
  import type { PaneState } from '../../stores/layout-store.svelte'
  import { workspaceUIState } from '../../stores/workspace-ui-store.svelte'

  // Props:
  let { panes = [] }: { panes: PaneState[] } = $props()

  // Derive grid columns from pane count
  // 1 pane: 1fr | 2 panes: 1fr 1fr | 3 panes: 1fr 1fr (2 columns for mixed layout)
  let gridColumns = $derived(panes.length >= 2 ? '1fr 1fr' : '1fr')

  // Derive grid rows from pane count
  // 1 pane: 1fr | 2 panes: 1fr | 3 panes: 1fr 1fr | 4+ panes: 1fr 1fr (two rows for grid layout)
  let gridRows = $derived(panes.length >= 3 ? '1fr 1fr' : '1fr')

  // Derive focus mode state
  let isFocusMode = $derived(workspaceUIState.isFocusMode)
  let focusedPaneId = $derived(workspaceUIState.focusedPaneId)

  // Container ref for workspace-level resize orchestration
  let containerEl: HTMLDivElement | undefined = $state()

  // Guard: ensure containerEl exists before observing
  $effect(() => {
    if (containerEl && resizeObserver) {
      resizeObserver.observe(containerEl)
    }
  })

  // Resize state
  let resizeObserver: ResizeObserver | undefined
  let resizeDebounceTimer: ReturnType<typeof setTimeout> | undefined
  let resizeTick = $state(0)
  let isDestroyed = $state(false)

  // Debounce window (50ms per UX-DR25 architecture spec)
  const RESIZE_DEBOUNCE_MS = 50

  // Trigger resize when focus mode changes (after 200ms animation completes)
  $effect(() => {
    // Track focus mode changes - runs when isFocusMode changes
    void isFocusMode
    // Trigger resize after animation completes (200ms)
    setTimeout(() => {
      if (!isDestroyed) {
        resizeTick++
      }
    }, 200)
  })

  onMount(() => {
    // Set up ResizeObserver at workspace container level
    resizeObserver = new ResizeObserver((entries) => {
      if (isDestroyed) return

      // Check for valid dimensions - guard against zero-width/height containers
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      if (width === 0 || height === 0) return

      // Clear any pending debounce
      if (resizeDebounceTimer) {
        clearTimeout(resizeDebounceTimer)
      }
      resizeDebounceTimer = setTimeout(() => {
        resizeDebounceTimer = undefined
        if (isDestroyed) return
        // Increment resizeTick to notify all panes
        resizeTick++
      }, RESIZE_DEBOUNCE_MS)
    })
    // NOTE: observation moved to $effect to handle containerEl binding
  })

  onDestroy(() => {
    isDestroyed = true
    // Clear pending debounce
    if (resizeDebounceTimer) {
      clearTimeout(resizeDebounceTimer)
      resizeDebounceTimer = undefined
    }
    // Clean up resize observer
    resizeObserver?.disconnect()
  })
</script>

<!-- Workspace container - fills the parent shell -->
<div
  class="workspace-container"
  class:focus-mode-active={isFocusMode}
  bind:this={containerEl}
  tabindex="-1"
  style="grid-template-columns: {gridColumns}; grid-template-rows: {gridRows};"
>
  {#each panes ?? [] as pane, i (pane.paneId)}
    <div
      class="pane-wrapper"
      class:is-focus-target={isFocusMode && pane.paneId === focusedPaneId}
      class:is-dimmed={isFocusMode && pane.paneId !== focusedPaneId}
      class:is-pulsing={isFocusMode &&
        pane.paneId !== focusedPaneId &&
        workspaceUIState.pulsingPaneIds.has(pane.paneId)}
      style:grid-column={panes.length === 3 && i === 0 ? '1 / -1' : undefined}
    >
      <PaneContainer paneId={pane.paneId} sessionId={pane.sessionId} {resizeTick} />
    </div>
  {/each}
</div>

<style>
  .workspace-container {
    width: 100%;
    height: 100%;
    min-height: 0;
    position: relative;
    display: grid;
    gap: 0;
    /* grid-template-columns and grid-template-rows are now set via inline style */
  }

  .pane-wrapper {
    min-width: 0;
    min-height: 0;
  }

  /* Focus Mode: pane yang difokus mengambil seluruh workspace */
  .workspace-container.focus-mode-active .pane-wrapper.is-focus-target {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 10;
    /* Animation 200ms ease-out -- NFR6 */
    transition:
      top 200ms ease-out,
      right 200ms ease-out,
      bottom 200ms ease-out,
      left 200ms ease-out;
  }

  /* Reduced motion: skip animation */
  @media (prefers-reduced-motion: reduce) {
    .workspace-container.focus-mode-active .pane-wrapper.is-focus-target {
      transition: none;
    }
  }

  /* Non-focused panes: dimmed (Peripheral Dimming - Story 6.2) */
  /* Background panes fade to 10% opacity while remaining visible (AC #2, #3) */
  .workspace-container.focus-mode-active .pane-wrapper.is-dimmed {
    visibility: visible; /* AC #3: panes remain visible, not hidden */
    opacity: 0.1; /* AC #2: 10% opacity for background panes */
    transition: opacity 200ms ease-out; /* AC #4: smooth transition */
    pointer-events: none; /* in-scope: prevent interaction with dimmed panes */
  }

  /* Focused pane stays at full opacity (AC #1) */
  .workspace-container.focus-mode-active .pane-wrapper.is-focus-target {
    opacity: 1;
    z-index: 10;
  }

  /* Reduced motion: skip transition (AC #5) */
  @media (prefers-reduced-motion: reduce) {
    .workspace-container.focus-mode-active .pane-wrapper.is-dimmed {
      transition: none;
    }
  }

  /* Pulse highlight animation keyframes — FR33 */
  @keyframes pulse-highlight {
    0% {
      opacity: 0.1;
    }
    50% {
      opacity: 0.35;
    }
    100% {
      opacity: 0.1;
    }
  }

  /* Background pane pulse: 2 siklus dalam < 300ms (2 × 130ms = 260ms < 300ms) */
  .workspace-container.focus-mode-active .pane-wrapper.is-dimmed.is-pulsing {
    animation: pulse-highlight 130ms ease-in-out 2 forwards;
  }

  /* Reduced motion: ganti animasi dengan static highlight (AC #4) */
  @media (prefers-reduced-motion: reduce) {
    .workspace-container.focus-mode-active .pane-wrapper.is-dimmed.is-pulsing {
      animation: none;
      opacity: 0.25; /* static highlight sebagai pengganti pulse */
    }
  }
</style>
