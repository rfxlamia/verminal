import { describe, it, expect } from 'vitest'
import { serializeLayoutForSave } from './layout-serializer'
import type { LayoutState } from '../stores/layout-store.svelte'

describe('serializeLayoutForSave', () => {
  it('converts layoutState to SavedLayoutData format', () => {
    const state: LayoutState = {
      layoutName: 'grid',
      panes: [
        { paneId: 1, sessionId: 10, name: 'Server', color: 'blue' },
        { paneId: 2, sessionId: 11, name: 'Tests', color: 'green' },
        { paneId: 3, sessionId: 12, name: 'Pane 3' },
        { paneId: 4, sessionId: 13, name: 'Pane 4' }
      ]
    }
    const result = serializeLayoutForSave('dev-workspace', state)
    expect(result).toEqual({
      name: 'dev-workspace',
      layout_name: 'grid',
      panes: [
        { pane_id: 1, name: 'Server', color: 'blue' },
        { pane_id: 2, name: 'Tests', color: 'green' },
        { pane_id: 3, name: 'Pane 3' },
        { pane_id: 4, name: 'Pane 4' }
      ]
    })
  })

  it('excludes sessionId from output (not persisted)', () => {
    const state: LayoutState = {
      layoutName: 'single',
      panes: [{ paneId: 1, sessionId: 5, name: 'Terminal' }]
    }
    const result = serializeLayoutForSave('x', state)
    result.panes.forEach((p) => {
      expect(p).not.toHaveProperty('sessionId')
      expect(p).not.toHaveProperty('session_id')
    })
  })

  it('excludes undefined color (pane without color tag)', () => {
    const stateNoColor: LayoutState = {
      layoutName: 'single',
      panes: [{ paneId: 1, sessionId: 5, name: 'Terminal' }]
    }
    const result = serializeLayoutForSave('x', stateNoColor)
    expect(result.panes[0]).not.toHaveProperty('color')
  })

  it('handles empty panes array', () => {
    const emptyState: LayoutState = {
      layoutName: 'single',
      panes: []
    }
    const result = serializeLayoutForSave('empty-layout', emptyState)
    expect(result.panes).toEqual([])
  })

  it('excludes sessionId even when it is 0 or negative', () => {
    const stateWithWeirdSessionIds: LayoutState = {
      layoutName: 'grid',
      panes: [
        { paneId: 1, sessionId: 0, name: 'Pane 1' },
        { paneId: 2, sessionId: -1, name: 'Pane 2' }
      ]
    }
    const result = serializeLayoutForSave('weird', stateWithWeirdSessionIds)
    result.panes.forEach((p) => {
      expect(p).not.toHaveProperty('sessionId')
      expect(p).not.toHaveProperty('session_id')
    })
  })

  it('excludes empty name from output', () => {
    const state: LayoutState = {
      layoutName: 'single',
      panes: [{ paneId: 1, sessionId: 5, name: '' }]
    }
    const result = serializeLayoutForSave('x', state)
    expect(result.panes[0]).not.toHaveProperty('name')
  })

  it('includes all valid color options', () => {
    const validColors = [
      'gray',
      'red',
      'orange',
      'amber',
      'green',
      'teal',
      'blue',
      'purple'
    ] as const
    validColors.forEach((color, index) => {
      const state: LayoutState = {
        layoutName: 'single',
        panes: [{ paneId: index + 1, sessionId: index + 1, name: `Pane ${index + 1}`, color }]
      }
      const result = serializeLayoutForSave('x', state)
      expect(result.panes[0].color).toBe(color)
    })
  })
})
