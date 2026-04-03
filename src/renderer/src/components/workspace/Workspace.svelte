<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import PaneContainer from './PaneContainer.svelte'
  import type { PaneState } from '../../stores/layout-store.svelte'

  // Props:
  let { panes = [] }: { panes: PaneState[] } = $props()

  // Derive grid columns from pane count
  // 1 pane: 1fr | 2 panes: 1fr 1fr | 3 panes: 1fr 1fr (2 columns for mixed layout)
  let gridColumns = $derived(panes.length >= 2 ? '1fr 1fr' : '1fr')

  // Derive grid rows from pane count
  // 1 pane: 1fr | 2 panes: 1fr | 3 panes: 1fr 1fr (two equal rows for mixed layout)
  let gridRows = $derived(panes.length === 3 ? '1fr 1fr' : '1fr')

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
  bind:this={containerEl}
  style="grid-template-columns: {gridColumns}; grid-template-rows: {gridRows};"
>
  {#each panes ?? [] as pane, i (pane.paneId)}
    <div
      class="pane-wrapper"
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
    /* grid-template-columns and grid-template-rows are now set via inline style */
  }

  .pane-wrapper {
    min-width: 0;
    min-height: 0;
  }
</style>
