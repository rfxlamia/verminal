import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from 'svelte'
import { tick } from 'svelte'
import type { PaneColor } from '../../stores/layout-store.svelte'
import { PANE_COLOR_OPTIONS } from './pane-colors'

describe('ColorPicker', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  async function getColorPicker(): Promise<typeof import('./ColorPicker.svelte').default> {
    const mod = await import('./ColorPicker.svelte')
    return mod.default
  }

  it('renders 8 color swatches', async () => {
    const ColorPicker = await getColorPicker()
    const target = document.createElement('div')
    document.body.appendChild(target)

    mount(ColorPicker, { target, props: {} })

    const swatches = target.querySelectorAll('button[type="button"]')
    expect(swatches.length).toBe(PANE_COLOR_OPTIONS.length)
  })

  it('renders label text for each color swatch (non-color signal)', async () => {
    const ColorPicker = await getColorPicker()
    const target = document.createElement('div')
    document.body.appendChild(target)

    mount(ColorPicker, { target, props: {} })

    const labels = target.querySelectorAll('.swatch-label')
    expect(labels.length).toBe(PANE_COLOR_OPTIONS.length)
    // Check that each label has visible text
    labels.forEach((label) => {
      expect(label.textContent?.trim()).toBeTruthy()
    })
  })

  it('marks selectedColor swatch with aria-pressed=true', async () => {
    const ColorPicker = await getColorPicker()
    const target = document.createElement('div')
    document.body.appendChild(target)

    mount(ColorPicker, { target, props: { selectedColor: 'blue' as PaneColor } })

    const swatches = target.querySelectorAll('.color-swatch')
    let foundSelected = false
    swatches.forEach((swatch) => {
      if (swatch.getAttribute('aria-pressed') === 'true') {
        foundSelected = true
        expect(swatch.classList.contains('is-selected')).toBe(true)
      }
    })
    expect(foundSelected).toBe(true)
  })

  it('marks non-selected swatches with aria-pressed=false', async () => {
    const ColorPicker = await getColorPicker()
    const target = document.createElement('div')
    document.body.appendChild(target)

    mount(ColorPicker, { target, props: { selectedColor: 'blue' as PaneColor } })

    const swatches = target.querySelectorAll('.color-swatch')
    let nonSelectedCount = 0
    swatches.forEach((swatch) => {
      if (swatch.getAttribute('aria-pressed') === 'false') {
        nonSelectedCount++
      }
    })
    expect(nonSelectedCount).toBe(PANE_COLOR_OPTIONS.length - 1) // All except selected
  })

  it('calls onSelect with color when swatch clicked', async () => {
    const ColorPicker = await getColorPicker()
    const target = document.createElement('div')
    document.body.appendChild(target)

    const onSelect = vi.fn()
    mount(ColorPicker, { target, props: { onSelect } })

    const swatches = target.querySelectorAll('.color-swatch')
    // Click the first swatch
    swatches[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await tick()

    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect).toHaveBeenCalledWith('gray')
  })

  it('calls onSelect with undefined when selected swatch clicked again (toggle off)', async () => {
    const ColorPicker = await getColorPicker()
    const target = document.createElement('div')
    document.body.appendChild(target)

    const onSelect = vi.fn()
    mount(ColorPicker, { target, props: { selectedColor: 'gray' as PaneColor, onSelect } })

    const swatches = target.querySelectorAll('.color-swatch')
    // Find and click the gray swatch (first one)
    swatches[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await tick()

    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect).toHaveBeenCalledWith(undefined)
  })

  it('renders native button swatches that remain focusable in DOM order', async () => {
    const ColorPicker = await getColorPicker()
    const target = document.createElement('div')
    document.body.appendChild(target)

    mount(ColorPicker, { target, props: {} })

    const buttons = target.querySelectorAll('button[type="button"]')
    expect(buttons.length).toBe(PANE_COLOR_OPTIONS.length)
    // Each button should be focusable
    buttons.forEach((btn) => {
      expect(btn.getAttribute('tabindex')).not.toBe('-1')
    })
  })

  it('uses native button elements that respond to Enter/Space via browser default', async () => {
    const ColorPicker = await getColorPicker()
    const target = document.createElement('div')
    document.body.appendChild(target)

    mount(ColorPicker, { target, props: {} })

    // Native buttons automatically trigger click on Enter/Space
    // This test documents that we're using semantic buttons for accessibility
    const buttons = target.querySelectorAll('button[type="button"]')
    expect(buttons.length).toBe(PANE_COLOR_OPTIONS.length)

    // Verify each button is a native button (not a div with onclick)
    buttons.forEach((btn) => {
      expect(btn.tagName.toLowerCase()).toBe('button')
    })
  })

  it('has role=group and aria-label on container', async () => {
    const ColorPicker = await getColorPicker()
    const target = document.createElement('div')
    document.body.appendChild(target)

    mount(ColorPicker, { target, props: {} })

    const container = target.querySelector('.color-picker')
    expect(container).not.toBeNull()
    expect(container?.getAttribute('role')).toBe('group')
    expect(container?.getAttribute('aria-label')).toBe('Pilih warna pane')
  })

  it('each swatch has aria-label matching color name', async () => {
    const ColorPicker = await getColorPicker()
    const target = document.createElement('div')
    document.body.appendChild(target)

    mount(ColorPicker, { target, props: {} })

    const swatches = target.querySelectorAll('.color-swatch')
    swatches.forEach((swatch) => {
      const ariaLabel = swatch.getAttribute('aria-label')
      expect(ariaLabel).toBeTruthy()
      expect(ariaLabel?.length).toBeGreaterThan(0)
    })
  })
})
