<script lang="ts">
  let {
    paneId,
    name,
    isFocused = false,
    onEditRequest
  }: {
    paneId: number
    name: string
    isFocused?: boolean
    onEditRequest?: () => void
  } = $props()

  // Fallback: jika name kosong atau whitespace-only
  let displayName = $derived(name?.trim() || `Pane ${paneId}`)

  function handleClick(): void {
    // Story 5.1: emit request hook ke parent.
    // Story 5.2 akan memakai hook ini untuk editor inline aktual.
    onEditRequest?.()
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<header
  class="pane-header"
  class:is-focused={isFocused}
  onclick={handleClick}
  aria-label="Edit pane name: {displayName}"
>
  <span class="pane-header-name">{displayName}</span>
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

  .pane-header-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }
</style>
