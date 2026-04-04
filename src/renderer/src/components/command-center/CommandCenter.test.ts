import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { tick } from 'svelte'
import { resetCommandCenterState } from '../../stores/command-center-store.svelte'

describe('CommandCenter', () => {
  beforeEach(() => {
    vi.resetModules()
    document.body.innerHTML = ''
    resetCommandCenterState()
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

    it('renders PresetLauncher component when open', async () => {
      const CommandCenter = await getCommandCenter()
      const { openCommandCenter } = await import('../../stores/command-center-store.svelte')

      openCommandCenter()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      mount(CommandCenter, { target })

      await tick()

      // Should render preset buttons
      const presetButtons = target.querySelectorAll('.preset-btn')
      expect(presetButtons.length).toBe(4)

      // Should render preset launcher container
      const presetLauncher = target.querySelector('.preset-launcher')
      expect(presetLauncher).not.toBeNull()
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
    it('focuses the first preset button when opened', async () => {
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

      const firstPresetBtn = target.querySelector('.preset-btn')
      expect(firstPresetBtn).not.toBeNull()

      // After opening, focus should be on first preset button
      expect(document.activeElement).toBe(firstPresetBtn)
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

    it('parent handles Escape but does not preventDefault all Tab events', async () => {
      const CommandCenter = await getCommandCenter()
      const { openCommandCenter } = await import('../../stores/command-center-store.svelte')

      openCommandCenter()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      mount(CommandCenter, { target })

      await tick()
      await tick()

      const backdrop = target.querySelector('.command-center-backdrop')
      expect(backdrop).not.toBeNull()

      // Tab should not be prevented by parent (PresetLauncher handles it)
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
      const preventDefaultSpy = vi.spyOn(tabEvent, 'preventDefault')

      backdrop?.dispatchEvent(tabEvent)

      // Parent should not preventDefault for Tab
      expect(preventDefaultSpy).not.toHaveBeenCalled()
    })
  })
})
