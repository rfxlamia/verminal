<!--
  Copyright 2026 V
  SPDX-License-Identifier: Apache-2.0

  Shortcut Cheatsheet - Presentational component for keyboard shortcuts reference
  Inline help surface (not nested modal) with role="region"
-->
<script lang="ts">
  interface Props {
    onClose: () => void
  }

  let { onClose }: Props = $props()
</script>

<div class="shortcut-cheatsheet" role="region" aria-label="Keyboard shortcuts">
  <h3 class="cheatsheet-title">Keyboard Shortcuts</h3>
  <table class="cheatsheet-table" aria-label="Available shortcuts">
    <tbody>
      <tr>
        <td><kbd>1</kbd> – <kbd>4</kbd></td>
        <td>Pilih preset pane</td>
      </tr>
      <tr>
        <td><kbd>↑</kbd> <kbd>↓</kbd></td>
        <td>Navigasi saved layouts</td>
      </tr>
      <tr>
        <td><kbd>←</kbd> <kbd>→</kbd></td>
        <td>Navigasi antar preset</td>
      </tr>
      <tr>
        <td><kbd>Enter</kbd></td>
        <td>Konfirmasi pilihan</td>
      </tr>
      <tr>
        <td><kbd>Esc</kbd></td>
        <td>Tutup / kembali</td>
      </tr>
      <tr>
        <td><kbd>?</kbd> / <kbd>F1</kbd></td>
        <td>Tampilkan/sembunyikan shortcut</td>
      </tr>
      <tr>
        <td><kbd>Ctrl+Alt+T</kbd></td>
        <td>Buka/tutup Command Center</td>
      </tr>
    </tbody>
  </table>
  <button class="cheatsheet-close-btn" onclick={onClose} aria-label="Close keyboard shortcuts">
    Close shortcuts
  </button>
</div>

<style>
  .shortcut-cheatsheet {
    background: var(--cc-surface, rgba(255, 255, 255, 0.05));
    border: 1px solid var(--cc-border, rgba(255, 255, 255, 0.1));
    border-radius: 8px;
    padding: 16px;
    margin: 16px 0;
  }

  .cheatsheet-title {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 12px 0;
    color: var(--cc-text-primary, #e0e0e0);
  }

  .cheatsheet-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .cheatsheet-table tbody {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .cheatsheet-table tr {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
  }

  .cheatsheet-table td {
    color: var(--cc-text-primary, #e0e0e0);
  }

  .cheatsheet-table td:first-child {
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: 500;
  }

  .cheatsheet-table td:last-child {
    color: var(--cc-text-muted, #888);
    text-align: right;
  }

  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    padding: 2px 6px;
    font-family: inherit;
    font-size: 11px;
    font-weight: 600;
    color: var(--cc-text-primary, #e0e0e0);
    background: var(--cc-surface-secondary, rgba(255, 255, 255, 0.1));
    border: 1px solid var(--cc-border, rgba(255, 255, 255, 0.1));
    border-radius: 4px;
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
  }

  .cheatsheet-close-btn {
    width: 100%;
    margin-top: 12px;
    padding: 8px 12px;
    font-size: 13px;
    font-weight: 500;
    color: var(--cc-text-primary, #e0e0e0);
    background: var(--cc-surface-hover, rgba(255, 255, 255, 0.08));
    border: 1px solid var(--cc-border, rgba(255, 255, 255, 0.1));
    border-radius: 6px;
    cursor: pointer;
    transition: all 200ms ease-out;
  }

  .cheatsheet-close-btn:hover {
    background: var(--cc-surface-active, rgba(255, 255, 255, 0.12));
    border-color: var(--cc-border-hover, rgba(255, 255, 255, 0.2));
  }

  .cheatsheet-close-btn:focus {
    outline: 2px solid var(--cc-focus, #4a9eff);
    outline-offset: 2px;
  }
</style>
