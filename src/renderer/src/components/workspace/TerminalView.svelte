<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { Terminal } from '@xterm/xterm'
  import { FitAddon } from '@xterm/addon-fit'
  import { WebglAddon } from '@xterm/addon-webgl'
  import { Unicode11Addon } from '@xterm/addon-unicode11'
  import { WebLinksAddon } from '@xterm/addon-web-links'
  import { workspaceUIState } from '../../stores/workspace-ui-store.svelte'

  // Props:
  let { paneId, sessionId, resizeTick = 0 }: {
    paneId: number
    sessionId: number
    resizeTick?: number
  } = $props()

  // Container ref:
  let containerEl: HTMLDivElement | undefined = $state()

  // Track exit to implement the PTY exit race guard (AC #7):
  let sessionExited = $state(false)

  // Terminal instance (module-scoped within component):
  let terminal: Terminal | undefined
  let fitAddon: FitAddon | undefined
  let unsubscribeData: (() => void) | undefined
  let unsubscribeExit: (() => void) | undefined

  // Previous resizeTick for change detection
  let lastResizeTick = $state(0)

  // Synchronization state
  let lastSyncedCols = $state(0)
  let lastSyncedRows = $state(0)
  let isDestroyed = $state(false)

  // Minimum dimensions to prevent sending 0x0 to PTY (edge case)
  const MIN_COLS = 1
  const MIN_ROWS = 1

  // Maximum dimensions to prevent garbage values (edge case)
  const MAX_COLS = 9999
  const MAX_ROWS = 9999

  // React to resizeTick changes from Workspace
  $effect(() => {
    if (isDestroyed) return
    if (sessionExited) return
    if (!terminal || !fitAddon) return

    // Only trigger resize if resizeTick actually changed
    if (resizeTick !== lastResizeTick) {
      lastResizeTick = resizeTick
      try {
        fitAddon.fit()
        syncTerminalDimensions()
        // Restore focus only if this pane is the focused pane (Story 3.6)
        if (workspaceUIState.focusedPaneId === paneId) {
          terminal.focus()
        }
      } catch (err) {
        console.warn('[TerminalView] Resize handling failed:', err)
      }
    }
  })

  onMount(() => {
    // Guard: ensure window.api is available
    if (!window.api?.pty) {
      console.error('[TerminalView] window.api.pty is not available')
      return
    }

    // 0. Validate container element exists before creating terminal
    if (!containerEl) {
      console.error('[TerminalView] Container element not found')
      return
    }

    // Reset destruction flag on mount (for clean remount after destroy)
    isDestroyed = false

    // 1. Create terminal with design token defaults
    terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'monospace',
      theme: {
        background: '#1C1C1C', // UX-DR2 dark surface
        foreground: '#F7F7F7'
      },
      allowTransparency: false,
      allowProposedApi: true // Required for Unicode11Addon (AC #3)
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

    // 3. Open terminal into DOM container (with error handling)
    try {
      terminal.open(containerEl)
    } catch (err) {
      console.error('[TerminalView] Failed to open terminal:', err)
      return
    }

    // Note: We don't auto-focus on mount anymore to avoid focus wars in multi-pane layouts.
    // Focus is only restored during resize for the focused pane (see $effect above).
    // If this pane should be focused, the focusedPaneId will be set and the resize effect
    // will handle focus restoration.

    // 4. Load WebGL after open (AC #9) — wrap in try/catch for graceful fallback
    try {
      terminal.loadAddon(new WebglAddon())
    } catch (err) {
      // WebGL unavailable — xterm falls back to canvas 2D automatically
      console.debug('[TerminalView] WebGL addon failed to load, using canvas 2D fallback:', err)
    }

    // 5. Fit to container immediately (AC #8) with error handling
    // Edge case: handle container with 0 dimensions (display:none, collapsed pane)
    try {
      fitAddon.fit()
      const initialCols = terminal.cols
      const initialRows = terminal.rows
      // Only set last synced if dimensions are valid
      if (
        initialCols >= MIN_COLS &&
        initialRows >= MIN_ROWS &&
        initialCols <= MAX_COLS &&
        initialRows <= MAX_ROWS
      ) {
        lastSyncedCols = initialCols
        lastSyncedRows = initialRows
        // Send initial resize directly to avoid race condition with terminal.cols/rows
        // Guard: ensure window.api.pty is available
        if (!window.api?.pty) {
          console.error('[TerminalView] window.api.pty is not available for initial resize')
        } else {
          try {
            window.api.pty.resize(sessionId, initialCols, initialRows)
          } catch (err) {
            console.error('[TerminalView] Failed to send initial resize:', err)
          }
        }
      }
    } catch (err) {
      console.warn('[TerminalView] fitAddon.fit() failed, will retry on resize:', err)
    }

    // NOTE(Epic 3): ResizeObserver moved to Workspace level per UX-DR25.
    // TerminalView now receives resizeTick from parent PaneContainer.

    // 6. Forward local keyboard input to PTY (AC #5)
    // write() is fire-and-forget IPC with no buffering — direct fd write
    terminal.onData((data: string) => {
      if (!window.api?.pty) {
        console.error('[TerminalView] window.api.pty is not available for writing')
        return
      }
      try {
        window.api.pty.write(sessionId, data)
      } catch (err) {
        console.error('[TerminalView] Failed to write to PTY:', err)
      }
    })

    // 7. Subscribe to PTY data stream (AC #6) with error handling
    // terminal.write() uses microtask queue for async processing but stays within same frame
    unsubscribeData = window.api.pty.onData(sessionId, (data: string) => {
      // Race guard: drop data after exit (AC #7)
      if (sessionExited) return
      if (!terminal) return
      try {
        terminal.write(data)
      } catch (err) {
        console.error('[TerminalView] Failed to write to terminal:', err)
      }
    })

    // 8. Subscribe to exit events — set race guard flag (AC #7)
    unsubscribeExit = window.api.pty.onExit(sessionId, () => {
      sessionExited = true
    })
  })

  onDestroy(() => {
    // Set destruction flag first to prevent any pending callbacks from executing
    isDestroyed = true

    // Clean up IPC listeners (Architecture Rule #2)
    unsubscribeData?.()
    unsubscribeExit?.()
    // NOTE(Epic 3): ResizeObserver moved to Workspace - no local observer to clean up
    // Dispose terminal instance with error handling
    try {
      terminal?.dispose()
    } catch (err) {
      console.error('[TerminalView] Error disposing terminal:', err)
    }

    // Reset last synced dimensions to ensure fresh state on remount
    lastSyncedCols = 0
    lastSyncedRows = 0
  })

  // Sync terminal dimensions to PTY via resize IPC
  // No-op guard: only sends pty:resize when cols/rows actually changed
  function syncTerminalDimensions(): void {
    if (!terminal) return
    // Edge case: prevent IPC after component destruction
    if (isDestroyed) return
    try {
      const cols = terminal.cols
      const rows = terminal.rows

      // Edge case: skip if dimensions are invalid (0 or negative)
      if (cols < MIN_COLS || rows < MIN_ROWS) {
        console.debug('[TerminalView] Skipping resize: dimensions too small', { cols, rows })
        return
      }

      // Edge case: skip if dimensions exceed reasonable bounds (prevents garbage values)
      if (cols > MAX_COLS || rows > MAX_ROWS) {
        console.warn('[TerminalView] Skipping resize: dimensions exceed bounds', { cols, rows })
        return
      }

      // No-op guard: skip IPC if dimensions haven't changed
      if (cols === lastSyncedCols && rows === lastSyncedRows) return
      lastSyncedCols = cols
      lastSyncedRows = rows
      // Guard: ensure window.api.pty is available
      if (!window.api?.pty) {
        console.error('[TerminalView] window.api.pty is not available for resize')
        return
      }
      window.api.pty.resize(sessionId, cols, rows)
    } catch (err) {
      console.error('[TerminalView] Failed to resize PTY:', err)
    }
  }
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
