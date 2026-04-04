import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from 'svelte'

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

  it('calls onEditRequest when clicked', async () => {
    const PaneHeader = await getPaneHeader()
    const target = document.createElement('div')
    document.body.appendChild(target)

    const onEditRequest = vi.fn()
    mount(PaneHeader, { target, props: { paneId: 1, name: 'Test', onEditRequest } })

    const header = target.querySelector('header.pane-header')
    header!.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(onEditRequest).toHaveBeenCalledOnce()
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

  it('does not crash when onEditRequest is not provided', async () => {
    const PaneHeader = await getPaneHeader()
    const target = document.createElement('div')
    document.body.appendChild(target)

    mount(PaneHeader, { target, props: { paneId: 1, name: 'Test' } })

    const header = target.querySelector('header.pane-header')
    expect(() => {
      header!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    }).not.toThrow()
  })
})
