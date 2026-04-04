import type { PaneColor } from '../../stores/layout-store.svelte'

export const PANE_COLOR_OPTIONS: { color: PaneColor; hex: string; label: string }[] = [
  { color: 'gray', hex: '#b0b0b0', label: 'Gray' }, // ~5.3:1 vs #1C1C1C
  { color: 'red', hex: '#f87171', label: 'Red' }, // ~5.5:1
  { color: 'orange', hex: '#fb923c', label: 'Orange' }, // ~6.5:1
  { color: 'amber', hex: '#fbbf24', label: 'Amber' }, // ~9.6:1
  { color: 'green', hex: '#4ade80', label: 'Green' }, // ~7.1:1
  { color: 'teal', hex: '#2dd4bf', label: 'Teal' }, // ~9.2:1
  { color: 'blue', hex: '#60a5fa', label: 'Blue' }, // ~5.9:1
  { color: 'purple', hex: '#c084fc', label: 'Purple' } // ~5.4:1
]

export function getPaneColorMeta(color: PaneColor | undefined) {
  return PANE_COLOR_OPTIONS.find((entry) => entry.color === color)
}
