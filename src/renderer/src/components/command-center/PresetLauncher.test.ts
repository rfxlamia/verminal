import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { tick } from 'svelte'

describe('PresetLauncher', () => {
  beforeEach(() => {
    vi.resetModules()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  // Helper to get fresh component after resetModules
  async function getPresetLauncher(): Promise<typeof import('./PresetLauncher.svelte').default> {
    const mod = await import('./PresetLauncher.svelte')
    return mod.default
  }

  describe('rendering', () => {
    it('renders 4 preset buttons with labels', async () => {
      const PresetLauncher = await getPresetLauncher()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      mount(PresetLauncher, {
        target,
        props: {
          selectedPreset: 1,
          isSpawning: false,
          errorMessage: '',
          onSelect,
          onSubmit
        }
      })

      const buttons = target.querySelectorAll('.preset-btn')
      expect(buttons.length).toBe(4)

      // Check labels
      expect(buttons[0]?.textContent).toContain('1 Pane')
      expect(buttons[1]?.textContent).toContain('2 Panes')
      expect(buttons[2]?.textContent).toContain('3 Panes')
      expect(buttons[3]?.textContent).toContain('4 Panes')
    })

    it('has preset 1 selected by default', async () => {
      const PresetLauncher = await getPresetLauncher()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      mount(PresetLauncher, {
        target,
        props: {
          selectedPreset: 1,
          isSpawning: false,
          errorMessage: '',
          onSelect,
          onSubmit
        }
      })

      const buttons = target.querySelectorAll('.preset-btn')
      expect(buttons[0]?.classList.contains('preset-btn--selected')).toBe(true)
      expect(buttons[1]?.classList.contains('preset-btn--selected')).toBe(false)
      expect(buttons[2]?.classList.contains('preset-btn--selected')).toBe(false)
      expect(buttons[3]?.classList.contains('preset-btn--selected')).toBe(false)
    })

    it('renders visual icons for each preset', async () => {
      const PresetLauncher = await getPresetLauncher()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      mount(PresetLauncher, {
        target,
        props: {
          selectedPreset: 1,
          isSpawning: false,
          errorMessage: '',
          onSelect,
          onSubmit
        }
      })

      // Each button should have a visual icon
      const icons = target.querySelectorAll('.preset-icon')
      expect(icons.length).toBe(4)
    })
  })

  describe('keyboard interactions', () => {
    it('pressing number key 1-4 changes selected preset', async () => {
      const PresetLauncher = await getPresetLauncher()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      mount(PresetLauncher, {
        target,
        props: {
          selectedPreset: 1,
          isSpawning: false,
          errorMessage: '',
          onSelect,
          onSubmit
        }
      })

      await tick()

      const container = target.querySelector('.preset-launcher')
      expect(container).not.toBeNull()

      // Focus the container and dispatch key event
      ;(container as HTMLElement).focus()

      // Press key '3'
      const keydownEvent = new KeyboardEvent('keydown', { key: '3', bubbles: true })
      container?.dispatchEvent(keydownEvent)

      expect(onSelect).toHaveBeenCalledWith(3)
    })

    it('pressing Enter calls onSubmit with selected preset', async () => {
      const PresetLauncher = await getPresetLauncher()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      mount(PresetLauncher, {
        target,
        props: {
          selectedPreset: 2,
          isSpawning: false,
          errorMessage: '',
          onSelect,
          onSubmit
        }
      })

      await tick()

      const container = target.querySelector('.preset-launcher')
      expect(container).not.toBeNull()

      // Focus the container and dispatch key event
      ;(container as HTMLElement).focus()

      // Press Enter
      const keydownEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      container?.dispatchEvent(keydownEvent)

      expect(onSubmit).toHaveBeenCalledWith(2)
    })

    it('Tab navigates between preset buttons with wrap-around', async () => {
      const PresetLauncher = await getPresetLauncher()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      mount(PresetLauncher, {
        target,
        props: {
          selectedPreset: 1,
          isSpawning: false,
          errorMessage: '',
          onSelect,
          onSubmit
        }
      })

      await tick()

      const container = target.querySelector('.preset-launcher')
      const buttons = target.querySelectorAll('.preset-btn')
      expect(buttons.length).toBe(4)

      // Focus button 1
      ;(buttons[0] as HTMLElement).focus()
      expect(document.activeElement).toBe(buttons[0])

      // Tab from button 4 should wrap to button 1 (simulate being on button 4)
      ;(buttons[3] as HTMLElement).focus()
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
      container?.dispatchEvent(tabEvent)

      expect(document.activeElement).toBe(buttons[0])
    })

    it('Shift+Tab navigates backwards with wrap-around', async () => {
      const PresetLauncher = await getPresetLauncher()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      mount(PresetLauncher, {
        target,
        props: {
          selectedPreset: 1,
          isSpawning: false,
          errorMessage: '',
          onSelect,
          onSubmit
        }
      })

      await tick()

      const container = target.querySelector('.preset-launcher')
      const buttons = target.querySelectorAll('.preset-btn')

      // Focus button 1
      ;(buttons[0] as HTMLElement).focus()

      // Shift+Tab from button 1 should wrap to button 4
      const shiftTabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true
      })
      container?.dispatchEvent(shiftTabEvent)

      expect(document.activeElement).toBe(buttons[3])
    })
  })

  describe('pointer interactions', () => {
    it('clicking unselected preset only changes selection', async () => {
      const PresetLauncher = await getPresetLauncher()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      mount(PresetLauncher, {
        target,
        props: {
          selectedPreset: 1,
          isSpawning: false,
          errorMessage: '',
          onSelect,
          onSubmit
        }
      })

      await tick()

      const buttons = target.querySelectorAll('.preset-btn')
      // Click on button 3 (unselected)
      ;(buttons[2] as HTMLElement).click()

      expect(onSelect).toHaveBeenCalledWith(3)
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('clicking selected preset calls onSubmit', async () => {
      const PresetLauncher = await getPresetLauncher()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      mount(PresetLauncher, {
        target,
        props: {
          selectedPreset: 2,
          isSpawning: false,
          errorMessage: '',
          onSelect,
          onSubmit
        }
      })

      await tick()

      const buttons = target.querySelectorAll('.preset-btn')
      // Click on button 2 (selected)
      ;(buttons[1] as HTMLElement).click()

      expect(onSubmit).toHaveBeenCalledWith(2)
    })
  })

  describe('layout preview', () => {
    it('does NOT render layout-preview in PresetLauncher (preview is now in CommandCenter)', async () => {
      const PresetLauncher = await getPresetLauncher()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      mount(PresetLauncher, {
        target,
        props: {
          selectedPreset: 2,
          isSpawning: false,
          errorMessage: '',
          onSelect,
          onSubmit
        }
      })

      await tick()

      const preview = target.querySelector('.layout-preview')
      expect(preview).toBeNull()
    })

    it('does NOT render preview cells in PresetLauncher', async () => {
      const PresetLauncher = await getPresetLauncher()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      mount(PresetLauncher, {
        target,
        props: {
          selectedPreset: 4,
          isSpawning: false,
          errorMessage: '',
          onSelect,
          onSubmit
        }
      })

      await tick()

      const previewCells = target.querySelectorAll('.preview-cell')
      expect(previewCells.length).toBe(0)
    })
  })

  describe('status and error display', () => {
    it('displays spawn-error when errorMessage is set', async () => {
      const PresetLauncher = await getPresetLauncher()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      mount(PresetLauncher, {
        target,
        props: {
          selectedPreset: 1,
          isSpawning: false,
          errorMessage: 'Shell detection failed',
          onSelect,
          onSubmit
        }
      })

      await tick()

      const errorElement = target.querySelector('.spawn-error')
      expect(errorElement).not.toBeNull()
      expect(errorElement?.textContent).toContain('Shell detection failed')
    })

    it('displays spawn-status when isSpawning is true', async () => {
      const PresetLauncher = await getPresetLauncher()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      mount(PresetLauncher, {
        target,
        props: {
          selectedPreset: 1,
          isSpawning: true,
          errorMessage: '',
          onSelect,
          onSubmit
        }
      })

      await tick()

      const statusElement = target.querySelector('.spawn-status')
      expect(statusElement).not.toBeNull()
      expect(statusElement?.textContent).toContain('Spawning')
    })
  })

  describe('cross-section navigation', () => {
    it('ArrowRight moves to next preset within section', async () => {
      const PresetLauncher = await getPresetLauncher()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      mount(PresetLauncher, {
        target,
        props: {
          selectedPreset: 1,
          isSpawning: false,
          errorMessage: '',
          onSelect,
          onSubmit
        }
      })

      await tick()

      const container = target.querySelector('.preset-launcher')
      expect(container).not.toBeNull()

      // Focus and press ArrowRight
      ;(container as HTMLElement).focus()
      const keydownEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
      container?.dispatchEvent(keydownEvent)

      expect(onSelect).toHaveBeenCalledWith(2)
    })

    it('ArrowRight at preset 4 calls onNavigateToNextSection callback', async () => {
      const PresetLauncher = await getPresetLauncher()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()
      const onNavigateToNextSection = vi.fn()

      mount(PresetLauncher, {
        target,
        props: {
          selectedPreset: 4,
          isSpawning: false,
          errorMessage: '',
          onSelect,
          onSubmit,
          onNavigateToNextSection
        }
      })

      await tick()

      const container = target.querySelector('.preset-launcher')
      expect(container).not.toBeNull()

      // Focus and press ArrowRight from preset 4
      ;(container as HTMLElement).focus()
      const keydownEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
      container?.dispatchEvent(keydownEvent)

      expect(onNavigateToNextSection).toHaveBeenCalledOnce()
      expect(onSelect).not.toHaveBeenCalled()
    })

    it('ArrowLeft at preset 1 wraps to preset 4 via onSelect', async () => {
      const PresetLauncher = await getPresetLauncher()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      mount(PresetLauncher, {
        target,
        props: {
          selectedPreset: 1,
          isSpawning: false,
          errorMessage: '',
          onSelect,
          onSubmit
        }
      })

      await tick()

      const container = target.querySelector('.preset-launcher')
      expect(container).not.toBeNull()

      // Focus and press ArrowLeft from preset 1
      ;(container as HTMLElement).focus()
      const keydownEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
      container?.dispatchEvent(keydownEvent)

      expect(onSelect).toHaveBeenCalledWith(4)
    })

    it('ArrowDown calls onNavigateToNextSection', async () => {
      const PresetLauncher = await getPresetLauncher()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()
      const onNavigateToNextSection = vi.fn()

      mount(PresetLauncher, {
        target,
        props: {
          selectedPreset: 2,
          isSpawning: false,
          errorMessage: '',
          onSelect,
          onSubmit,
          onNavigateToNextSection
        }
      })

      await tick()

      const container = target.querySelector('.preset-launcher')
      expect(container).not.toBeNull()

      // Focus and press ArrowDown
      ;(container as HTMLElement).focus()
      const keydownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      container?.dispatchEvent(keydownEvent)

      expect(onNavigateToNextSection).toHaveBeenCalledOnce()
    })

    it('does not throw if onNavigateToNextSection is not provided', async () => {
      const PresetLauncher = await getPresetLauncher()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()
      // onNavigateToNextSection is not provided (optional)

      mount(PresetLauncher, {
        target,
        props: {
          selectedPreset: 4,
          isSpawning: false,
          errorMessage: '',
          onSelect,
          onSubmit
          // onNavigateToNextSection omitted
        }
      })

      await tick()

      const container = target.querySelector('.preset-launcher')
      expect(container).not.toBeNull()

      // Should not throw when ArrowRight at boundary without callback
      ;(container as HTMLElement).focus()
      const keydownEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })

      expect(() => {
        container?.dispatchEvent(keydownEvent)
      }).not.toThrow()
    })
  })
})
