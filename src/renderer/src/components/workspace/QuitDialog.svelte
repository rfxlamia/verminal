<script lang="ts">
  import { onDestroy, onMount } from 'svelte'

  let visible = $state(false)
  let sessionCount = $state(0)
  let unsubscribe: (() => void) | null = null

  onMount(() => {
    unsubscribe = window.api.quit.onShowDialog((data) => {
      sessionCount = data.sessionCount
      visible = true
    })
  })

  onDestroy(() => {
    unsubscribe?.()
  })

  function handleCancel(): void {
    visible = false
  }

  function handleQuit(): void {
    visible = false
    window.api.quit.confirm()
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      handleCancel()
    }
  }
</script>

{#if visible}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="quit-dialog-backdrop"
    role="presentation"
    onkeydown={handleKeydown}
  >
    <div
      class="quit-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quit-dialog-title"
      aria-describedby="quit-dialog-desc"
    >
      <h2 id="quit-dialog-title" class="quit-dialog-title">Close Verminal?</h2>
      <p id="quit-dialog-desc" class="quit-dialog-desc">
        {sessionCount} active terminal session{sessionCount !== 1 ? 's' : ''} will be terminated.
      </p>
      <div class="quit-dialog-actions">
        <button class="quit-dialog-btn quit-dialog-btn--cancel" onclick={handleCancel} autofocus>
          Cancel
        </button>
        <button class="quit-dialog-btn quit-dialog-btn--quit" onclick={handleQuit}>Quit</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .quit-dialog-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
  }

  .quit-dialog {
    display: flex;
    width: 360px;
    max-width: 90vw;
    flex-direction: column;
    gap: 16px;
    border: 1px solid #3a3a3a;
    border-radius: 8px;
    background: #1c1c1c;
    padding: 24px 28px;
  }

  .quit-dialog-title {
    margin: 0;
    color: #f7f7f7;
    font-size: 16px;
    font-weight: 600;
  }

  .quit-dialog-desc {
    margin: 0;
    color: #f7f7f7;
    font-size: 14px;
  }

  .quit-dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .quit-dialog-btn {
    cursor: pointer;
    border: none;
    border-radius: 6px;
    padding: 8px 18px;
    font-size: 14px;
    font-weight: 500;
    transition: opacity 0.15s ease;
  }

  .quit-dialog-btn:hover {
    opacity: 0.85;
  }

  .quit-dialog-btn--cancel {
    border: 1px solid #4a4a4a;
    background: #2c2c2c;
    color: #f7f7f7;
  }

  .quit-dialog-btn--quit {
    background: #e05c5c;
    color: #fff;
  }
</style>
