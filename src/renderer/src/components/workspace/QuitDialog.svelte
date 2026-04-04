<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import {
    workspaceReplaceState,
    cancelWorkspaceReplace,
    confirmWorkspaceReplace
  } from '../../stores/workspace-replace-confirmation-store.svelte'

  // App quit mode state
  let quitVisible = $state(false)
  let quitSessionCount = $state(0)
  let quitUnsubscribe: (() => void) | null = null

  // Computed: which mode is active
  let isReplaceMode = $derived(workspaceReplaceState.visible)
  let isQuitMode = $derived(quitVisible && !workspaceReplaceState.visible)
  let visible = $derived(isReplaceMode || isQuitMode)
  let sessionCount = $derived(isReplaceMode ? workspaceReplaceState.sessionCount : quitSessionCount)

  let dialogElement: HTMLDivElement | null = $state(null)

  onMount(() => {
    quitUnsubscribe = window.api.quit.onShowDialog((data) => {
      // Guard against multiple events while already visible
      if (quitVisible || workspaceReplaceState.visible) return
      quitSessionCount = data.sessionCount
      quitVisible = true
    })
  })

  onDestroy(() => {
    quitUnsubscribe?.()
  })

  function handleCancel(): void {
    if (!visible) return

    if (isReplaceMode) {
      cancelWorkspaceReplace()
    } else {
      quitVisible = false
      window.api.quit.cancel()
    }
  }

  function handleConfirm(): void {
    if (!visible) return

    if (isReplaceMode) {
      confirmWorkspaceReplace()
    } else {
      quitVisible = false
      window.api.quit.confirm()
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault()
      handleCancel()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      // Activate the focused button (same as click)
      const activeElement = document.activeElement as HTMLElement
      if (activeElement?.tagName === 'BUTTON') {
        activeElement.click()
      } else {
        // Default to confirm if no button focused
        handleConfirm()
      }
    } else if (event.key === 'Tab') {
      // Focus trap: keep focus within dialog
      const focusableElements = dialogElement?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (!focusableElements || focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
  }
</script>

{#if visible}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="quit-dialog-backdrop" role="presentation" onkeydown={handleKeydown}>
    <div
      bind:this={dialogElement}
      class="quit-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quit-dialog-title"
      aria-describedby="quit-dialog-desc"
    >
      <h2 id="quit-dialog-title" class="quit-dialog-title">
        {isReplaceMode ? 'Replace current workspace?' : 'Close Verminal?'}
      </h2>
      <p id="quit-dialog-desc" class="quit-dialog-desc">
        {#if isReplaceMode}
          {sessionCount} active terminal session{sessionCount !== 1 ? 's' : ''} will be terminated and
          replaced by the selected preset.
        {:else}
          {sessionCount} active terminal session{sessionCount !== 1 ? 's' : ''} will be terminated.
        {/if}
      </p>
      <div class="quit-dialog-actions">
        <button class="quit-dialog-btn quit-dialog-btn--cancel" onclick={handleCancel} autofocus>
          Cancel
        </button>
        <button class="quit-dialog-btn quit-dialog-btn--quit" onclick={handleConfirm}>
          {isReplaceMode ? 'Replace' : 'Quit'}
        </button>
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
