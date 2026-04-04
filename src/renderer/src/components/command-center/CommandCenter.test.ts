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

  describe('preset launch flow', () => {
    it('submits preset 2 without active panes calls API and sets horizontal layout', async () => {
      // Stub window.api before importing component
      const mockShellDetect = vi.fn().mockResolvedValue({ ok: true, data: ['/bin/bash'] })
      const mockGetPaths = vi.fn().mockResolvedValue({ ok: true, data: { home: '/home/test', userData: '', logsDir: '' } })
      const mockPtySpawn = vi.fn()
        .mockResolvedValueOnce({ ok: true, data: { sessionId: 101 } })
        .mockResolvedValueOnce({ ok: true, data: { sessionId: 102 } })

      vi.stubGlobal('window', {
        api: {
          shell: { detect: mockShellDetect },
          app: { getPaths: mockGetPaths },
          pty: {
            spawn: mockPtySpawn,
            kill: vi.fn().mockResolvedValue({ ok: true, data: undefined })
          }
        }
      })

      const CommandCenter = await getCommandCenter()
      const { openCommandCenter, commandCenterState } = await import('../../stores/command-center-store.svelte')
      const { layoutState, resetLayoutState } = await import('../../stores/layout-store.svelte')

      // Reset to clean state
      resetLayoutState()
      openCommandCenter()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      mount(CommandCenter, { target })

      await tick()
      await tick()

      // Select preset 2 and submit
      const container = target.querySelector('.preset-launcher')
      expect(container).not.toBeNull()
      ;(container as HTMLElement).focus()

      // Press '2' to select preset 2
      const keydownEvent2 = new KeyboardEvent('keydown', { key: '2', bubbles: true })
      container?.dispatchEvent(keydownEvent2)

      await tick()

      // Press Enter to submit
      const keydownEventEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      container?.dispatchEvent(keydownEventEnter)

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100))
      await tick()

      // Verify API calls
      expect(mockShellDetect).toHaveBeenCalled()
      expect(mockGetPaths).toHaveBeenCalled()
      expect(mockPtySpawn).toHaveBeenCalledTimes(2)

      // Verify layout state
      expect(layoutState.layoutName).toBe('horizontal')
      expect(layoutState.panes.length).toBe(2)

      // Verify Command Center is closed
      expect(commandCenterState.isOpen).toBe(false)

      vi.unstubAllGlobals()
    })

    it('shows inline error when shell detection fails', async () => {
      // Stub window.api with failing shell detection
      const mockShellDetect = vi.fn().mockResolvedValue({ ok: false, error: { code: 'DETECT_ERROR', message: 'No shell found' } })

      vi.stubGlobal('window', {
        api: {
          shell: { detect: mockShellDetect },
          app: { getPaths: vi.fn() },
          pty: { spawn: vi.fn(), kill: vi.fn() }
        }
      })

      const CommandCenter = await getCommandCenter()
      const { openCommandCenter, commandCenterState } = await import('../../stores/command-center-store.svelte')
      const { resetLayoutState } = await import('../../stores/layout-store.svelte')

      resetLayoutState()
      openCommandCenter()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      mount(CommandCenter, { target })

      await tick()
      await tick()

      // Submit preset 1
      const container = target.querySelector('.preset-launcher')
      ;(container as HTMLElement).focus()

      const keydownEventEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      container?.dispatchEvent(keydownEventEnter)

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100))
      await tick()

      // Verify error is shown
      const errorElement = target.querySelector('.spawn-error')
      expect(errorElement).not.toBeNull()
      expect(errorElement?.textContent).toContain('Shell detection failed')

      // Command Center should still be open
      expect(commandCenterState.isOpen).toBe(true)

      vi.unstubAllGlobals()
    })

    it('requests workspace replace confirmation when active sessions exist', async () => {
      const CommandCenter = await getCommandCenter()
      const { openCommandCenter } = await import('../../stores/command-center-store.svelte')
      const { layoutState, initSinglePaneLayout, resetLayoutState } = await import('../../stores/layout-store.svelte')
      const { workspaceReplaceState } = await import('../../stores/workspace-replace-confirmation-store.svelte')

      // Reset and create an active session
      resetLayoutState()
      initSinglePaneLayout(999) // Create a pane with sessionId 999
      openCommandCenter()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      mount(CommandCenter, { target })

      await tick()
      await tick()

      // Verify we have an active session
      expect(layoutState.panes.length).toBe(1)

      // Try to submit a preset
      const container = target.querySelector('.preset-launcher')
      ;(container as HTMLElement).focus()

      const keydownEventEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      container?.dispatchEvent(keydownEventEnter)

      await tick()

      // Should have requested workspace replace confirmation
      expect(workspaceReplaceState.visible).toBe(true)
      expect(workspaceReplaceState.sessionCount).toBe(1)
    })
  })
})
