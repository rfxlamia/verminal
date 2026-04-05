<script lang="ts">
  import TerminalView from './TerminalView.svelte'
  import PaneHeader, { type PaneHeaderExports } from './PaneHeader.svelte'
  import {
    workspaceUIState,
    setFocusedPaneId,
    enterFocusMode
  } from '../../stores/workspace-ui-store.svelte'
  import {
    layoutState,
    renamePaneInLayout,
    recolorPaneInLayout,
    type PaneColor
  } from '../../stores/layout-store.svelte'

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

  // Read pane name from layoutState — default "Pane N" name is set by createPane()
  let paneName = $derived(
    (layoutState.panes ?? []).find((p) => p.paneId === paneId)?.name ?? `Pane ${paneId}`
  )

  // Read pane color from layoutState
  let paneColor = $derived((layoutState.panes ?? []).find((p) => p.paneId === paneId)?.color)

  // Reference to PaneHeader for F2-triggered edit mode
  let paneHeaderRef: PaneHeaderExports | undefined = $state()

  // Total pane count for single-pane guard (AC #4)
  let totalPanes = $derived(layoutState.panes.length)

  // Handle edit request from PaneHeader (AC #2: click triggers edit request signal)
  function handleEditRequest(): void {
    // Parent orchestrates the edit - triggers inline edit mode
    paneHeaderRef?.startEditExternally()
  }

  // Handle double-click on header for Focus Mode activation (AC #1)
  function handleHeaderDblClick(): void {
    // AC #4: guard — harus ada lebih dari 1 pane
    if (totalPanes <= 1) return
    // AC #5: guard — jangan re-enter jika sudah focus mode
    if (workspaceUIState.isFocusMode) return
    // Validate this paneId still exists in current layout
    const paneExists = layoutState.panes.some((p) => p.paneId === paneId)
    if (!paneExists) return
    enterFocusMode(paneId)
  }

  // Handle rename from PaneHeader edit mode
  function handleRename(newName: string): void {
    renamePaneInLayout(paneId, newName)
  }

  function handleColorChange(color: PaneColor | undefined): void {
    recolorPaneInLayout(paneId, color)
  }

  function handleKeydown(e: KeyboardEvent): void {
    // Guard: ignore events from nested interactive elements (input, buttons)
    // This ensures Enter/Space on color swatches or rename input don't trigger pane focus
    const target = e.target as HTMLElement
    if (target !== e.currentTarget) {
      // Event bubbled from a child element - check if it's an interactive element
      const tagName = target.tagName.toLowerCase()
      if (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        tagName === 'button' ||
        target.isContentEditable
      ) {
        return
      }
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setFocusedPaneId(paneId)
    } else if (e.key === 'F2') {
      e.preventDefault()
      paneHeaderRef?.startEditExternally()
    }
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
  onkeydown={handleKeydown}
  role="button"
  tabindex="0"
  aria-label="Terminal pane {paneId}"
>
  <PaneHeader
    {paneId}
    name={paneName}
    color={paneColor}
    {isFocused}
    onEditRequest={handleEditRequest}
    onRename={handleRename}
    onColorChange={handleColorChange}
    onDblClick={handleHeaderDblClick}
    bind:this={paneHeaderRef}
  />
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
    outline: 2px solid var(--cc-focus, #62c6ff);
    outline-offset: -2px;
  }

  .pane-terminal-area {
    flex: 1;
    min-height: 0; /* KRITIS: tanpa ini, flex child tidak bisa shrink di bawah content height */
    overflow: hidden;
  }
</style>
