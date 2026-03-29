<script lang="ts">
  import { onMount } from 'svelte'
  import Versions from './components/Versions.svelte'
  import electronLogo from './assets/electron.svg'

  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

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

<img alt="logo" class="logo" src={electronLogo} />
<div class="creator">Powered by electron-vite</div>
<div class="text">
  Build an Electron app with
  <span class="svelte">Svelte</span>
  and
  <span class="ts">TypeScript</span>
</div>
<p class="tip">Please try pressing <code>F12</code> to open the devTool</p>
<div class="actions">
  <div class="action">
    <a href="https://electron-vite.org/" target="_blank" rel="noreferrer">Documentation</a>
  </div>
  <div class="action">
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions a11y-missing-attribute-->
    <a target="_blank" rel="noreferrer" onclick={ipcHandle}>Send IPC</a>
  </div>
</div>
<Versions />
