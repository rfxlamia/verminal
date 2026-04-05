<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import Workspace from './components/workspace/Workspace.svelte'
  import QuitDialog from './components/workspace/QuitDialog.svelte'
  import CommandCenter from './components/command-center/CommandCenter.svelte'
  import { layoutState } from './stores/layout-store.svelte'
  import { workspaceUIState, enterFocusMode } from './stores/workspace-ui-store.svelte'
  import { openCommandCenter } from './stores/command-center-store.svelte'
  import { serializeLayoutForSave } from './lib/layout-serializer'
  import type { SavedLayoutData } from '../shared/ipc-contract'

  // Local state for inline recoverable errors
  let startupError = $state('')
  let unsubCommandCenter: (() => void) | undefined
  let isMounted = false

  function setStartupError(message: string, details?: unknown): void {
    startupError = message
    console.error('[App] startup failure:', message, details)
  }

  onMount(() => {
    isMounted = true
    startupError = ''

    // Guard: IPC bridge must be available
    if (!window.api) {
      setStartupError('IPC bridge not available. Please restart Verminal.')
      return
    }

    // Clean up any previous listener (defensive for HMR/remount scenarios)
    if (unsubCommandCenter) {
      unsubCommandCenter()
    }

    // Listen for command-center:open IPC event from main process (global shortcut)
    unsubCommandCenter = window.api.commandCenter.onOpen(() => {
      // Guard: only open if component is still mounted
      if (isMounted) {
        openCommandCenter()
      }
    })
  })

  onDestroy(() => {
    isMounted = false
    unsubCommandCenter?.()
  })

  function handleGlobalKeydown(event: KeyboardEvent): void {
    // Guard: ignore shortcuts when typing in input fields
    const target = event.target as HTMLElement
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target.isContentEditable
    ) {
      return
    }

    // Ctrl+Shift+S → save current layout
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'S') {
      event.preventDefault()
      void saveCurrentLayout()
    }

    // Ctrl+Shift+F → toggle Focus Mode (NEW)
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'F') {
      event.preventDefault()
      const paneId = workspaceUIState.focusedPaneId
      const totalPanes = layoutState.panes.length
      // AC #4 guard: must have more than 1 pane
      // AC #5 guard: handled internally by enterFocusMode
      // Validate paneId exists in current panes array
      const paneExists = layoutState.panes.some((p) => p.paneId === paneId)
      if (paneId !== null && totalPanes > 1 && paneExists) {
        enterFocusMode(paneId)
      }
    }
  }

  async function saveCurrentLayout(): Promise<void> {
    // Guard: IPC bridge must be available
    if (!window.api?.layout?.save) {
      console.error('[App] Layout save API not available')
      return
    }

    // Guard: layout must have a valid name (non-empty after trim)
    if (!layoutState.layoutName?.trim()) {
      console.error('[App] Cannot save layout: no active layout')
      return
    }

    // Use layoutName as the save name (will be enhanced with custom naming in Epic 7)
    const name = layoutState.layoutName.trim()
    const data: SavedLayoutData = serializeLayoutForSave(name, layoutState)
    const result = await window.api.layout.save(name, data)
    if (!result.ok) {
      console.error('[App] Save layout failed:', result.error.message)
    }
  }
</script>

<!-- App shell - contains error area and workspace -->
<svelte:window onkeydown={handleGlobalKeydown} />
<div class="app-shell">
  {#if startupError}
    <div class="startup-error" role="alert">
      {startupError}
    </div>
  {/if}
  <Workspace panes={layoutState.panes} />
</div>
<CommandCenter />
<QuitDialog />

<style>
  .app-shell {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .startup-error {
    flex: 0 0 auto;
    padding: 12px 16px;
    background-color: #dc2626;
    color: white;
    font-size: 14px;
    line-height: 1.5;
  }
</style>
