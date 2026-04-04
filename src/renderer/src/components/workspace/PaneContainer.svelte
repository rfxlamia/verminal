<script lang="ts">
  import TerminalView from './TerminalView.svelte'
  import PaneHeader from './PaneHeader.svelte'
  import { workspaceUIState, setFocusedPaneId } from '../../stores/workspace-ui-store.svelte'
  import { layoutState } from '../../stores/layout-store.svelte'

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

  // Baca nama pane dari layoutState — nama default "Pane N" sudah diisi oleh createPane()
  let paneName = $derived(
    layoutState.panes.find((p) => p.paneId === paneId)?.name ?? `Pane ${paneId}`
  )

  function handleEditRequest(): void {
    // Story 5.1: reserved integration point only.
    // Actual inline rename behavior lives in Story 5.2.
  }
</script>

<!-- Pane container wrapper with metadata attributes -->
<div
  class="pane-container"
  class:is-focused={isFocused}
  data-pane-id={paneId}
  data-session-id={sessionId}
  data-focused={isFocused}
  onclick={() => setFocusedPaneId(paneId)}
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setFocusedPaneId(paneId)
    }
  }}
  role="button"
  tabindex="0"
  aria-label="Terminal pane {paneId}"
>
  <PaneHeader {paneId} name={paneName} {isFocused} onEditRequest={handleEditRequest} />
  <div class="pane-terminal-area">
    <TerminalView {paneId} {sessionId} {resizeTick} />
  </div>
</div>

<style>
  .pane-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .pane-container.is-focused {
    /* Focus color #62c6ff on #1C1C1C background provides ~3.5:1 contrast
     * This meets WCAG 2.1 AA for UI components (3:1 requirement)
     * Using CSS custom property allows theming */
    outline: 2px solid var(--color-focus, #62c6ff);
    outline-offset: -2px;
  }

  .pane-terminal-area {
    flex: 1;
    min-height: 0; /* KRITIS: tanpa ini, flex child tidak bisa shrink di bawah content height */
    overflow: hidden;
  }
</style>
