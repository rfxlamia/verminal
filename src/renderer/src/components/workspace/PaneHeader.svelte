<script lang="ts">
  import { tick } from 'svelte'
  import ColorPicker from './ColorPicker.svelte'
  import { getPaneColorMeta } from './pane-colors'
  import type { PaneColor } from '../../stores/layout-store.svelte'

  // Public API type for bind:this usage
  export interface PaneHeaderExports {
    startEditExternally: () => void
  }

  let {
    paneId,
    name,
    color,
    isFocused = false,
    onEditRequest,
    onRename,
    onColorChange
  }: {
    paneId: number
    name: string
    color?: PaneColor
    isFocused?: boolean
    onEditRequest?: () => void
    onRename?: (name: string) => void
    onColorChange?: (color: PaneColor | undefined) => void
  } = $props()

  // Fallback: if name is empty or whitespace-only
  let displayName = $derived(name?.trim() || `Pane ${paneId}`)

  // Get color metadata for display
  let colorMeta = $derived(getPaneColorMeta(color))

  // Inline edit state (local to PaneHeader - not in global stores)
  let isEditing = $state(false)
  let editValue = $state('')
  let inputEl: HTMLInputElement | undefined = $state()
  let headerEl: HTMLElement | undefined = $state()
  let isCommitting = $state(false)

  async function startEdit(): Promise<void> {
    // Prevent reset if already editing (patch: startEdit while editing)
    if (isEditing) {
      inputEl?.select()
      return
    }
    editValue = displayName
    isEditing = true
    await tick()
    inputEl?.select()
  }

  // Exported method for parent to trigger edit mode (F2 path via PaneContainer)
  export function startEditExternally(): void {
    void startEdit()
  }

  function commitRename(): void {
    // Prevent double commit from blur + Enter race (patch: race condition)
    if (isCommitting) return
    isCommitting = true

    const trimmed = editValue.trim()
    if (trimmed) {
      onRename?.(trimmed)
    }
    isEditing = false
    isCommitting = false

    // Restore focus to header after commit (patch: focus management)
    headerEl?.focus()
  }

  function cancelRename(): void {
    isEditing = false
    // Restore focus to header after cancel (patch: focus management)
    headerEl?.focus()
  }

  function handleClick(e: MouseEvent): void {
    // Only trigger on left-click (patch: left-click only)
    if (e.button !== 0) return
    // Emit edit request to parent - parent decides how to handle (AC #2)
    // Parent can call startEditExternally() via bind:this if it wants inline edit
    onEditRequest?.()
  }

  function handleInputKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitRename()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelRename()
    } else {
      // Prevent other keys from bubbling to parent (patch: stopPropagation)
      e.stopPropagation()
    }
  }

  function handleColorSelect(selectedColor: PaneColor | undefined): void {
    onColorChange?.(selectedColor)
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- Keyboard path for rename lives in PaneContainer via F2; header click is pointer-only -->
<header
  bind:this={headerEl}
  class="pane-header"
  class:is-focused={isFocused}
  class:is-editing={isEditing}
  data-color={color ?? ''}
  style:--pane-accent-color={colorMeta?.hex ?? 'transparent'}
  onclick={handleClick}
>
  {#if isEditing}
    <div class="pane-header-edit">
      <input
        bind:this={inputEl}
        bind:value={editValue}
        class="pane-name-input"
        type="text"
        maxlength="64"
        aria-label="Rename pane"
        onkeydown={handleInputKeydown}
        onblur={commitRename}
      />
      <ColorPicker selectedColor={color} onSelect={handleColorSelect} />
    </div>
  {:else}
    <div class="pane-header-display">
      <span class="pane-header-name">{displayName}</span>
      {#if colorMeta}
        <span class="pane-color-label" style="color: {colorMeta.hex}">{colorMeta.label}</span>
      {/if}
    </div>
  {/if}
</header>

<!-- Screen reader announcement region (patch: aria-live) -->
<div aria-live="polite" aria-atomic="true" class="sr-only">
  {#if !isEditing}
    Pane renamed to {displayName}
  {/if}
</div>

<style>
  .pane-header {
    display: flex;
    align-items: center;
    height: 28px;
    min-height: 28px;
    padding: 0 8px;
    background: var(--cc-surface-primary, #1c1c1c);
    color: var(--cc-text-primary, #f7f7f7);
    font-family: 'Work Sans', system-ui, sans-serif;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    user-select: none;
    overflow: hidden;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    flex-shrink: 0;
    /* Accent border with pane color */
    border-left: 3px solid var(--pane-accent-color, transparent);
  }

  .pane-header.is-focused {
    border-bottom-color: var(--cc-focus, #62c6ff);
  }

  .pane-header.is-editing {
    height: auto;
    min-height: 28px;
    cursor: text;
  }

  .pane-header-display {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    overflow: hidden;
  }

  .pane-header-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .pane-color-label {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    border: 1px solid color-mix(in srgb, var(--pane-accent-color, transparent) 60%, transparent);
    background: color-mix(in srgb, var(--pane-accent-color, transparent) 10%, transparent);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .pane-header-edit {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    padding: 2px 0;
  }

  .pane-name-input {
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--cc-focus, #62c6ff);
    color: var(--cc-text-primary, #f7f7f7);
    font-family: 'Work Sans', system-ui, sans-serif;
    font-size: 12px;
    font-weight: 500;
    outline: none;
    width: 100%;
    padding: 0;
    flex: 1;
    transition: border-color 150ms ease;
  }

  /* Screen reader only - visually hidden but accessible */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
