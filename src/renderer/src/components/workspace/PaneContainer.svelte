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

  // Derive focus state for this pane - single source of truth
  let isFocused = $derived(workspaceUIState.focusedPaneId === paneId)
</script>

<!-- Pane container wrapper with metadata attributes -->
<div
  class="pane-container"
  class:is-focused={isFocused}
  data-pane-id={paneId}
  data-session-id={sessionId}
  data-focused={isFocused}
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
    /* Focus color #62c6ff on #1C1C1C background provides ~3.5:1 contrast
     * This meets WCAG 2.1 AA for UI components (3:1 requirement)
     * Using CSS custom property allows theming */
    outline: 2px solid var(--color-focus, #62c6ff);
    outline-offset: -2px;
  }

  /* Ensure the pane container can receive focus for keyboard navigation */
  .pane-container:focus {
    outline: none;
  }
</style>
