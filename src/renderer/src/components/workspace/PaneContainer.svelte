<script lang="ts">
  import TerminalView from './TerminalView.svelte'
  import { workspaceUIState, setFocusedPaneId } from '../../stores/workspace-ui-store.svelte'

  // Props:
  let {
    paneId,
    sessionId,
    resizeTick = 0
  }: {
    paneId: number
    sessionId: number
    resizeTick?: number
  } = $props()
</script>

<!-- Pane container wrapper with metadata attributes -->
<div
  class="pane-container"
  class:is-focused={workspaceUIState.focusedPaneId === paneId}
  data-pane-id={paneId}
  data-session-id={sessionId}
  data-focused={workspaceUIState.focusedPaneId === paneId}
  onclick={() => setFocusedPaneId(paneId)}
  role="button"
  tabindex="0"
  aria-label="Terminal pane {paneId}"
>
  <TerminalView {paneId} {sessionId} {resizeTick} />
</div>

<style>
  .pane-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
  }

  .pane-container.is-focused {
    outline: 2px solid var(--color-focus, #62c6ff);
    outline-offset: -2px;
  }

  /* Ensure the pane container can receive focus for keyboard navigation */
  .pane-container:focus {
    outline: none;
  }
</style>
