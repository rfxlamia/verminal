<script lang="ts">
  import type { PaneColor } from '../../stores/layout-store.svelte'
  import { PANE_COLOR_OPTIONS } from './pane-colors'

  let {
    selectedColor,
    onSelect
  }: {
    selectedColor?: PaneColor
    onSelect?: (color: PaneColor | undefined) => void
  } = $props()
</script>

<div class="color-picker" role="group" aria-label="Pilih warna pane">
  {#each PANE_COLOR_OPTIONS as { color, hex, label } (color)}
    <button
      type="button"
      class="color-swatch"
      class:is-selected={selectedColor === color}
      style="--swatch-color: {hex}"
      aria-pressed={selectedColor === color}
      aria-label={label}
      title={label}
      onclick={() => onSelect?.(selectedColor === color ? undefined : color)}
    >
      <span class="swatch-dot" aria-hidden="true"></span>
      <span class="swatch-label">{label}</span>
    </button>
  {/each}
</div>

<style>
  .color-picker {
    display: flex;
    gap: 4px;
    padding: 4px 0;
    flex-wrap: nowrap;
    overflow-x: auto;
  }

  .color-swatch {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 3px 4px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    font-family: 'Work Sans', system-ui, sans-serif;
    font-size: 9px;
    color: var(--cc-text-primary, #f7f7f7);
    min-width: 30px;
    transition: border-color 100ms ease;
  }

  .color-swatch:hover {
    border-color: rgba(255, 255, 255, 0.3);
  }

  .color-swatch.is-selected {
    border-color: var(--cc-focus, #62c6ff);
    background: rgba(98, 198, 255, 0.1);
  }

  .swatch-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--swatch-color);
    flex-shrink: 0;
  }

  .swatch-label {
    /* Font size 9px — teks label visible tapi tidak dominan */
    /* Warna dari --cc-text-primary sudah inherit dari .color-swatch */
  }
</style>
