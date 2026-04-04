<script lang="ts">
  import { tick } from 'svelte'

  // Public API type for bind:this usage
  export interface PaneHeaderExports {
    startEditExternally: () => void
  }

  let {
    paneId,
    name,
    isFocused = false,
    onRename
  }: {
    paneId: number
    name: string
    isFocused?: boolean
    onRename?: (name: string) => void
  } = $props()

  // Fallback: if name is empty or whitespace-only
  let displayName = $derived(name?.trim() || `Pane ${paneId}`)

  // Inline edit state (local to PaneHeader - not in global stores)
  let isEditing = $state(false)
  let editValue = $state('')
  let inputEl: HTMLInputElement | undefined = $state()

  async function startEdit(): Promise<void> {
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
    const trimmed = editValue.trim()
    if (trimmed) {
      onRename?.(trimmed)
    }
    isEditing = false
  }

  function cancelRename(): void {
    isEditing = false
  }

  function handleClick(): void {
    if (!isEditing) {
      void startEdit()
    }
  }

  function handleInputKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitRename()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelRename()
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- Keyboard path for rename lives in PaneContainer via F2; header click is pointer-only -->
<header
  class="pane-header"
  class:is-focused={isFocused}
  class:is-editing={isEditing}
  onclick={handleClick}
>
  {#if isEditing}
    <input
      bind:this={inputEl}
      bind:value={editValue}
      class="pane-name-input"
      type="text"
      aria-label="Rename pane"
      onkeydown={handleInputKeydown}
      onblur={commitRename}
    />
  {:else}
    <span class="pane-header-name">{displayName}</span>
  {/if}
</header>

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
  }

  .pane-header.is-focused {
    border-bottom-color: var(--cc-focus, #62c6ff);
  }

  .pane-header.is-editing {
    cursor: text;
  }

  .pane-header-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
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
</style>
