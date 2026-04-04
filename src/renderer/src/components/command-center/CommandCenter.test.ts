import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { tick } from 'svelte'

describe('CommandCenter', () => {
  beforeEach(() => {
    vi.resetModules()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  // Helper to get fresh component after resetModules
  async function getCommandCenter(): Promise<typeof import('./CommandCenter.svelte').default> {
    const mod = await import('./CommandCenter.svelte')
    return mod.default
  }

  describe('rendering', () => {
    it('renders backdrop and panel when isOpen is true', async () => {
      const CommandCenter = await getCommandCenter()
      const { openCommandCenter } = await import('../../stores/command-center-store.svelte')

      // Reset to open state
      openCommandCenter()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      mount(CommandCenter, { target })

      const backdrop = target.querySelector('.command-center-backdrop')
      const panel = target.querySelector('.command-center-panel')

      expect(backdrop).not.toBeNull()
      expect(panel).not.toBeNull()
    })

    it('does not render when isOpen is false', async () => {
      const CommandCenter = await getCommandCenter()
      const { closeCommandCenter } = await import('../../stores/command-center-store.svelte')

      // Ensure closed
      closeCommandCenter()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      mount(CommandCenter, { target })

      const backdrop = target.querySelector('.command-center-backdrop')

      expect(backdrop).toBeNull()
    })

    it('panel contains "Command Center" title', async () => {
      const CommandCenter = await getCommandCenter()
      const { openCommandCenter } = await import('../../stores/command-center-store.svelte')

      openCommandCenter()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      mount(CommandCenter, { target })

      const title = target.querySelector('.command-center-title')

      expect(title).not.toBeNull()
      expect(title?.textContent).toBe('Command Center')
    })
  })

  describe('accessibility', () => {
    it('has role="dialog" and aria-modal="true" when open', async () => {
      const CommandCenter = await getCommandCenter()
      const { openCommandCenter } = await import('../../stores/command-center-store.svelte')

      openCommandCenter()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      mount(CommandCenter, { target })

      const backdrop = target.querySelector('.command-center-backdrop')

      expect(backdrop).not.toBeNull()
      expect(backdrop?.getAttribute('role')).toBe('dialog')
      expect(backdrop?.getAttribute('aria-modal')).toBe('true')
      expect(backdrop?.getAttribute('aria-label')).toBe('Command Center')
    })
  })

  describe('keyboard interactions', () => {
    it('focuses the backdrop immediately when opened', async () => {
      const CommandCenter = await getCommandCenter()
      const { openCommandCenter } = await import('../../stores/command-center-store.svelte')

      openCommandCenter()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      mount(CommandCenter, { target })

      // Flush pending state changes and effects
      await tick()
      await tick()

      const backdrop = target.querySelector('.command-center-backdrop')

      expect(backdrop).not.toBeNull()
      expect(document.activeElement).toBe(backdrop)
    })

    it('pressing Escape calls closeCommandCenter()', async () => {
      const CommandCenter = await getCommandCenter()
      const { commandCenterState, openCommandCenter } =
        await import('../../stores/command-center-store.svelte')

      openCommandCenter()
      expect(commandCenterState.isOpen).toBe(true)

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      mount(CommandCenter, { target })

      // Flush pending state changes and effects
      await tick()
      await tick()

      const backdrop = target.querySelector('.command-center-backdrop')
      expect(backdrop).not.toBeNull()

      // Dispatch Escape key
      const keydownEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      backdrop?.dispatchEvent(keydownEvent)

      // Wait for microtask (closeAndRestoreFocus uses queueMicrotask)
      await new Promise((resolve) => queueMicrotask(resolve))

      expect(commandCenterState.isOpen).toBe(false)
    })

    it('prevents Tab from escaping the overlay', async () => {
      const CommandCenter = await getCommandCenter()
      const { openCommandCenter } = await import('../../stores/command-center-store.svelte')

      openCommandCenter()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      mount(CommandCenter, { target })

      // Flush pending state changes and effects
      await tick()
      await tick()

      const backdrop = target.querySelector('.command-center-backdrop')
      expect(backdrop).not.toBeNull()

      // Spy on preventDefault
      const keydownEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
      const preventDefaultSpy = vi.spyOn(keydownEvent, 'preventDefault')

      backdrop?.dispatchEvent(keydownEvent)

      // preventDefault should have been called
      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })
})
