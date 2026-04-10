<script lang="ts">
  import { workspaceUIState } from '../../stores/workspace-ui-store.svelte'
  import { layoutState } from '../../stores/layout-store.svelte'

  // Derived: focused pane name
  const focusedPaneName = $derived.by(() => {
    if (!workspaceUIState.isFocusMode || workspaceUIState.focusedPaneId === null) {
      return null
    }
    const pane = layoutState.panes.find((p) => p.paneId === workspaceUIState.focusedPaneId)
    return pane?.name || `Pane ${workspaceUIState.focusedPaneId}`
  })

  // Derived: is focus mode active
  const isFocusModeActive = $derived(workspaceUIState.isFocusMode)
</script>

<div class="status-bar" role="status" aria-live="polite" aria-label="Focus mode status">
  <div class="status-bar-left">
    <!-- Layout info placeholder for future expansion -->
    {#if layoutState.layoutName}
      <span class="status-item">{layoutState.layoutName}</span>
    {/if}
    {#if layoutState.panes.length > 0}
      <span class="status-item"
        >{layoutState.panes.length} pane{layoutState.panes.length !== 1 ? 's' : ''}</span
      >
    {/if}
  </div>

  <div class="status-bar-right">
    {#if isFocusModeActive && focusedPaneName}
      <span class="focus-indicator" data-testid="focus-indicator">
        [FOCUS: {focusedPaneName}]
      </span>
    {/if}
  </div>
</div>

<style>
  .status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 16px;
    background-color: #1c1c1c;
    color: #f7f7f7;
    font-family: 'Work Sans', sans-serif;
    font-size: 13px;
    line-height: 1.5;
    flex: 0 0 auto;
    min-height: 28px;
  }

  .status-bar-left,
  .status-bar-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .status-item {
    color: #949494;
  }

  .focus-indicator {
    color: #6ee7e7; /* cyan accent per UX spec */
    font-weight: 600;
  }
</style>
