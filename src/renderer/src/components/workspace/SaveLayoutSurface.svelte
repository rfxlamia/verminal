<!--
  Copyright 2026 V
  SPDX-License-Identifier: Apache-2.0

  Save Layout Surface - Lightweight prompt overlay for naming and saving current layout.
  UX-spec: lightweight prompt surface, inline validation, success via status bar (no toast).
  States: idle → naming → validation-error or saved.
-->
<script lang="ts">
  import { tick } from 'svelte'
  import {
    saveLayoutState,
    closeSaveLayout,
    saveCurrent
  } from '../../stores/save-layout-store.svelte'

  interface Props {
    onSaved?: (name: string) => void
  }

  let { onSaved }: Props = $props()

  let inputEl: HTMLInputElement | undefined = $state()

  // Auto-focus input when surface opens
  $effect(() => {
    if (saveLayoutState.isOpen) {
      tick().then(() => inputEl?.focus())
    }
  })

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeSaveLayout()
    }
    if (event.key === 'Enter' && !saveLayoutState.isSaving) {
      event.preventDefault()
      void handleSave()
    }
  }

  function handleBackdropClick(event: MouseEvent): void {
    // Only close if clicking backdrop itself (not the surface card)
    if (event.target === event.currentTarget) {
      closeSaveLayout()
    }
  }

  async function handleSave(): Promise<void> {
    const result = await saveCurrent()
    if (result.ok) {
      onSaved?.(result.data)
    }
  }
</script>

{#if saveLayoutState.isOpen}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="save-layout-backdrop" role="presentation" onclick={handleBackdropClick}>
    <!-- Surface card -->
    <div
      class="save-layout-surface"
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-label="Save layout"
      onkeydown={handleKeydown}
    >
      <p class="save-layout-label">Save current layout as:</p>
      <!-- svelte-ignore binding_property_non_reactive -->
      <input
        bind:this={inputEl}
        class="save-layout-input"
        class:has-error={!!saveLayoutState.validationError}
        type="text"
        placeholder="Layout name"
        aria-label="Layout name"
        aria-describedby={saveLayoutState.validationError ? 'save-layout-error' : undefined}
        disabled={saveLayoutState.isSaving}
        bind:value={saveLayoutState.nameInput}
        onkeydown={handleKeydown}
      />
      {#if saveLayoutState.validationError}
        <p id="save-layout-error" class="save-layout-error" role="alert">
          {saveLayoutState.validationError}
        </p>
      {/if}
      <div class="save-layout-actions">
        <button
          class="save-layout-btn save-layout-btn--cancel"
          type="button"
          disabled={saveLayoutState.isSaving}
          onclick={closeSaveLayout}
        >
          Cancel
        </button>
        <button
          class="save-layout-btn save-layout-btn--confirm"
          type="button"
          disabled={saveLayoutState.isSaving}
          onclick={() => void handleSave()}
        >
          {saveLayoutState.isSaving ? 'Saving…' : 'Save'}
        </button>
      </div>
      <p class="save-layout-hint">
        <kbd>Enter</kbd> to save · <kbd>Esc</kbd> to cancel
      </p>
    </div>
  </div>
{/if}

<style>
  .save-layout-backdrop {
    position: fixed;
    inset: 0;
    z-index: 200;
    background-color: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .save-layout-surface {
    background-color: #1a1a1a;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px; /* --radius-md */
    padding: 20px 24px;
    width: 360px;
    max-width: 90vw;
    display: flex;
    flex-direction: column;
    gap: 10px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }

  .save-layout-label {
    margin: 0;
    color: rgba(255, 255, 255, 0.7);
    font-size: 13px;
  }

  .save-layout-input {
    width: 100%;
    padding: 8px 12px;
    background-color: #111;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 6px; /* --radius-sm */
    color: #ffffff;
    font-size: 14px;
    outline: none;
    box-sizing: border-box;
  }

  .save-layout-input:focus {
    border-color: rgba(255, 255, 255, 0.45);
  }

  .save-layout-input.has-error {
    border-color: #dc2626;
  }

  .save-layout-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .save-layout-error {
    margin: 0;
    color: #f87171;
    font-size: 12px;
  }

  .save-layout-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 4px;
  }

  .save-layout-btn {
    padding: 6px 14px;
    border-radius: 6px; /* --radius-sm */
    border: none;
    font-size: 13px;
    cursor: pointer;
    transition: opacity 150ms ease;
  }

  .save-layout-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .save-layout-btn--cancel {
    background-color: transparent;
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.65);
  }

  .save-layout-btn--cancel:hover:not(:disabled) {
    border-color: rgba(255, 255, 255, 0.3);
  }

  .save-layout-btn--confirm {
    background-color: #2563eb;
    color: #fff;
  }

  .save-layout-btn--confirm:hover:not(:disabled) {
    background-color: #1d4ed8;
  }

  .save-layout-hint {
    margin: 0;
    color: rgba(255, 255, 255, 0.3);
    font-size: 11px;
    text-align: right;
  }

  kbd {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 3px;
    padding: 1px 4px;
    font-size: 10px;
    font-family: monospace;
  }
</style>
