<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import Workspace from './components/workspace/Workspace.svelte'
  import QuitDialog from './components/workspace/QuitDialog.svelte'
  import CommandCenter from './components/command-center/CommandCenter.svelte'
  import SaveLayoutSurface from './components/workspace/SaveLayoutSurface.svelte'
  import StatusBar from './components/status-bar/StatusBar.svelte'
  import { layoutState } from './stores/layout-store.svelte'
  import { workspaceUIState } from './stores/workspace-ui-store.svelte'
  import { exitFocusMode } from './stores/workspace-ui-store.svelte'
  import { openCommandCenter } from './stores/command-center-store.svelte'
  import { openSaveLayout } from './stores/save-layout-store.svelte'

  // Timeout ID for deferred Esc exit (200ms animation matching CSS transition)
  let escExitTimeout: ReturnType<typeof setTimeout> | undefined

  // Local state for inline recoverable errors
  let startupError = $state('')
  let unsubCommandCenter: (() => void) | undefined
  let isMounted = false

  // Status bar message state (auto-clears after 3s)
  let statusMessage = $state('')
  let statusTimer: ReturnType<typeof setTimeout> | undefined
  let statusIsError = $state(false)

  function setStartupError(message: string, details?: unknown): void {
    startupError = message
    console.error('[App] startup failure:', message, details)
  }

  function showStatusMessage(msg: string, isError = false): void {
    if (statusTimer) clearTimeout(statusTimer)
    statusMessage = msg
    statusIsError = isError
    statusTimer = setTimeout(() => {
      statusMessage = ''
      statusIsError = false
      statusTimer = undefined
    }, 3000)
  }

  function handleLayoutSaved(name: string): void {
    showStatusMessage(`Layout '${name}' saved`)
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
    if (statusTimer) clearTimeout(statusTimer)
    if (escExitTimeout) clearTimeout(escExitTimeout)
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

    // Escape → exit Focus Mode (AC #2: restore focus after 200ms animation)
    if (event.key === 'Escape' && workspaceUIState.isFocusMode) {
      event.preventDefault()
      // Guard: clear any pending exit timeout to prevent double-exit
      if (escExitTimeout) clearTimeout(escExitTimeout)
      escExitTimeout = setTimeout(() => {
        exitFocusMode()
        // AC #2: Restore keyboard focus to the previously focused pane's terminal
        const focusedPaneId = workspaceUIState.focusedPaneId
        if (focusedPaneId !== null) {
          document.querySelector(`[data-pane-id="${focusedPaneId}"] .pane-terminal-area`)?.focus()
        }
        escExitTimeout = undefined
      }, 200)
      return
    }

    // Ctrl+Shift+S → open Save Layout Surface (Epic 7)
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'S') {
      event.preventDefault()
      // openSaveLayout() returns false when no active workspace exists
      const opened = openSaveLayout()
      if (!opened) {
        showStatusMessage('No active workspace to save', true)
      }
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
  {#if statusMessage}
    <div
      class="status-bar-message"
      class:status-bar-message--error={statusIsError}
      role="status"
      aria-live="polite"
    >
      {statusMessage}
    </div>
  {/if}
  <Workspace panes={layoutState.panes} />
  <StatusBar />
</div>
<CommandCenter />
<QuitDialog />
<SaveLayoutSurface onSaved={handleLayoutSaved} />

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

  .status-bar-message {
    flex: 0 0 auto;
    padding: 4px 16px;
    background-color: #16a34a;
    color: white;
    font-size: 13px;
    line-height: 1.5;
    text-align: center;
  }

  .status-bar-message--error {
    background-color: #dc2626;
  }
</style>
