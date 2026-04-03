<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import PaneContainer from './PaneContainer.svelte'
  import type { PaneState } from '../../stores/layout-store.svelte'

  // Props:
  let { panes = [] }: { panes: PaneState[] } = $props()

  // Derive grid columns from pane count
  // 1 pane: 1fr | 2 panes: 1fr 1fr | (3-4 panes handled in Stories 3.4-3.5)
  let gridColumns = $derived(panes.length === 2 ? '1fr 1fr' : '1fr')

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
    resizeObserver = new ResizeObserver(() => {
      if (isDestroyed) return
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
  style="grid-template-columns: {gridColumns};"
>
  {#each panes ?? [] as pane (pane.paneId)}
    <PaneContainer paneId={pane.paneId} sessionId={pane.sessionId} {resizeTick} />
  {/each}
</div>

<style>
  .workspace-container {
    width: 100%;
    height: 100%;
    min-height: 0;
    position: relative;
    display: grid;
    /* grid-template-columns now set via inline style — driven by panes.length */
    grid-template-rows: 1fr;
  }
</style>
