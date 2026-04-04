<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import Workspace from './components/workspace/Workspace.svelte'
  import QuitDialog from './components/workspace/QuitDialog.svelte'
  import CommandCenter from './components/command-center/CommandCenter.svelte'
  import { layoutState } from './stores/layout-store.svelte'
  import { openCommandCenter } from './stores/command-center-store.svelte'

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
</script>

<!-- App shell - contains error area and workspace -->
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
