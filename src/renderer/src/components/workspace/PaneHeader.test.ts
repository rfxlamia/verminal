import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from 'svelte'
import { tick } from 'svelte'

describe('PaneHeader', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  async function getPaneHeader(): Promise<typeof import('./PaneHeader.svelte').default> {
    const mod = await import('./PaneHeader.svelte')
    return mod.default
  }

  it('renders a semantic header element with .pane-header class', async () => {
    const PaneHeader = await getPaneHeader()
    const target = document.createElement('div')
    document.body.appendChild(target)

    mount(PaneHeader, { target, props: { paneId: 1, name: 'My Pane' } })

    const header = target.querySelector('header.pane-header')
    expect(header).not.toBeNull()
  })

  it('renders pane name in .pane-header-name element', async () => {
    const PaneHeader = await getPaneHeader()
    const target = document.createElement('div')
    document.body.appendChild(target)

    mount(PaneHeader, { target, props: { paneId: 1, name: 'Infra Logs' } })

    const nameEl = target.querySelector('.pane-header-name')
    expect(nameEl).not.toBeNull()
    expect(nameEl!.textContent).toBe('Infra Logs')
  })

  it('uses fallback "Pane {paneId}" when name prop is empty', async () => {
    const PaneHeader = await getPaneHeader()
    const target = document.createElement('div')
    document.body.appendChild(target)

    mount(PaneHeader, { target, props: { paneId: 42, name: '' } })

    const nameEl = target.querySelector('.pane-header-name')
    expect(nameEl).not.toBeNull()
    expect(nameEl!.textContent).toBe('Pane 42')
  })

  it('applies is-focused class when isFocused prop is true', async () => {
    const PaneHeader = await getPaneHeader()
    const target = document.createElement('div')
    document.body.appendChild(target)

    mount(PaneHeader, { target, props: { paneId: 1, name: 'Test', isFocused: true } })

    const header = target.querySelector('header.pane-header')
    expect(header!.classList.contains('is-focused')).toBe(true)
  })

  it('does not apply is-focused class when isFocused prop is false', async () => {
    const PaneHeader = await getPaneHeader()
    const target = document.createElement('div')
    document.body.appendChild(target)

    mount(PaneHeader, { target, props: { paneId: 1, name: 'Test', isFocused: false } })

    const header = target.querySelector('header.pane-header')
    expect(header!.classList.contains('is-focused')).toBe(false)
  })

  // ========== AC #2: onEditRequest callback ==========

  it('calls onEditRequest callback when clicked (AC #2)', async () => {
    const PaneHeader = await getPaneHeader()
    const target = document.createElement('div')
    document.body.appendChild(target)

    const onEditRequest = vi.fn()
    mount(PaneHeader, { target, props: { paneId: 1, name: 'Test', onEditRequest } })

    const header = target.querySelector('header.pane-header')
    header!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await tick()

    expect(onEditRequest).toHaveBeenCalledOnce()
  })

  it('does not crash when onEditRequest is not provided', async () => {
    const PaneHeader = await getPaneHeader()
    const target = document.createElement('div')
    document.body.appendChild(target)

    // No onEditRequest prop provided - should not throw
    mount(PaneHeader, { target, props: { paneId: 1, name: 'Test' } })

    const header = target.querySelector('header.pane-header')
    // Should not throw
    expect(() => {
      header!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    }).not.toThrow()
  })

  // ========== Story 5.2: Inline Rename Tests ==========

  describe('Inline Rename Mode', () => {
    // Note: With AC #2, click no longer directly enters edit mode.
    // Instead, click calls onEditRequest(), and parent calls startEditExternally().
    // Tests use bind:this pattern to trigger edit mode via the exported method.

    it('enters edit mode when startEditExternally() is called', async () => {
      const PaneHeader = await getPaneHeader()
      const target = document.createElement('div')
      document.body.appendChild(target)

      // Use bind:this pattern - component exports startEditExternally via bind:this
      const props: Record<string, unknown> = { paneId: 1, name: 'Test' }
      const instance = mount(PaneHeader, { target, props }) as unknown as {
        startEditExternally: () => void
      }

      // Trigger edit mode via the exported method (simulating PaneContainer F2 behavior)
      instance.startEditExternally()
      await tick()

      // Should show input instead of span
      const input = target.querySelector('input.pane-name-input')
      const span = target.querySelector('.pane-header-name')
      expect(input).not.toBeNull()
      expect(span).toBeNull()
    })

    it('shows input with current name value in edit mode', async () => {
      const PaneHeader = await getPaneHeader()
      const target = document.createElement('div')
      document.body.appendChild(target)

      const props: Record<string, unknown> = { paneId: 1, name: 'Infra Logs' }
      const instance = mount(PaneHeader, { target, props }) as unknown as {
        startEditExternally: () => void
      }

      instance.startEditExternally()
      await tick()

      const input = target.querySelector('input.pane-name-input') as HTMLInputElement
      expect(input).not.toBeNull()
      expect(input.value).toBe('Infra Logs')
    })

    it('calls select() on input after entering edit mode', async () => {
      const PaneHeader = await getPaneHeader()
      const target = document.createElement('div')
      document.body.appendChild(target)

      // Mock select() to verify it's called
      const selectMock = vi.fn()
      const originalSelect = HTMLInputElement.prototype.select
      HTMLInputElement.prototype.select = selectMock

      const props: Record<string, unknown> = { paneId: 1, name: 'Test' }
      const instance = mount(PaneHeader, { target, props }) as unknown as {
        startEditExternally: () => void
      }

      instance.startEditExternally()
      await tick()

      // Wait for the async select() call via tick().then()
      await tick()

      // Restore original before assertion
      HTMLInputElement.prototype.select = originalSelect

      expect(selectMock).toHaveBeenCalledOnce()
    })

    it('calls onRename with new name on Enter press', async () => {
      const PaneHeader = await getPaneHeader()
      const target = document.createElement('div')
      document.body.appendChild(target)

      const onRename = vi.fn()
      const props: Record<string, unknown> = { paneId: 1, name: 'Old Name', onRename }
      const instance = mount(PaneHeader, { target, props }) as unknown as {
        startEditExternally: () => void
      }

      instance.startEditExternally()
      await tick()

      const input = target.querySelector('input.pane-name-input') as HTMLInputElement
      input.value = 'New Name'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await tick()

      expect(onRename).toHaveBeenCalledOnce()
      expect(onRename).toHaveBeenCalledWith('New Name')
    })

    it('does not call onRename on Esc press', async () => {
      const PaneHeader = await getPaneHeader()
      const target = document.createElement('div')
      document.body.appendChild(target)

      const onRename = vi.fn()
      const props: Record<string, unknown> = { paneId: 1, name: 'Original', onRename }
      const instance = mount(PaneHeader, { target, props }) as unknown as {
        startEditExternally: () => void
      }

      instance.startEditExternally()
      await tick()

      const input = target.querySelector('input.pane-name-input') as HTMLInputElement
      input.value = 'Changed'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await tick()

      expect(onRename).not.toHaveBeenCalled()
    })

    it('reverts display to original name on Esc', async () => {
      const PaneHeader = await getPaneHeader()
      const target = document.createElement('div')
      document.body.appendChild(target)

      const props: Record<string, unknown> = { paneId: 1, name: 'Original' }
      const instance = mount(PaneHeader, { target, props }) as unknown as {
        startEditExternally: () => void
      }

      instance.startEditExternally()
      await tick()

      const input = target.querySelector('input.pane-name-input') as HTMLInputElement
      input.value = 'Changed'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await tick()

      // Should show span with original name
      const span = target.querySelector('.pane-header-name')
      expect(span).not.toBeNull()
      expect(span!.textContent).toBe('Original')
    })

    it('calls onRename on blur (commit-on-blur)', async () => {
      const PaneHeader = await getPaneHeader()
      const target = document.createElement('div')
      document.body.appendChild(target)

      const onRename = vi.fn()
      const props: Record<string, unknown> = { paneId: 1, name: 'Old', onRename }
      const instance = mount(PaneHeader, { target, props }) as unknown as {
        startEditExternally: () => void
      }

      instance.startEditExternally()
      await tick()

      const input = target.querySelector('input.pane-name-input') as HTMLInputElement
      input.value = 'Blurred Name'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('blur', { bubbles: true }))
      await tick()

      expect(onRename).toHaveBeenCalledOnce()
      expect(onRename).toHaveBeenCalledWith('Blurred Name')
    })

    it('does not call onRename when input is empty string on Enter', async () => {
      const PaneHeader = await getPaneHeader()
      const target = document.createElement('div')
      document.body.appendChild(target)

      const onRename = vi.fn()
      const props: Record<string, unknown> = { paneId: 1, name: 'Original', onRename }
      const instance = mount(PaneHeader, { target, props }) as unknown as {
        startEditExternally: () => void
      }

      instance.startEditExternally()
      await tick()

      const input = target.querySelector('input.pane-name-input') as HTMLInputElement
      input.value = ''
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await tick()

      expect(onRename).not.toHaveBeenCalled()
    })

    it('does not call onRename when input is whitespace-only on Enter', async () => {
      const PaneHeader = await getPaneHeader()
      const target = document.createElement('div')
      document.body.appendChild(target)

      const onRename = vi.fn()
      const props: Record<string, unknown> = { paneId: 1, name: 'Original', onRename }
      const instance = mount(PaneHeader, { target, props }) as unknown as {
        startEditExternally: () => void
      }

      instance.startEditExternally()
      await tick()

      const input = target.querySelector('input.pane-name-input') as HTMLInputElement
      input.value = '   '
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await tick()

      expect(onRename).not.toHaveBeenCalled()
    })

    it('exits edit mode after commit', async () => {
      const PaneHeader = await getPaneHeader()
      const target = document.createElement('div')
      document.body.appendChild(target)

      const onRename = vi.fn()
      const props: Record<string, unknown> = { paneId: 1, name: 'Original', onRename }
      const instance = mount(PaneHeader, { target, props }) as unknown as {
        startEditExternally: () => void
      }

      instance.startEditExternally()
      await tick()

      const input = target.querySelector('input.pane-name-input') as HTMLInputElement
      input.value = 'New Name'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await tick()

      // Should show span again
      const span = target.querySelector('.pane-header-name')
      expect(span).not.toBeNull()
      const newInput = target.querySelector('input.pane-name-input')
      expect(newInput).toBeNull()
    })

    it('exits edit mode after cancel', async () => {
      const PaneHeader = await getPaneHeader()
      const target = document.createElement('div')
      document.body.appendChild(target)

      const props: Record<string, unknown> = { paneId: 1, name: 'Original' }
      const instance = mount(PaneHeader, { target, props }) as unknown as {
        startEditExternally: () => void
      }

      instance.startEditExternally()
      await tick()

      const input = target.querySelector('input.pane-name-input') as HTMLInputElement
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await tick()

      // Should show span again
      const span = target.querySelector('.pane-header-name')
      expect(span).not.toBeNull()
      const newInput = target.querySelector('input.pane-name-input')
      expect(newInput).toBeNull()
    })

    it('input has aria-label="Rename pane" in edit mode', async () => {
      const PaneHeader = await getPaneHeader()
      const target = document.createElement('div')
      document.body.appendChild(target)

      const props: Record<string, unknown> = { paneId: 1, name: 'Test' }
      const instance = mount(PaneHeader, { target, props }) as unknown as {
        startEditExternally: () => void
      }

      instance.startEditExternally()
      await tick()

      const input = target.querySelector('input.pane-name-input') as HTMLInputElement
      expect(input).not.toBeNull()
      expect(input.getAttribute('aria-label')).toBe('Rename pane')
    })

    it('trims whitespace from name before calling onRename', async () => {
      const PaneHeader = await getPaneHeader()
      const target = document.createElement('div')
      document.body.appendChild(target)

      const onRename = vi.fn()
      const props: Record<string, unknown> = { paneId: 1, name: 'Old', onRename }
      const instance = mount(PaneHeader, { target, props }) as unknown as {
        startEditExternally: () => void
      }

      instance.startEditExternally()
      await tick()

      const input = target.querySelector('input.pane-name-input') as HTMLInputElement
      input.value = '  Trimmed Name  '
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await tick()

      expect(onRename).toHaveBeenCalledOnce()
      expect(onRename).toHaveBeenCalledWith('Trimmed Name')
    })
  })

  // ========== Story 5.3: Color Picker Integration Tests ==========
  describe('Color Picker Integration', () => {
    it('renders ColorPicker in edit mode', async () => {
      const PaneHeader = await getPaneHeader()
      const target = document.createElement('div')
      document.body.appendChild(target)

      const props: Record<string, unknown> = { paneId: 1, name: 'Test' }
      const instance = mount(PaneHeader, { target, props }) as unknown as {
        startEditExternally: () => void
      }

      instance.startEditExternally()
      await tick()

      const colorPicker = target.querySelector('.color-picker')
      expect(colorPicker).not.toBeNull()
    })

    it('does not render ColorPicker outside edit mode', async () => {
      const PaneHeader = await getPaneHeader()
      const target = document.createElement('div')
      document.body.appendChild(target)

      mount(PaneHeader, { target, props: { paneId: 1, name: 'Test' } })

      // Don't enter edit mode - stay in display mode
      const colorPicker = target.querySelector('.color-picker')
      expect(colorPicker).toBeNull()
    })

    it('renders color label beside pane name when color prop is set', async () => {
      const PaneHeader = await getPaneHeader()
      const target = document.createElement('div')
      document.body.appendChild(target)

      mount(PaneHeader, { target, props: { paneId: 1, name: 'Test', color: 'blue' } })

      const colorLabel = target.querySelector('.pane-color-label')
      expect(colorLabel).not.toBeNull()
      expect(colorLabel!.textContent).toBe('Blue')
    })

    it('passes current color as selectedColor to ColorPicker', async () => {
      const PaneHeader = await getPaneHeader()
      const target = document.createElement('div')
      document.body.appendChild(target)

      const props: Record<string, unknown> = { paneId: 1, name: 'Test', color: 'red' }
      const instance = mount(PaneHeader, { target, props }) as unknown as {
        startEditExternally: () => void
      }

      instance.startEditExternally()
      await tick()

      const selectedSwatch = target.querySelector('.color-swatch.is-selected')
      expect(selectedSwatch).not.toBeNull()
      expect(selectedSwatch!.getAttribute('aria-label')).toBe('Red')
    })

    it('calls onColorChange when color is selected from picker', async () => {
      const PaneHeader = await getPaneHeader()
      const target = document.createElement('div')
      document.body.appendChild(target)

      const onColorChange = vi.fn()
      const props: Record<string, unknown> = { paneId: 1, name: 'Test', onColorChange }
      const instance = mount(PaneHeader, { target, props }) as unknown as {
        startEditExternally: () => void
      }

      instance.startEditExternally()
      await tick()

      const swatches = target.querySelectorAll('.color-swatch')
      // Click on the blue swatch (7th index - blue)
      swatches[6].dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await tick()

      expect(onColorChange).toHaveBeenCalledOnce()
      expect(onColorChange).toHaveBeenCalledWith('blue')
    })

    it('renders data-color attribute matching selected color on header', async () => {
      const PaneHeader = await getPaneHeader()
      const target = document.createElement('div')
      document.body.appendChild(target)

      mount(PaneHeader, { target, props: { paneId: 1, name: 'Test', color: 'green' } })

      const header = target.querySelector('header.pane-header')
      expect(header!.getAttribute('data-color')).toBe('green')
    })

    it('renders no color label and empty data-color attribute when no color selected', async () => {
      const PaneHeader = await getPaneHeader()
      const target = document.createElement('div')
      document.body.appendChild(target)

      mount(PaneHeader, { target, props: { paneId: 1, name: 'Test', color: undefined } })

      const colorLabel = target.querySelector('.pane-color-label')
      expect(colorLabel).toBeNull()

      const header = target.querySelector('header.pane-header')
      expect(header!.getAttribute('data-color')).toBe('')
    })
  })
})
