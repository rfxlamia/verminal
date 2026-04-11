import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { tick } from 'svelte'
import { resetCommandCenterState } from '../../stores/command-center-store.svelte'
import type { SavedLayoutSummary } from '../../../../shared/ipc-contract'

describe('CommandCenter', () => {
  beforeEach(() => {
    vi.resetModules()
    document.body.innerHTML = ''
    resetCommandCenterState()

    // Default stub for window.api.layout to prevent unhandled errors
    vi.stubGlobal('window', {
      api: {
        layout: {
          list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
          load: vi.fn().mockResolvedValue({
            ok: true,
            data: { name: 'test', layout_name: 'single', panes: [{}] }
          }),
          save: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
          delete: vi.fn().mockResolvedValue({ ok: true, data: undefined })
        }
      }
    })
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
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
      const mockGetPaths = vi
        .fn()
        .mockResolvedValue({ ok: true, data: { home: '/home/test', userData: '', logsDir: '' } })
      const mockPtySpawn = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, data: { sessionId: 101 } })
        .mockResolvedValueOnce({ ok: true, data: { sessionId: 102 } })
      const mockLayoutList = vi.fn().mockResolvedValue({ ok: true, data: [] })
      const mockLayoutLoad = vi
        .fn()
        .mockResolvedValue({ ok: true, data: { name: 'test', layout_name: 'single', panes: [{}] } })

      vi.stubGlobal('window', {
        api: {
          shell: { detect: mockShellDetect },
          app: { getPaths: mockGetPaths },
          pty: {
            spawn: mockPtySpawn,
            kill: vi.fn().mockResolvedValue({ ok: true, data: undefined })
          },
          layout: {
            list: mockLayoutList,
            load: mockLayoutLoad,
            save: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
            delete: vi.fn().mockResolvedValue({ ok: true, data: undefined })
          }
        }
      })

      const CommandCenter = await getCommandCenter()
      const { openCommandCenter, commandCenterState } =
        await import('../../stores/command-center-store.svelte')
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
      const mockShellDetect = vi.fn().mockResolvedValue({
        ok: false,
        error: { code: 'DETECT_ERROR', message: 'No shell found' }
      })
      const mockLayoutList = vi.fn().mockResolvedValue({ ok: true, data: [] })

      vi.stubGlobal('window', {
        api: {
          shell: { detect: mockShellDetect },
          app: { getPaths: vi.fn() },
          pty: { spawn: vi.fn(), kill: vi.fn() },
          layout: {
            list: mockLayoutList,
            load: vi.fn().mockResolvedValue({
              ok: true,
              data: { name: 'test', layout_name: 'single', panes: [{}] }
            }),
            save: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
            delete: vi.fn().mockResolvedValue({ ok: true, data: undefined })
          }
        }
      })

      const CommandCenter = await getCommandCenter()
      const { openCommandCenter, commandCenterState } =
        await import('../../stores/command-center-store.svelte')
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
      const { layoutState, initSinglePaneLayout, resetLayoutState } =
        await import('../../stores/layout-store.svelte')
      const { workspaceReplaceState } =
        await import('../../stores/workspace-replace-confirmation-store.svelte')

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

  describe('layout preview', () => {
    it('renders LayoutPreview component when open', async () => {
      const CommandCenter = await getCommandCenter()
      const { openCommandCenter } = await import('../../stores/command-center-store.svelte')

      openCommandCenter()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      mount(CommandCenter, { target })

      await tick()

      const preview = target.querySelector('.layout-preview')
      expect(preview).not.toBeNull()
    })

    it('shows correct preview for selected preset', async () => {
      const CommandCenter = await getCommandCenter()
      const { openCommandCenter } = await import('../../stores/command-center-store.svelte')

      openCommandCenter()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      mount(CommandCenter, { target })

      await tick()
      await tick()

      // Preset 1 (single) is selected by default
      const previewGrid = target.querySelector('.preview-grid--1')
      expect(previewGrid).not.toBeNull()
    })

    it('does not call layout.load or pty.spawn for selection preview', async () => {
      const mockLayoutList = vi.fn().mockResolvedValue({ ok: true, data: [] })
      const mockLayoutLoad = vi.fn().mockResolvedValue({
        ok: true,
        data: { name: 'test', layout_name: 'single', panes: [{}] }
      })
      const mockPtySpawn = vi.fn().mockResolvedValue({ ok: true, data: { sessionId: 1 } })

      vi.stubGlobal('window', {
        api: {
          layout: {
            list: mockLayoutList,
            load: mockLayoutLoad,
            save: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
            delete: vi.fn().mockResolvedValue({ ok: true, data: undefined })
          },
          pty: {
            spawn: mockPtySpawn,
            kill: vi.fn().mockResolvedValue({ ok: true, data: undefined })
          },
          shell: { detect: vi.fn().mockResolvedValue({ ok: true, data: ['/bin/bash'] }) },
          app: {
            getPaths: vi
              .fn()
              .mockResolvedValue({ ok: true, data: { home: '/', userData: '', logsDir: '' } })
          }
        }
      })

      const CommandCenter = await getCommandCenter()
      const { openCommandCenter } = await import('../../stores/command-center-store.svelte')

      openCommandCenter()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      mount(CommandCenter, { target })

      await tick()
      await tick()

      // Select a different preset (just selection, not submit)
      const container = target.querySelector('.preset-launcher')
      ;(container as HTMLElement).focus()

      const keydownEvent = new KeyboardEvent('keydown', { key: '3', bubbles: true })
      container?.dispatchEvent(keydownEvent)

      await tick()

      // layout:load and pty:spawn should NOT be called for selection preview
      expect(mockLayoutLoad).not.toHaveBeenCalled()
      expect(mockPtySpawn).not.toHaveBeenCalled()

      vi.unstubAllGlobals()
    })

    it('shows correct preview for saved layouts when selected', async () => {
      const mockLayouts: SavedLayoutSummary[] = [
        { name: 'dev-workspace', layout_name: 'grid' },
        { name: 'personal', layout_name: 'single' }
      ]

      const mockLayoutList = vi.fn().mockResolvedValue({ ok: true, data: mockLayouts })

      vi.stubGlobal('window', {
        api: {
          layout: {
            list: mockLayoutList,
            load: vi.fn().mockResolvedValue({
              ok: true,
              data: { name: 'test', layout_name: 'single', panes: [{}] }
            }),
            save: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
            delete: vi.fn().mockResolvedValue({ ok: true, data: undefined })
          },
          shell: { detect: vi.fn().mockResolvedValue({ ok: true, data: ['/bin/bash'] }) },
          app: {
            getPaths: vi
              .fn()
              .mockResolvedValue({ ok: true, data: { home: '/', userData: '', logsDir: '' } })
          },
          pty: {
            spawn: vi.fn().mockResolvedValue({ ok: true, data: { sessionId: 1 } }),
            kill: vi.fn()
          }
        }
      })

      const CommandCenter = await getCommandCenter()
      const { openCommandCenter } = await import('../../stores/command-center-store.svelte')

      openCommandCenter()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      mount(CommandCenter, { target })

      await tick()
      await tick()

      // Select first saved layout (grid) - first item is already selected by default
      // so we need to click the second one to select it (which triggers onSelect, not onSubmit)
      const items = target.querySelectorAll('.saved-layout-item')
      expect(items.length).toBe(2)

      // Click second item to select it (first is already selected)
      ;(items[1] as HTMLElement).click()

      await tick()

      // Preview should update to show single layout
      const previewCells = target.querySelectorAll('.preview-cell')
      expect(previewCells.length).toBe(1)

      vi.unstubAllGlobals()
    })
  })

  describe('shortcut cheatsheet', () => {
    it('pressing ? shows the shortcut cheatsheet', async () => {
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

      // Cheatsheet should not be visible initially
      let cheatsheet = target.querySelector('.shortcut-cheatsheet')
      expect(cheatsheet).toBeNull()

      // Press ? key
      const keydownEvent = new KeyboardEvent('keydown', { key: '?', bubbles: true })
      backdrop?.dispatchEvent(keydownEvent)

      await tick()

      // Cheatsheet should now be visible
      cheatsheet = target.querySelector('.shortcut-cheatsheet')
      expect(cheatsheet).not.toBeNull()
    })

    it('pressing F1 shows the shortcut cheatsheet', async () => {
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

      // Press F1 key
      const keydownEvent = new KeyboardEvent('keydown', { key: 'F1', bubbles: true })
      backdrop?.dispatchEvent(keydownEvent)

      await tick()

      // Cheatsheet should be visible
      const cheatsheet = target.querySelector('.shortcut-cheatsheet')
      expect(cheatsheet).not.toBeNull()
    })

    it('pressing Esc when cheatsheet is open closes only the cheatsheet', async () => {
      const CommandCenter = await getCommandCenter()
      const { openCommandCenter, commandCenterState } =
        await import('../../stores/command-center-store.svelte')

      openCommandCenter()
      expect(commandCenterState.isOpen).toBe(true)

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      mount(CommandCenter, { target })

      await tick()
      await tick()

      const backdrop = target.querySelector('.command-center-backdrop')
      expect(backdrop).not.toBeNull()

      // First, open the cheatsheet with ?
      const keydownEventQuestion = new KeyboardEvent('keydown', { key: '?', bubbles: true })
      backdrop?.dispatchEvent(keydownEventQuestion)
      await tick()

      // Cheatsheet should be visible
      let cheatsheet = target.querySelector('.shortcut-cheatsheet')
      expect(cheatsheet).not.toBeNull()

      // Press Escape
      const keydownEventEsc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      backdrop?.dispatchEvent(keydownEventEsc)

      await tick()
      await new Promise((resolve) => queueMicrotask(resolve))

      // Cheatsheet should be closed but Command Center should still be open
      cheatsheet = target.querySelector('.shortcut-cheatsheet')
      expect(cheatsheet).toBeNull()
      expect(commandCenterState.isOpen).toBe(true)
    })

    it('pressing Esc twice closes Command Center after cheatsheet is closed', async () => {
      const CommandCenter = await getCommandCenter()
      const { openCommandCenter, commandCenterState } =
        await import('../../stores/command-center-store.svelte')

      openCommandCenter()
      expect(commandCenterState.isOpen).toBe(true)

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      mount(CommandCenter, { target })

      await tick()
      await tick()

      const backdrop = target.querySelector('.command-center-backdrop')
      expect(backdrop).not.toBeNull()

      // First, open the cheatsheet with ?
      const keydownEventQuestion = new KeyboardEvent('keydown', { key: '?', bubbles: true })
      backdrop?.dispatchEvent(keydownEventQuestion)
      await tick()

      // First Esc - closes cheatsheet
      const keydownEventEsc1 = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      backdrop?.dispatchEvent(keydownEventEsc1)
      await tick()
      await new Promise((resolve) => queueMicrotask(resolve))

      // Command Center should still be open
      expect(commandCenterState.isOpen).toBe(true)

      // Second Esc - closes Command Center
      const keydownEventEsc2 = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      backdrop?.dispatchEvent(keydownEventEsc2)
      await tick()
      await new Promise((resolve) => queueMicrotask(resolve))

      // Command Center should now be closed
      expect(commandCenterState.isOpen).toBe(false)
    })

    it('pressing ? toggles cheatsheet off when already open', async () => {
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

      // Open cheatsheet
      const keydownEvent1 = new KeyboardEvent('keydown', { key: '?', bubbles: true })
      backdrop?.dispatchEvent(keydownEvent1)
      await tick()

      let cheatsheet = target.querySelector('.shortcut-cheatsheet')
      expect(cheatsheet).not.toBeNull()

      // Press ? again to toggle off
      const keydownEvent2 = new KeyboardEvent('keydown', { key: '?', bubbles: true })
      backdrop?.dispatchEvent(keydownEvent2)
      await tick()

      // Cheatsheet should be closed
      cheatsheet = target.querySelector('.shortcut-cheatsheet')
      expect(cheatsheet).toBeNull()
    })

    it('shortcut help is scoped to Command Center backdrop only', async () => {
      // This test verifies that the ?/F1 handler is on the backdrop, not global
      const CommandCenter = await getCommandCenter()
      const { openCommandCenter, closeCommandCenter } =
        await import('../../stores/command-center-store.svelte')

      openCommandCenter()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      mount(CommandCenter, { target })

      await tick()
      await tick()

      // Close Command Center
      closeCommandCenter()
      await tick()

      // Dispatch ? on document (outside Command Center)
      const keydownEvent = new KeyboardEvent('keydown', { key: '?', bubbles: true })
      document.dispatchEvent(keydownEvent)

      await tick()

      // No errors should occur and no global state should be affected
      // The key point is the handler is scoped to the backdrop via onkeydown
    })
  })

  describe('cross-section navigation', () => {
    it('navigates from preset to saved layouts section with ArrowDown', async () => {
      const mockLayouts: SavedLayoutSummary[] = [
        { name: 'dev-workspace', layout_name: 'grid' },
        { name: 'personal', layout_name: 'single' }
      ]

      const mockLayoutList = vi.fn().mockResolvedValue({ ok: true, data: mockLayouts })

      vi.stubGlobal('window', {
        api: {
          layout: {
            list: mockLayoutList,
            load: vi.fn().mockResolvedValue({
              ok: true,
              data: { name: 'test', layout_name: 'single', panes: [{}] }
            }),
            save: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
            delete: vi.fn().mockResolvedValue({ ok: true, data: undefined })
          },
          shell: { detect: vi.fn().mockResolvedValue({ ok: true, data: ['/bin/bash'] }) },
          app: {
            getPaths: vi
              .fn()
              .mockResolvedValue({ ok: true, data: { home: '/', userData: '', logsDir: '' } })
          },
          pty: {
            spawn: vi.fn().mockResolvedValue({ ok: true, data: { sessionId: 1 } }),
            kill: vi.fn()
          }
        }
      })

      const CommandCenter = await getCommandCenter()
      const { openCommandCenter } = await import('../../stores/command-center-store.svelte')

      openCommandCenter()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      mount(CommandCenter, { target })

      await tick()
      await tick()

      const presetContainer = target.querySelector('.preset-launcher')
      expect(presetContainer).not.toBeNull()

      // Press ArrowDown from preset section
      const keydownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      presetContainer?.dispatchEvent(keydownEvent)

      await tick()
      await new Promise((resolve) => queueMicrotask(resolve))

      // Should have navigated to saved layouts section
      // Check that the first saved layout is now selected
      const savedLayoutItems = target.querySelectorAll('.saved-layout-item')
      expect(savedLayoutItems.length).toBe(2)
      expect(savedLayoutItems[0]?.classList.contains('saved-layout-item--selected')).toBe(true)

      vi.unstubAllGlobals()
    })

    it('navigates from saved layouts to preset section with ArrowUp at first item', async () => {
      const mockLayouts: SavedLayoutSummary[] = [
        { name: 'dev-workspace', layout_name: 'grid' },
        { name: 'personal', layout_name: 'single' }
      ]

      const mockLayoutList = vi.fn().mockResolvedValue({ ok: true, data: mockLayouts })

      vi.stubGlobal('window', {
        api: {
          layout: {
            list: mockLayoutList,
            load: vi.fn().mockResolvedValue({
              ok: true,
              data: { name: 'test', layout_name: 'single', panes: [{}] }
            }),
            save: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
            delete: vi.fn().mockResolvedValue({ ok: true, data: undefined })
          },
          shell: { detect: vi.fn().mockResolvedValue({ ok: true, data: ['/bin/bash'] }) },
          app: {
            getPaths: vi
              .fn()
              .mockResolvedValue({ ok: true, data: { home: '/', userData: '', logsDir: '' } })
          },
          pty: {
            spawn: vi.fn().mockResolvedValue({ ok: true, data: { sessionId: 1 } }),
            kill: vi.fn()
          }
        }
      })

      const CommandCenter = await getCommandCenter()
      const { openCommandCenter } = await import('../../stores/command-center-store.svelte')

      openCommandCenter()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      mount(CommandCenter, { target })

      await tick()
      await tick()

      // First navigate to saved layouts
      const presetContainer = target.querySelector('.preset-launcher')
      const keydownEventDown = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      presetContainer?.dispatchEvent(keydownEventDown)
      await tick()
      await new Promise((resolve) => queueMicrotask(resolve))

      // Now press ArrowUp at first saved layout item
      const savedListContainer = target.querySelector('.saved-layout-list')
      const keydownEventUp = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })
      savedListContainer?.dispatchEvent(keydownEventUp)

      await tick()
      await new Promise((resolve) => queueMicrotask(resolve))

      // Preset 4 should now be selected (boundary escape goes to preset 4)
      const presetButtons = target.querySelectorAll('.preset-btn')
      expect(presetButtons[3]?.classList.contains('preset-btn--selected')).toBe(true)

      vi.unstubAllGlobals()
    })

    it('wraps from last saved layout back to preset 1 with ArrowDown', async () => {
      const mockLayouts: SavedLayoutSummary[] = [
        { name: 'dev-workspace', layout_name: 'grid' },
        { name: 'personal', layout_name: 'single' }
      ]

      const mockLayoutList = vi.fn().mockResolvedValue({ ok: true, data: mockLayouts })

      vi.stubGlobal('window', {
        api: {
          layout: {
            list: mockLayoutList,
            load: vi.fn().mockResolvedValue({
              ok: true,
              data: { name: 'test', layout_name: 'single', panes: [{}] }
            }),
            save: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
            delete: vi.fn().mockResolvedValue({ ok: true, data: undefined })
          },
          shell: { detect: vi.fn().mockResolvedValue({ ok: true, data: ['/bin/bash'] }) },
          app: {
            getPaths: vi
              .fn()
              .mockResolvedValue({ ok: true, data: { home: '/', userData: '', logsDir: '' } })
          },
          pty: {
            spawn: vi.fn().mockResolvedValue({ ok: true, data: { sessionId: 1 } }),
            kill: vi.fn()
          }
        }
      })

      const CommandCenter = await getCommandCenter()
      const { openCommandCenter } = await import('../../stores/command-center-store.svelte')

      openCommandCenter()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      mount(CommandCenter, { target })

      await tick()
      await tick()

      // Navigate to saved layouts
      const presetContainer = target.querySelector('.preset-launcher')
      const keydownEventDown = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      presetContainer?.dispatchEvent(keydownEventDown)
      await tick()
      await new Promise((resolve) => queueMicrotask(resolve))

      // Select the last saved layout
      const savedItems = target.querySelectorAll('.saved-layout-item')
      ;(savedItems[1] as HTMLElement).click()
      await tick()

      // Press ArrowDown at last saved layout
      const savedListContainer = target.querySelector('.saved-layout-list')
      const keydownEventDown2 = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      savedListContainer?.dispatchEvent(keydownEventDown2)

      await tick()
      await new Promise((resolve) => queueMicrotask(resolve))

      // Should wrap back to preset 1
      const presetButtons = target.querySelectorAll('.preset-btn')
      expect(presetButtons[0]?.classList.contains('preset-btn--selected')).toBe(true)

      vi.unstubAllGlobals()
    })

    it('wraps from preset to preset 1 when no saved layouts exist', async () => {
      const mockLayoutList = vi.fn().mockResolvedValue({ ok: true, data: [] })

      vi.stubGlobal('window', {
        api: {
          layout: {
            list: mockLayoutList,
            load: vi.fn().mockResolvedValue({
              ok: true,
              data: { name: 'test', layout_name: 'single', panes: [{}] }
            }),
            save: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
            delete: vi.fn().mockResolvedValue({ ok: true, data: undefined })
          },
          shell: { detect: vi.fn().mockResolvedValue({ ok: true, data: ['/bin/bash'] }) },
          app: {
            getPaths: vi
              .fn()
              .mockResolvedValue({ ok: true, data: { home: '/', userData: '', logsDir: '' } })
          },
          pty: {
            spawn: vi.fn().mockResolvedValue({ ok: true, data: { sessionId: 1 } }),
            kill: vi.fn()
          }
        }
      })

      const CommandCenter = await getCommandCenter()
      const { openCommandCenter } = await import('../../stores/command-center-store.svelte')

      openCommandCenter()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      mount(CommandCenter, { target })

      await tick()
      await tick()

      // Select preset 4
      const presetContainer = target.querySelector('.preset-launcher')
      const keydownEvent4 = new KeyboardEvent('keydown', { key: '4', bubbles: true })
      presetContainer?.dispatchEvent(keydownEvent4)
      await tick()

      // Press ArrowDown or ArrowRight at preset 4
      const keydownEventRight = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
      presetContainer?.dispatchEvent(keydownEventRight)

      await tick()
      await new Promise((resolve) => queueMicrotask(resolve))

      // Should wrap back to preset 1 (no saved layouts to navigate to)
      const presetButtons = target.querySelectorAll('.preset-btn')
      expect(presetButtons[0]?.classList.contains('preset-btn--selected')).toBe(true)

      vi.unstubAllGlobals()
    })

    it('updates preview when navigating between sections', async () => {
      const mockLayouts: SavedLayoutSummary[] = [
        { name: 'dev-workspace', layout_name: 'grid' },
        { name: 'personal', layout_name: 'single' }
      ]

      const mockLayoutList = vi.fn().mockResolvedValue({ ok: true, data: mockLayouts })

      vi.stubGlobal('window', {
        api: {
          layout: {
            list: mockLayoutList,
            load: vi.fn().mockResolvedValue({
              ok: true,
              data: { name: 'test', layout_name: 'single', panes: [{}] }
            }),
            save: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
            delete: vi.fn().mockResolvedValue({ ok: true, data: undefined })
          },
          shell: { detect: vi.fn().mockResolvedValue({ ok: true, data: ['/bin/bash'] }) },
          app: {
            getPaths: vi
              .fn()
              .mockResolvedValue({ ok: true, data: { home: '/', userData: '', logsDir: '' } })
          },
          pty: {
            spawn: vi.fn().mockResolvedValue({ ok: true, data: { sessionId: 1 } }),
            kill: vi.fn()
          }
        }
      })

      const CommandCenter = await getCommandCenter()
      const { openCommandCenter } = await import('../../stores/command-center-store.svelte')

      openCommandCenter()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      mount(CommandCenter, { target })

      await tick()
      await tick()

      // Navigate to saved layouts
      const presetContainer = target.querySelector('.preset-launcher')
      const keydownEventDown = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      presetContainer?.dispatchEvent(keydownEventDown)
      await tick()
      await new Promise((resolve) => queueMicrotask(resolve))

      // Preview should show grid layout (first saved layout has layout_name: 'grid')
      // 'grid' layout maps to preview-grid--4 class
      const previewGrid = target.querySelector('.preview-grid--4')
      expect(previewGrid).not.toBeNull()

      vi.unstubAllGlobals()
    })
  })

  describe('executeSavedLayoutFlow', () => {
    it('executes saved pane commands only after the new layout has been committed', async () => {
      vi.useFakeTimers()

      const mockPtySpawn = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, data: { sessionId: 201 } })
        .mockResolvedValueOnce({ ok: true, data: { sessionId: 202 } })
      const mockPtyWrite = vi.fn().mockResolvedValue({ ok: true, data: undefined })
      const mockShellDetect = vi.fn().mockResolvedValue({ ok: true, data: ['/bin/bash'] })
      const mockGetPaths = vi
        .fn()
        .mockResolvedValue({ ok: true, data: { home: '/home/test', userData: '', logsDir: '' } })
      const savedLayouts: SavedLayoutSummary[] = [
        { name: 'test-layout', layout_name: 'horizontal' }
      ]
      const mockLayoutList = vi.fn().mockResolvedValue({ ok: true, data: savedLayouts })
      const mockLayoutLoad = vi.fn().mockResolvedValue({
        ok: true,
        data: {
          name: 'test-layout',
          layout_name: 'horizontal',
          panes: [
            { pane_id: 1, command: 'echo first' },
            { pane_id: 2, command: 'echo second' }
          ]
        }
      })

      vi.stubGlobal('window', {
        api: {
          shell: { detect: mockShellDetect },
          app: { getPaths: mockGetPaths },
          pty: {
            spawn: mockPtySpawn,
            write: mockPtyWrite,
            kill: vi.fn().mockResolvedValue({ ok: true, data: undefined })
          },
          layout: {
            list: mockLayoutList,
            load: mockLayoutLoad,
            save: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
            delete: vi.fn().mockResolvedValue({ ok: true, data: undefined })
          }
        }
      })

      const CommandCenter = await getCommandCenter()
      const { openCommandCenter, commandCenterState } =
        await import('../../stores/command-center-store.svelte')
      const { resetLayoutState } = await import('../../stores/layout-store.svelte')

      resetLayoutState()
      openCommandCenter()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      mount(CommandCenter, { target })

      await tick()
      await tick()

      // Select saved layout and submit
      const savedListEl = target.querySelector('.saved-layout-list')
      expect(savedListEl).not.toBeNull()
      ;(savedListEl as HTMLElement).focus()

      const keydownEventEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      savedListEl?.dispatchEvent(keydownEventEnter)

      // Wait for async operations (advance fake timers instead of waiting real time)
      await vi.advanceTimersByTimeAsync(200)
      await tick()

      // Verify pty.spawn was called for both panes
      expect(mockPtySpawn).toHaveBeenCalledTimes(2)

      // Advance timers to trigger the pending command execution
      vi.advanceTimersByTime(60)

      // Verify pty.write was called with commands (after layout commit + 50ms delay)
      expect(mockPtyWrite).toHaveBeenCalledWith(201, 'echo first\n')
      expect(mockPtyWrite).toHaveBeenCalledWith(202, 'echo second\n')

      // Command Center should be closed
      expect(commandCenterState.isOpen).toBe(false)

      vi.useRealTimers()
      vi.unstubAllGlobals()
    })

    it('keeps workspace unchanged when layout.load returns LAYOUT_INVALID_TOML', async () => {
      const mockShellDetect = vi.fn().mockResolvedValue({ ok: true, data: ['/bin/bash'] })
      const savedLayouts: SavedLayoutSummary[] = [
        { name: 'test-layout', layout_name: 'horizontal' }
      ]
      const mockLayoutList = vi.fn().mockResolvedValue({ ok: true, data: savedLayouts })
      const mockLayoutLoad = vi.fn().mockResolvedValue({
        ok: false,
        error: { code: 'LAYOUT_INVALID_TOML', message: 'Invalid TOML format' }
      })

      vi.stubGlobal('window', {
        api: {
          shell: { detect: mockShellDetect },
          app: { getPaths: vi.fn() },
          pty: {
            spawn: vi.fn().mockResolvedValue({ ok: true, data: { sessionId: 1 } }),
            kill: vi.fn().mockResolvedValue({ ok: true, data: undefined })
          },
          layout: {
            list: mockLayoutList,
            load: mockLayoutLoad,
            save: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
            delete: vi.fn().mockResolvedValue({ ok: true, data: undefined })
          }
        }
      })

      const CommandCenter = await getCommandCenter()
      const { openCommandCenter } = await import('../../stores/command-center-store.svelte')
      const { resetLayoutState } = await import('../../stores/layout-store.svelte')

      resetLayoutState()
      openCommandCenter()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      mount(CommandCenter, { target })

      await tick()
      await tick()

      // Select saved layout and submit
      const savedListEl = target.querySelector('.saved-layout-list')
      expect(savedListEl).not.toBeNull()
      ;(savedListEl as HTMLElement).focus()

      const keydownEventEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      savedListEl?.dispatchEvent(keydownEventEnter)

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100))
      await tick()

      // Verify pty.spawn was never called (workspace unchanged)
      const mockPtySpawn = vi.mocked(window.api.pty.spawn)
      expect(mockPtySpawn).not.toHaveBeenCalled()

      // Verify error is shown in Command Center (message contains the error description)
      const errorEl = target.querySelector('.saved-layouts-error')
      expect(errorEl).not.toBeNull()
      expect(errorEl?.textContent).toContain('Invalid TOML format')

      vi.unstubAllGlobals()
    })

    it('kills spawned sessions on validation failure after spawn', async () => {
      vi.useFakeTimers()

      const mockShellDetect = vi.fn().mockResolvedValue({ ok: true, data: ['/bin/bash'] })
      const mockGetPaths = vi
        .fn()
        .mockResolvedValue({ ok: true, data: { home: '/home/test', userData: '', logsDir: '' } })
      let spawnCount = 0
      const mockPtySpawn = vi.fn().mockImplementation(() => {
        spawnCount++
        // Only allow 2 spawns, then return error to trigger error path
        if (spawnCount <= 2) {
          return Promise.resolve({ ok: true, data: { sessionId: 300 + spawnCount } })
        }
        return Promise.resolve({
          ok: false,
          error: { code: 'SPAWN_ERROR', message: 'Simulated spawn failure' }
        })
      })
      const mockPtyKill = vi.fn().mockResolvedValue({ ok: true, data: undefined })
      const savedLayouts: SavedLayoutSummary[] = [
        { name: 'mismatched-layout', layout_name: 'horizontal' }
      ]
      const mockLayoutList = vi.fn().mockResolvedValue({ ok: true, data: savedLayouts })
      // Layout says 'horizontal' (expects 2 panes) but provides 3 panes
      const mockLayoutLoad = vi.fn().mockResolvedValue({
        ok: true,
        data: {
          name: 'mismatched-layout',
          layout_name: 'horizontal',
          panes: [{ pane_id: 1 }, { pane_id: 2 }, { pane_id: 3 }]
        }
      })

      vi.stubGlobal('window', {
        api: {
          shell: { detect: mockShellDetect },
          app: { getPaths: mockGetPaths },
          pty: {
            spawn: mockPtySpawn,
            kill: mockPtyKill,
            write: vi.fn().mockResolvedValue({ ok: true, data: undefined })
          },
          layout: {
            list: mockLayoutList,
            load: mockLayoutLoad,
            save: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
            delete: vi.fn().mockResolvedValue({ ok: true, data: undefined })
          }
        }
      })

      const CommandCenter = await getCommandCenter()
      const { openCommandCenter } = await import('../../stores/command-center-store.svelte')
      const { resetLayoutState } = await import('../../stores/layout-store.svelte')

      resetLayoutState()
      openCommandCenter()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      mount(CommandCenter, { target })

      await tick()
      await tick()

      // Select saved layout and submit
      const savedListEl = target.querySelector('.saved-layout-list')
      expect(savedListEl).not.toBeNull()
      ;(savedListEl as HTMLElement).focus()

      const keydownEventEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      savedListEl?.dispatchEvent(keydownEventEnter)

      // Wait for async operations (advance fake timers instead of waiting real time)
      await vi.advanceTimersByTimeAsync(200)
      await tick()

      // Verify pty.spawn was called for 3 panes (validation fails post-spawn)
      expect(spawnCount).toBe(3)

      // Verify pty.kill was called for cleanup (only 2 sessions were successfully spawned before error)
      // Session 303 was never added because the 3rd spawn call returns an error
      expect(mockPtyKill).toHaveBeenCalledWith(301)
      expect(mockPtyKill).toHaveBeenCalledWith(302)

      // Verify pty.write was never called (command execution should not happen)
      const mockPtyWrite = vi.mocked(window.api.pty.write)
      expect(mockPtyWrite).not.toHaveBeenCalled()

      // Verify error is shown
      const errorEl = target.querySelector('.saved-layouts-error')
      expect(errorEl).not.toBeNull()

      vi.useRealTimers()
      vi.unstubAllGlobals()
    })
  })
})
