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

  // ========== Story 5.2: Inline Rename Tests ==========

  describe('Inline Rename Mode', () => {
    it('enters edit mode when clicked', async () => {
      const PaneHeader = await getPaneHeader()
      const target = document.createElement('div')
      document.body.appendChild(target)

      mount(PaneHeader, { target, props: { paneId: 1, name: 'Test' } })

      const header = target.querySelector('header.pane-header')
      header!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
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

      mount(PaneHeader, { target, props: { paneId: 1, name: 'Infra Logs' } })

      const header = target.querySelector('header.pane-header')
      header!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await tick()

      const input = target.querySelector('input.pane-name-input') as HTMLInputElement
      expect(input).not.toBeNull()
      expect(input.value).toBe('Infra Logs')
    })

    it('calls select() on input after entering edit mode', async () => {
      const PaneHeader = await getPaneHeader()
      const target = document.createElement('div')
      document.body.appendChild(target)

      mount(PaneHeader, { target, props: { paneId: 1, name: 'Test' } })

      const header = target.querySelector('header.pane-header')
      header!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await tick()

      const input = target.querySelector('input.pane-name-input') as HTMLInputElement
      // select() is called asynchronously via tick(), text should be selected
      expect(input).not.toBeNull()
    })

    it('calls onRename with new name on Enter press', async () => {
      const PaneHeader = await getPaneHeader()
      const target = document.createElement('div')
      document.body.appendChild(target)

      const onRename = vi.fn()
      mount(PaneHeader, { target, props: { paneId: 1, name: 'Old Name', onRename } })

      const header = target.querySelector('header.pane-header')
      header!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
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
      mount(PaneHeader, { target, props: { paneId: 1, name: 'Original', onRename } })

      const header = target.querySelector('header.pane-header')
      header!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
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

      mount(PaneHeader, { target, props: { paneId: 1, name: 'Original' } })

      const header = target.querySelector('header.pane-header')
      header!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
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
      mount(PaneHeader, { target, props: { paneId: 1, name: 'Old', onRename } })

      const header = target.querySelector('header.pane-header')
      header!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
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
      mount(PaneHeader, { target, props: { paneId: 1, name: 'Original', onRename } })

      const header = target.querySelector('header.pane-header')
      header!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
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
      mount(PaneHeader, { target, props: { paneId: 1, name: 'Original', onRename } })

      const header = target.querySelector('header.pane-header')
      header!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
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
      mount(PaneHeader, { target, props: { paneId: 1, name: 'Original', onRename } })

      const header = target.querySelector('header.pane-header')
      header!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
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

      mount(PaneHeader, { target, props: { paneId: 1, name: 'Original' } })

      const header = target.querySelector('header.pane-header')
      header!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
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

      mount(PaneHeader, { target, props: { paneId: 1, name: 'Test' } })

      const header = target.querySelector('header.pane-header')
      header!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
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
      mount(PaneHeader, { target, props: { paneId: 1, name: 'Old', onRename } })

      const header = target.querySelector('header.pane-header')
      header!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
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
})
