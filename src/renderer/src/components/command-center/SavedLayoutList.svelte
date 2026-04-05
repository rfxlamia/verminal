<!--
  Copyright 2026 V
  SPDX-License-Identifier: Apache-2.0

  Saved Layout List - Presentational component for saved layout selection
-->
<script lang="ts">
  import type { SavedLayoutSummary } from '../../../../shared/ipc-contract'

  interface Props {
    layouts: SavedLayoutSummary[]
    selectedLayout: string | null
    isLoading?: boolean
    errorMessage?: string
    onSelect: (name: string) => void
    onSubmit: (name: string) => void
    onNavigateToPrevSection?: () => void
    onNavigateToNextSection?: () => void
  }

  let {
    layouts,
    selectedLayout,
    isLoading = false,
    errorMessage = '',
    onSelect,
    onSubmit,
    onNavigateToPrevSection,
    onNavigateToNextSection
  }: Props = $props()

  function handleKeydown(event: KeyboardEvent): void {
    if (layouts.length === 0) return

    // Guard: ensure selectedLayout exists in current layouts (handle stale selection)
    const validSelectedLayout =
      selectedLayout && layouts.find((l) => l.name === selectedLayout) ? selectedLayout : null
    const currentIndex = validSelectedLayout
      ? layouts.findIndex((l) => l.name === validSelectedLayout)
      : -1

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (currentIndex < layouts.length - 1) {
        // Not at last item - move selection down
        onSelect(layouts[currentIndex + 1].name)
      } else {
        // At last item - try boundary escape, fallback to wrap if no callback
        if (onNavigateToNextSection) {
          onNavigateToNextSection()
        } else {
          // Fallback: wrap to first item
          onSelect(layouts[0].name)
        }
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (currentIndex > 0) {
        // Not at first item - move selection up
        onSelect(layouts[currentIndex - 1].name)
      } else {
        // At first item - try boundary escape, fallback to wrap if no callback
        if (onNavigateToPrevSection) {
          onNavigateToPrevSection()
        } else {
          // Fallback: wrap to last item
          onSelect(layouts[layouts.length - 1].name)
        }
      }
    } else if (event.key === 'Enter' && validSelectedLayout) {
      event.preventDefault()
      onSubmit(validSelectedLayout)
    }
  }

  function handleLayoutClick(layoutName: string): void {
    if (layoutName === selectedLayout) {
      // Clicking already selected layout confirms it
      onSubmit(layoutName)
    } else {
      // Clicking unselected layout just selects it
      onSelect(layoutName)
    }
  }
</script>

<div
  class="saved-layout-list"
  onkeydown={handleKeydown}
  role="listbox"
  aria-label="Saved layouts"
  tabindex="0"
>
  {#if isLoading}
    <p class="saved-layouts-status">Loading saved layouts...</p>
  {:else if errorMessage}
    <p class="saved-layouts-error">{errorMessage}</p>
  {:else if layouts.length > 0}
    <div class="saved-layouts-items" role="group">
      {#each layouts as layout (layout.name)}
        {@const isSelected = layout.name === selectedLayout}
        <button
          class="saved-layout-item"
          class:saved-layout-item--selected={isSelected}
          onclick={() => handleLayoutClick(layout.name)}
          role="option"
          aria-selected={isSelected}
          tabindex={isSelected ? 0 : -1}
        >
          <span class="saved-layout-name">{layout.name}</span>
        </button>
      {/each}
    </div>
  {:else}
    <p class="saved-layouts-empty">No saved layouts yet. Create one from workspace.</p>
  {/if}
</div>

<style>
  .saved-layout-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .saved-layouts-items {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .saved-layout-item {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    border: 1px solid var(--cc-border, rgba(255, 255, 255, 0.1));
    border-radius: 6px;
    background: var(--cc-surface, rgba(255, 255, 255, 0.05));
    color: var(--cc-text-primary, #e0e0e0);
    cursor: pointer;
    transition: all 200ms ease-out;
    text-align: left;
  }

  .saved-layout-item:hover {
    border-color: var(--cc-border-hover, rgba(255, 255, 255, 0.2));
    background: var(--cc-surface-hover, rgba(255, 255, 255, 0.08));
  }

  .saved-layout-item:focus {
    outline: 2px solid var(--cc-focus, #4a9eff);
    outline-offset: 2px;
  }

  .saved-layout-item--selected {
    border-color: var(--cc-accent, #4a9eff);
    background: var(--cc-surface-active, rgba(74, 158, 255, 0.15));
  }

  .saved-layout-name {
    font-size: 13px;
    font-weight: 400;
  }

  .saved-layouts-status,
  .saved-layouts-error,
  .saved-layouts-empty {
    font-size: 13px;
    color: var(--cc-text-muted, #888);
    margin: 0;
    padding: 12px;
    text-align: center;
  }

  .saved-layouts-error {
    color: #e06c75;
    background: rgba(224, 108, 117, 0.1);
    border-radius: 6px;
  }
</style>
