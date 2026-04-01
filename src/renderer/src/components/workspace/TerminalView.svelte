<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { Terminal } from '@xterm/xterm'
  import { FitAddon } from '@xterm/addon-fit'
  import { WebglAddon } from '@xterm/addon-webgl'
  import { Unicode11Addon } from '@xterm/addon-unicode11'
  import { WebLinksAddon } from '@xterm/addon-web-links'

  // Props:
  let { sessionId }: { sessionId: number } = $props()

  // Container ref:
  let containerEl: HTMLDivElement | undefined = $state()

  // Track exit to implement the PTY exit race guard (AC #7):
  let sessionExited = false

  // Terminal instance (module-scoped within component):
  let terminal: Terminal
  let fitAddon: FitAddon
  let unsubscribeData: (() => void) | undefined
  let unsubscribeExit: (() => void) | undefined

  onMount(() => {
    // 1. Create terminal with design token defaults
    terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'monospace',
      theme: {
        background: '#1C1C1C', // UX-DR2 dark surface
        foreground: '#F7F7F7'
      },
      allowTransparency: false
    })

    // 2. Load addons (order matters: fit → unicode11 → weblinks → open → webgl)
    fitAddon = new FitAddon()
    const unicode11Addon = new Unicode11Addon()
    const webLinksAddon = new WebLinksAddon()

    terminal.loadAddon(fitAddon)
    terminal.loadAddon(unicode11Addon)
    terminal.loadAddon(webLinksAddon)

    // Activate Unicode 11 (AC #3)
    terminal.unicode.activeVersion = '11'

    // 3. Open terminal into DOM container
    terminal.open(containerEl!)

    // 4. Load WebGL after open (AC #9) — wrap in try/catch for graceful fallback
    try {
      terminal.loadAddon(new WebglAddon())
    } catch {
      // WebGL unavailable — xterm falls back to canvas 2D automatically
    }

    // 5. Fit to container immediately (AC #8)
    fitAddon.fit()

    // 6. Forward local keyboard input to PTY (AC #5)
    terminal.onData((data: string) => {
      window.api.pty.write(sessionId, data)
    })

    // 7. Subscribe to PTY data stream (AC #6)
    unsubscribeData = window.api.pty.onData(sessionId, (data: string) => {
      // Race guard: drop data after exit (AC #7)
      if (sessionExited) return
      terminal.write(data)
    })

    // 8. Subscribe to exit events — set race guard flag (AC #7)
    unsubscribeExit = window.api.pty.onExit(sessionId, () => {
      sessionExited = true
    })
  })

  onDestroy(() => {
    // Clean up IPC listeners (Architecture Rule #2)
    unsubscribeData?.()
    unsubscribeExit?.()
    // Dispose terminal instance
    terminal?.dispose()
  })
</script>

<!-- Container div — xterm.js opens into this element -->
<div
  class="terminal-container"
  bind:this={containerEl}
  role="application"
  aria-label="Terminal pane {sessionId}"
></div>

<style>
  .terminal-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
    /* Ensures xterm canvas fills the pane */
  }
</style>
