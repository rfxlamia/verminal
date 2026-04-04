import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/svelte'
import LayoutPreview from './LayoutPreview.svelte'
import type { LayoutName } from '../../../../shared/ipc-contract'

describe('LayoutPreview', () => {
  it('renders 1 preview cell for single layout', () => {
    const { container } = render(LayoutPreview, {
      props: { layoutName: 'single' as LayoutName }
    })

    const cells = container.querySelectorAll('.preview-cell')
    expect(cells).toHaveLength(1)
  })

  it('renders 2 preview cells for horizontal layout', () => {
    const { container } = render(LayoutPreview, {
      props: { layoutName: 'horizontal' as LayoutName }
    })

    const cells = container.querySelectorAll('.preview-cell')
    expect(cells).toHaveLength(2)
  })

  it('renders 3 preview cells for mixed layout with top cell', () => {
    const { container } = render(LayoutPreview, {
      props: { layoutName: 'mixed' as LayoutName }
    })

    const cells = container.querySelectorAll('.preview-cell')
    expect(cells).toHaveLength(3)

    const topCell = container.querySelector('.preview-cell--top')
    expect(topCell).toBeTruthy()
  })

  it('renders 4 preview cells for grid layout', () => {
    const { container } = render(LayoutPreview, {
      props: { layoutName: 'grid' as LayoutName }
    })

    const cells = container.querySelectorAll('.preview-cell')
    expect(cells).toHaveLength(4)
  })

  it('renders placeholder when layoutName is null', () => {
    const { container } = render(LayoutPreview, {
      props: { layoutName: null }
    })

    const cells = container.querySelectorAll('.preview-cell')
    expect(cells).toHaveLength(0)

    const placeholder = container.querySelector('.preview-placeholder')
    expect(placeholder).toBeTruthy()
    expect(placeholder?.getAttribute('aria-hidden')).toBe('true')
  })

  it('has aria-label on container', () => {
    const { container } = render(LayoutPreview, {
      props: { layoutName: 'single' as LayoutName }
    })

    const preview = container.querySelector('.layout-preview')
    expect(preview?.getAttribute('aria-label')).toBe('Layout preview')
  })

  it('applies correct grid class for each layout type', () => {
    const testCases: { layout: LayoutName; className: string }[] = [
      { layout: 'single', className: 'preview-grid--1' },
      { layout: 'horizontal', className: 'preview-grid--2' },
      { layout: 'mixed', className: 'preview-grid--3' },
      { layout: 'grid', className: 'preview-grid--4' }
    ]

    for (const { layout, className } of testCases) {
      const { container } = render(LayoutPreview, {
        props: { layoutName: layout }
      })

      const grid = container.querySelector(`.${className}`)
      expect(grid).toBeTruthy()
    }
  })
})
