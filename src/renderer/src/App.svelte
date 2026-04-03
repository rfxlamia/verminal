<script lang="ts">
  import { onMount } from 'svelte'
  import Workspace from './components/workspace/Workspace.svelte'
  import QuitDialog from './components/workspace/QuitDialog.svelte'
  import { layoutState, initSinglePaneLayout } from './stores/layout-store.svelte'

  // Local state for inline recoverable errors
  let startupError = $state('')

  function setStartupError(message: string, details?: unknown): void {
    startupError = message
    console.error('[App] startup failure:', message, details)
  }

  onMount(async () => {
    startupError = ''

    // Step 1: Detect shell
    const shellResult = await window.api.shell.detect()
    if (!shellResult.ok) {
      setStartupError(
        'Shell detection failed. Check your shell configuration or open Help.',
        shellResult.error
      )
      return
    }

    const shell = shellResult.data[0]
    if (!shell) {
      setStartupError('No shell was detected. Configure a valid shell and try again.')
      return
    }

    // Step 2: Get home path for cwd
    const homeResult = await window.api.app.getPaths()
    if (!homeResult.ok) {
      setStartupError(
        'Home path could not be resolved. Verminal cannot start a shell until this is fixed.',
        homeResult.error
      )
      return
    }

    const cwd = homeResult.data.home

    // Step 3: Spawn PTY
    const spawnResult = await window.api.pty.spawn(shell, [], cwd)
    if (!spawnResult.ok) {
      setStartupError(
        `Failed to spawn shell: ${shell}. Review shell settings or Help and try again.`,
        spawnResult.error
      )
      return
    }

    // Step 4: Initialize single pane layout with the session
    initSinglePaneLayout(spawnResult.data.sessionId)
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
