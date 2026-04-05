<!--
  Copyright 2026 V
  SPDX-License-Identifier: Apache-2.0

  Preset Launcher - Presentational component for 1-4 pane preset selection
-->
<script lang="ts">
  interface Props {
    selectedPreset: number
    isSpawning: boolean
    errorMessage: string
    onSelect: (paneCount: number) => void
    onSubmit: (paneCount: number) => void
    onNavigateToNextSection?: () => void
    onNavigateToPrevSection?: () => void
  }

  let {
    selectedPreset,
    isSpawning,
    errorMessage,
    onSelect,
    onSubmit,
    onNavigateToNextSection
    // Note: onNavigateToPrevSection tidak digunakan di PresetLauncher (wrap internal)
  }: Props = $props()

  let containerEl: HTMLDivElement | null = $state(null)

  const presetLabels = ['1 Pane', '2 Panes', '3 Panes', '4 Panes']

  function handleKeydown(event: KeyboardEvent): void {
    // Number key 1-4: select preset
    if (event.key >= '1' && event.key <= '4') {
      event.preventDefault()
      const preset = parseInt(event.key, 10)
      onSelect(preset)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      onSubmit(selectedPreset)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      if (selectedPreset < 4) {
        onSelect(selectedPreset + 1)
      } else {
        // At preset 4, boundary escape to next section
        onNavigateToNextSection?.()
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      if (selectedPreset > 1) {
        onSelect(selectedPreset - 1)
      } else {
        // At preset 1, wrap within section to preset 4
        onSelect(4)
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      // ArrowDown always navigates to next section (saved layouts)
      onNavigateToNextSection?.()
    } else if (event.key === 'Tab') {
      // Focus trap: cycle between the 4 preset buttons
      const buttons = containerEl?.querySelectorAll<HTMLElement>('.preset-btn')
      if (!buttons || buttons.length === 0) return

      const firstButton = buttons[0]
      const lastButton = buttons[buttons.length - 1]

      if (event.shiftKey && document.activeElement === firstButton) {
        event.preventDefault()
        lastButton.focus()
      } else if (!event.shiftKey && document.activeElement === lastButton) {
        event.preventDefault()
        firstButton.focus()
      }
    }
  }

  function handlePresetClick(index: number): void {
    const preset = index + 1
    if (preset === selectedPreset) {
      // Clicking already selected preset confirms it
      onSubmit(preset)
    } else {
      // Clicking unselected preset just selects it
      onSelect(preset)
    }
  }
</script>

<div
  bind:this={containerEl}
  class="preset-launcher"
  onkeydown={handleKeydown}
  role="radiogroup"
  aria-label="Preset selection"
  tabindex="0"
>
  <div class="preset-grid">
    {#each presetLabels as label, index (index)}
      {@const preset = index + 1}
      {@const isSelected = preset === selectedPreset}
      <button
        class="preset-btn"
        class:preset-btn--selected={isSelected}
        onclick={() => handlePresetClick(index)}
        role="radio"
        aria-checked={isSelected}
        tabindex={isSelected ? 0 : -1}
        disabled={isSpawning}
      >
        <div class="preset-icon" aria-hidden="true">
          {#if preset === 1}
            <!-- 1 pane: single rectangle -->
            <div class="icon-grid icon-grid--1">
              <div class="icon-cell"></div>
            </div>
          {:else if preset === 2}
            <!-- 2 panes: horizontal split -->
            <div class="icon-grid icon-grid--2">
              <div class="icon-cell"></div>
              <div class="icon-cell"></div>
            </div>
          {:else if preset === 3}
            <!-- 3 panes: mixed split -->
            <div class="icon-grid icon-grid--3">
              <div class="icon-cell icon-cell--wide"></div>
              <div class="icon-cell"></div>
              <div class="icon-cell"></div>
            </div>
          {:else}
            <!-- 4 panes: 2x2 grid -->
            <div class="icon-grid icon-grid--4">
              <div class="icon-cell"></div>
              <div class="icon-cell"></div>
              <div class="icon-cell"></div>
              <div class="icon-cell"></div>
            </div>
          {/if}
        </div>
        <span class="preset-label">{label}</span>
      </button>
    {/each}
  </div>

  {#if isSpawning}
    <div class="spawn-status">Spawning workspace...</div>
  {/if}

  {#if errorMessage}
    <div class="spawn-error" role="alert">{errorMessage}</div>
  {/if}
</div>

<style>
  .preset-launcher {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .preset-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }

  .preset-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px 12px;
    border: 1px solid var(--cc-border);
    border-radius: 6px;
    background: var(--cc-surface);
    color: var(--cc-text-primary);
    cursor: pointer;
    transition: all 200ms ease-out;
  }

  .preset-btn:hover:not(:disabled) {
    border-color: var(--cc-border-hover);
    background: var(--cc-surface-hover);
  }

  .preset-btn:focus {
    outline: 2px solid var(--cc-focus);
    outline-offset: 2px;
  }

  .preset-btn--selected {
    border-color: var(--cc-accent);
    background: var(--cc-surface-active);
  }

  .preset-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .preset-icon {
    width: 48px;
    height: 36px;
  }

  .icon-grid {
    display: grid;
    width: 100%;
    height: 100%;
    gap: 2px;
  }

  .icon-grid--1 {
    grid-template-columns: 1fr;
  }

  .icon-grid--2 {
    grid-template-columns: 1fr 1fr;
  }

  .icon-grid--3 {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
  }

  .icon-grid--3 .icon-cell:first-child {
    grid-column: 1 / -1;
  }

  .icon-grid--4 {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
  }

  .icon-cell {
    background: var(--cc-icon-bg);
    border-radius: 2px;
  }

  .preset-btn--selected .icon-cell {
    background: var(--cc-accent);
  }

  .preset-label {
    font-size: 12px;
    font-weight: 500;
  }

  .spawn-status {
    padding: 12px;
    text-align: center;
    font-size: 13px;
    color: var(--cc-text-muted);
    background: var(--cc-surface);
    border-radius: 6px;
  }

  .spawn-error {
    padding: 12px;
    text-align: center;
    font-size: 13px;
    color: var(--cc-error-text);
    background: var(--cc-error-bg);
    border-radius: 6px;
    border: 1px solid var(--cc-error-border);
  }
</style>
