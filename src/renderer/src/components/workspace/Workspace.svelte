<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import PaneContainer from './PaneContainer.svelte'

  // Props:
  let { panes = [] }: { panes: Array<{ paneId: number; sessionId: number }> } = $props()

  // Container ref for workspace-level resize orchestration
  let containerEl: HTMLDivElement | undefined = $state()

  // Resize state
  let resizeObserver: ResizeObserver | undefined
  let resizeDebounceTimer: ReturnType<typeof setTimeout> | undefined
  let resizeTick = $state(0)
  let isDestroyed = false

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

    if (containerEl) {
      resizeObserver.observe(containerEl)
    }
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
<div class="workspace-container" bind:this={containerEl}>
  {#each panes as pane (pane.paneId)}
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
    /* Grid layout foundation for pane tiling */
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
  }
</style>
