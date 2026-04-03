<script lang="ts">
  import { onMount } from 'svelte'
  import Workspace from './components/workspace/Workspace.svelte'
  import QuitDialog from './components/workspace/QuitDialog.svelte'
  import { layoutState, initHorizontalSplitLayout } from './stores/layout-store.svelte'

  // Error message constants for future i18n support
  const ERROR_MESSAGES = {
    SHELL_DETECT_FAILED: 'Shell detection failed. Check your shell configuration or open Help.',
    NO_SHELL_DETECTED: 'No shell was detected. Configure a valid shell and try again.',
    HOME_PATH_FAILED:
      'Home path could not be resolved. Verminal cannot start a shell until this is fixed.',
    PTY_SPAWN_FAILED: (shell: string) =>
      `Failed to spawn shell: ${shell}. Review shell settings or Help and try again.`
  } as const

  // Local state for inline recoverable errors
  let startupError = $state('')

  function setStartupError(message: string, details?: unknown): void {
    startupError = message
    console.error('[App] startup failure:', message, details)
  }

  onMount(async () => {
    startupError = ''

    // Guard: IPC bridge must be available
    if (!window.api) {
      setStartupError('IPC bridge not available. Please restart Verminal.')
      return
    }

    // Step 1: Detect shell
    const shellResult = await window.api.shell.detect()
    if (!shellResult.ok) {
      setStartupError(ERROR_MESSAGES.SHELL_DETECT_FAILED, shellResult.error)
      return
    }

    const shell = shellResult.data[0]
    if (!shell || typeof shell !== 'string' || shell.trim() === '') {
      setStartupError(ERROR_MESSAGES.NO_SHELL_DETECTED)
      return
    }

    // Step 2: Get home path for cwd
    const homeResult = await window.api.app.getPaths()
    if (!homeResult.ok) {
      setStartupError(ERROR_MESSAGES.HOME_PATH_FAILED, homeResult.error)
      return
    }

    if (
      typeof homeResult.data !== 'object' ||
      !homeResult.data ||
      typeof homeResult.data.home !== 'string'
    ) {
      setStartupError(ERROR_MESSAGES.HOME_PATH_FAILED)
      return
    }

    const cwd = homeResult.data.home

    // Step 3a: Spawn first PTY
    const spawnResult1 = await window.api.pty.spawn(shell, [], cwd)
    if (!spawnResult1.ok) {
      setStartupError(ERROR_MESSAGES.PTY_SPAWN_FAILED(shell), spawnResult1.error)
      return
    }
    if (
      typeof spawnResult1.data !== 'object' ||
      !spawnResult1.data ||
      typeof spawnResult1.data.sessionId !== 'number'
    ) {
      setStartupError('Failed to initialize session. Please try again.')
      return
    }

    // Step 3b: Spawn second PTY
    const spawnResult2 = await window.api.pty.spawn(shell, [], cwd)
    if (!spawnResult2.ok) {
      // Kill the first session to avoid orphaned PTY — NFR15 compliance
      try {
        window.api.pty.kill(spawnResult1.data.sessionId)
      } catch (killError) {
        console.error(
          '[App] Failed to kill orphaned PTY session:',
          spawnResult1.data.sessionId,
          killError
        )
      }
      setStartupError(ERROR_MESSAGES.PTY_SPAWN_FAILED(shell), spawnResult2.error)
      return
    }
    if (
      typeof spawnResult2.data !== 'object' ||
      !spawnResult2.data ||
      typeof spawnResult2.data.sessionId !== 'number'
    ) {
      // NFR15: No orphaned PTY - kill session 1 always
      try {
        window.api.pty.kill(spawnResult1.data.sessionId)
      } catch (killError) {
        console.error(
          '[App] Failed to kill orphaned PTY session:',
          spawnResult1.data.sessionId,
          killError
        )
      }
      // Attempt to kill session 2 if we can extract any sessionId from malformed data
      // This handles edge case where spawn succeeded but returned unexpected data shape
      const malformedSessionId = (spawnResult2.data as { sessionId?: number } | null)?.sessionId
      if (typeof malformedSessionId === 'number') {
        try {
          window.api.pty.kill(malformedSessionId)
        } catch (killError) {
          console.error(
            '[App] Failed to kill malformed PTY session:',
            malformedSessionId,
            killError
          )
        }
      }
      setStartupError('Failed to initialize session. Please try again.')
      return
    }

    // Step 4: Initialize horizontal split layout with both sessions
    initHorizontalSplitLayout(spawnResult1.data.sessionId, spawnResult2.data.sessionId)
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
