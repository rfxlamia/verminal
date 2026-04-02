<script lang="ts">
  import TerminalView from './TerminalView.svelte'

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
</script>

<!-- Pane container wrapper with metadata attributes -->
<div class="pane-container" data-pane-id={paneId} data-session-id={sessionId}>
  <TerminalView {sessionId} {resizeTick} />
</div>

<style>
  .pane-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
  }
</style>
