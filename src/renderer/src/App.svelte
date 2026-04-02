<script lang="ts">
  import { onMount } from 'svelte'
  import Versions from './components/Versions.svelte'
  import QuitDialog from './components/workspace/QuitDialog.svelte'
  import Workspace from './components/workspace/Workspace.svelte'

  // Minimal in-memory pane array for initial workspace
  // Will be replaced with store-backed spawning after layout preset stories
  const initialPanes = [{ paneId: 1, sessionId: 1 }]

  onMount(async () => {
    if (!import.meta.env.DEV) return

    // IPC smoke test - verify window.api is accessible
    try {
      const result = await window.api.app.getVersion()
      if (result.ok) {
        console.log('[IPC smoke test] app version:', result.data)
      } else {
        console.error('[IPC smoke test] error:', result.error)
      }
    } catch (error) {
      console.error('[IPC smoke test] invoke failed:', error)
    }
  })
</script>

<!-- Workspace shell - gives Workspace the full viewport area -->
<div class="app-shell">
  <Workspace panes={initialPanes} />
</div>
<Versions />
<QuitDialog />

<style>
  .app-shell {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
</style>
