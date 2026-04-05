import type { SavedLayoutData, SavedPaneData } from '../../../shared/ipc-contract'
import type { LayoutState } from '../stores/layout-store.svelte'

/**
 * Serializes LayoutState (renderer camelCase format) to SavedLayoutData (TOML snake_case format).
 * Excludes ephemeral state like sessionId.
 */
export function serializeLayoutForSave(
  displayName: string,
  state: LayoutState
): SavedLayoutData {
  const panes: SavedPaneData[] = state.panes.map((pane) => {
    const out: SavedPaneData = { pane_id: pane.paneId }
    if (pane.name) out.name = pane.name
    if (pane.color) out.color = pane.color
    return out
  })

  return {
    name: displayName,
    layout_name: state.layoutName,
    panes
  }
}
