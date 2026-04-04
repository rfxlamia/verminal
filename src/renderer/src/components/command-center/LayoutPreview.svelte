<!--
  Copyright 2026 V
  SPDX-License-Identifier: Apache-2.0

  LayoutPreview - Presentational component for layout preview
  Purely presentational: no IPC, no effects, no spawn logic
-->
<script lang="ts">
  import type { LayoutName } from '../../../../shared/ipc-contract'

  interface Props {
    layoutName: LayoutName | null
  }

  let { layoutName }: Props = $props()
</script>

<div class="layout-preview" aria-label="Layout preview" aria-live="polite">
  {#if layoutName === 'single'}
    <div class="preview-grid preview-grid--1">
      <div class="preview-cell"></div>
    </div>
  {:else if layoutName === 'horizontal'}
    <div class="preview-grid preview-grid--2">
      <div class="preview-cell"></div>
      <div class="preview-cell"></div>
    </div>
  {:else if layoutName === 'mixed'}
    <div class="preview-grid preview-grid--3">
      <div class="preview-cell preview-cell--top"></div>
      <div class="preview-cell"></div>
      <div class="preview-cell"></div>
    </div>
  {:else if layoutName === 'grid'}
    <div class="preview-grid preview-grid--4">
      <div class="preview-cell"></div>
      <div class="preview-cell"></div>
      <div class="preview-cell"></div>
      <div class="preview-cell"></div>
    </div>
  {:else}
    <div class="preview-placeholder" aria-hidden="true"></div>
  {/if}
</div>

<style>
  .layout-preview {
    margin-top: 8px;
    padding: 16px;
    background: var(--cc-surface);
    border-radius: 6px;
    border: 1px solid var(--cc-border);
    min-height: 152px; /* 120px + padding + border for stable height */
  }

  .preview-grid {
    display: grid;
    width: 100%;
    height: 120px;
    gap: 4px;
    transition: all 200ms ease-out;
  }

  .preview-grid--1 {
    grid-template-columns: 1fr;
  }

  .preview-grid--2 {
    grid-template-columns: 1fr 1fr;
  }

  .preview-grid--3 {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
  }

  .preview-grid--3 .preview-cell--top {
    grid-column: 1 / -1;
  }

  .preview-grid--4 {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
  }

  .preview-cell {
    background: var(--cc-preview-bg);
    border: 1px solid var(--cc-border);
    border-radius: 4px;
    transition: all 200ms ease-out;
  }

  .preview-placeholder {
    width: 100%;
    height: 120px;
    background: transparent;
  }
</style>
