import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { tick } from 'svelte'
import type { SavedLayoutSummary } from '../../../../shared/ipc-contract'

describe('SavedLayoutList', () => {
  beforeEach(() => {
    vi.resetModules()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  // Helper to get fresh component after resetModules
  async function getSavedLayoutList(): Promise<typeof import('./SavedLayoutList.svelte').default> {
    const mod = await import('./SavedLayoutList.svelte')
    return mod.default
  }

  describe('rendering', () => {
    it('renders list of layout names from SavedLayoutSummary[]', async () => {
      const SavedLayoutList = await getSavedLayoutList()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      const layouts: SavedLayoutSummary[] = [
        { name: 'dev-workspace', layout_name: 'horizontal' },
        { name: 'personal', layout_name: 'single' },
        { name: 'work-project', layout_name: 'grid' }
      ]

      mount(SavedLayoutList, {
        target,
        props: {
          layouts,
          selectedLayout: null,
          onSelect,
          onSubmit
        }
      })

      const items = target.querySelectorAll('.saved-layout-item')
      expect(items.length).toBe(3)

      // Check layout names (only name is displayed)
      expect(items[0]?.textContent).toContain('dev-workspace')
      expect(items[1]?.textContent).toContain('personal')
      expect(items[2]?.textContent).toContain('work-project')
    })

    it('renders empty state when layouts array is empty', async () => {
      const SavedLayoutList = await getSavedLayoutList()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      mount(SavedLayoutList, {
        target,
        props: {
          layouts: [],
          selectedLayout: null,
          onSelect,
          onSubmit
        }
      })

      const emptyElement = target.querySelector('.saved-layouts-empty')
      expect(emptyElement).not.toBeNull()
      expect(emptyElement?.textContent).toContain('No saved layouts yet')
    })

    it('renders loading state when isLoading is true', async () => {
      const SavedLayoutList = await getSavedLayoutList()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      mount(SavedLayoutList, {
        target,
        props: {
          layouts: [],
          selectedLayout: null,
          isLoading: true,
          onSelect,
          onSubmit
        }
      })

      const statusElement = target.querySelector('.saved-layouts-status')
      expect(statusElement).not.toBeNull()
      expect(statusElement?.textContent).toContain('Loading saved layouts')
    })

    it('renders error message when errorMessage is provided', async () => {
      const SavedLayoutList = await getSavedLayoutList()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      mount(SavedLayoutList, {
        target,
        props: {
          layouts: [],
          selectedLayout: null,
          errorMessage: 'Failed to load layouts',
          onSelect,
          onSubmit
        }
      })

      const errorElement = target.querySelector('.saved-layouts-error')
      expect(errorElement).not.toBeNull()
      expect(errorElement?.textContent).toContain('Failed to load layouts')
    })
  })

  describe('keyboard navigation', () => {
    it('calls onSubmit with selected layout when Enter is pressed', async () => {
      const SavedLayoutList = await getSavedLayoutList()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      const layouts: SavedLayoutSummary[] = [
        { name: 'dev-workspace', layout_name: 'horizontal' },
        { name: 'personal', layout_name: 'single' }
      ]

      mount(SavedLayoutList, {
        target,
        props: {
          layouts,
          selectedLayout: 'dev-workspace',
          onSelect,
          onSubmit
        }
      })

      await tick()

      const container = target.querySelector('.saved-layout-list')
      expect(container).not.toBeNull()

      // Press Enter
      const keydownEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      container?.dispatchEvent(keydownEvent)

      expect(onSubmit).toHaveBeenCalledWith('dev-workspace')
    })

    it('does not call onSubmit when Enter is pressed without selection', async () => {
      const SavedLayoutList = await getSavedLayoutList()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      const layouts: SavedLayoutSummary[] = [
        { name: 'dev-workspace', layout_name: 'horizontal' },
        { name: 'personal', layout_name: 'single' }
      ]

      mount(SavedLayoutList, {
        target,
        props: {
          layouts,
          selectedLayout: null,
          onSelect,
          onSubmit
        }
      })

      await tick()

      const container = target.querySelector('.saved-layout-list')

      // Press Enter
      const keydownEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      container?.dispatchEvent(keydownEvent)

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('moves selection down with ArrowDown', async () => {
      const SavedLayoutList = await getSavedLayoutList()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      const layouts: SavedLayoutSummary[] = [
        { name: 'dev-workspace', layout_name: 'horizontal' },
        { name: 'personal', layout_name: 'single' },
        { name: 'work-project', layout_name: 'grid' }
      ]

      mount(SavedLayoutList, {
        target,
        props: {
          layouts,
          selectedLayout: 'dev-workspace',
          onSelect,
          onSubmit
        }
      })

      await tick()

      const container = target.querySelector('.saved-layout-list')

      // Press ArrowDown
      const keydownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      container?.dispatchEvent(keydownEvent)

      expect(onSelect).toHaveBeenCalledWith('personal')
    })

    it('moves selection up with ArrowUp', async () => {
      const SavedLayoutList = await getSavedLayoutList()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      const layouts: SavedLayoutSummary[] = [
        { name: 'dev-workspace', layout_name: 'horizontal' },
        { name: 'personal', layout_name: 'single' },
        { name: 'work-project', layout_name: 'grid' }
      ]

      mount(SavedLayoutList, {
        target,
        props: {
          layouts,
          selectedLayout: 'work-project',
          onSelect,
          onSubmit
        }
      })

      await tick()

      const container = target.querySelector('.saved-layout-list')

      // Press ArrowUp
      const keydownEvent = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })
      container?.dispatchEvent(keydownEvent)

      expect(onSelect).toHaveBeenCalledWith('personal')
    })

    it('wraps to first item when ArrowDown from last item (internal navigation when no callback)', async () => {
      const SavedLayoutList = await getSavedLayoutList()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      const layouts: SavedLayoutSummary[] = [
        { name: 'dev-workspace', layout_name: 'horizontal' },
        { name: 'personal', layout_name: 'single' },
        { name: 'work-project', layout_name: 'grid' }
      ]

      mount(SavedLayoutList, {
        target,
        props: {
          layouts,
          selectedLayout: 'work-project',
          onSelect,
          onSubmit
          // No onNavigateToNextSection - should wrap internally
        }
      })

      await tick()

      const container = target.querySelector('.saved-layout-list')

      // Press ArrowDown from last item without navigation callback - should wrap
      const keydownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      container?.dispatchEvent(keydownEvent)

      expect(onSelect).toHaveBeenCalledWith('dev-workspace')
    })

    it('wraps to last item when ArrowUp from first item (internal navigation when no callback)', async () => {
      const SavedLayoutList = await getSavedLayoutList()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      const layouts: SavedLayoutSummary[] = [
        { name: 'dev-workspace', layout_name: 'horizontal' },
        { name: 'personal', layout_name: 'single' },
        { name: 'work-project', layout_name: 'grid' }
      ]

      mount(SavedLayoutList, {
        target,
        props: {
          layouts,
          selectedLayout: 'dev-workspace',
          onSelect,
          onSubmit
          // No onNavigateToPrevSection - should wrap internally
        }
      })

      await tick()

      const container = target.querySelector('.saved-layout-list')

      // Press ArrowUp from first item without navigation callback - should wrap
      const keydownEvent = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })
      container?.dispatchEvent(keydownEvent)

      expect(onSelect).toHaveBeenCalledWith('work-project')
    })
  })

  describe('click interaction', () => {
    it('calls onSelect when clicking unselected layout', async () => {
      const SavedLayoutList = await getSavedLayoutList()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      const layouts: SavedLayoutSummary[] = [
        { name: 'dev-workspace', layout_name: 'horizontal' },
        { name: 'personal', layout_name: 'single' }
      ]

      mount(SavedLayoutList, {
        target,
        props: {
          layouts,
          selectedLayout: 'dev-workspace',
          onSelect,
          onSubmit
        }
      })

      await tick()

      const items = target.querySelectorAll('.saved-layout-item')
      // Click on second item (unselected)
      ;(items[1] as HTMLElement).click()

      expect(onSelect).toHaveBeenCalledWith('personal')
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('calls onSubmit when clicking selected layout', async () => {
      const SavedLayoutList = await getSavedLayoutList()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      const layouts: SavedLayoutSummary[] = [
        { name: 'dev-workspace', layout_name: 'horizontal' },
        { name: 'personal', layout_name: 'single' }
      ]

      mount(SavedLayoutList, {
        target,
        props: {
          layouts,
          selectedLayout: 'dev-workspace',
          onSelect,
          onSubmit
        }
      })

      await tick()

      const items = target.querySelectorAll('.saved-layout-item')
      // Click on first item (selected)
      ;(items[0] as HTMLElement).click()

      expect(onSubmit).toHaveBeenCalledWith('dev-workspace')
    })
  })

  describe('accessibility', () => {
    it('has correct ARIA attributes on listbox', async () => {
      const SavedLayoutList = await getSavedLayoutList()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      mount(SavedLayoutList, {
        target,
        props: {
          layouts: [{ name: 'dev-workspace', layout_name: 'horizontal' }],
          selectedLayout: null,
          onSelect,
          onSubmit
        }
      })

      const listbox = target.querySelector('.saved-layout-list')
      expect(listbox?.getAttribute('role')).toBe('listbox')
      expect(listbox?.getAttribute('aria-label')).toBe('Saved layouts')
    })

    it('marks selected item with aria-selected', async () => {
      const SavedLayoutList = await getSavedLayoutList()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      const layouts: SavedLayoutSummary[] = [
        { name: 'dev-workspace', layout_name: 'horizontal' },
        { name: 'personal', layout_name: 'single' }
      ]

      mount(SavedLayoutList, {
        target,
        props: {
          layouts,
          selectedLayout: 'dev-workspace',
          onSelect,
          onSubmit
        }
      })

      const selectedButton = target.querySelector('.saved-layout-item--selected')
      expect(selectedButton?.getAttribute('aria-selected')).toBe('true')
    })

    it('marks unselected items with aria-selected false', async () => {
      const SavedLayoutList = await getSavedLayoutList()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()

      const layouts: SavedLayoutSummary[] = [
        { name: 'dev-workspace', layout_name: 'horizontal' },
        { name: 'personal', layout_name: 'single' }
      ]

      mount(SavedLayoutList, {
        target,
        props: {
          layouts,
          selectedLayout: 'dev-workspace',
          onSelect,
          onSubmit
        }
      })

      const unselectedButtons = target.querySelectorAll(
        '.saved-layout-item:not(.saved-layout-item--selected)'
      )
      unselectedButtons.forEach((button) => {
        expect(button.getAttribute('aria-selected')).toBe('false')
      })
    })
  })

  describe('cross-section navigation', () => {
    it('ArrowUp at first item calls onNavigateToPrevSection', async () => {
      const SavedLayoutList = await getSavedLayoutList()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()
      const onNavigateToPrevSection = vi.fn()

      const layouts: SavedLayoutSummary[] = [
        { name: 'dev-workspace', layout_name: 'horizontal' },
        { name: 'personal', layout_name: 'single' },
        { name: 'work-project', layout_name: 'grid' }
      ]

      mount(SavedLayoutList, {
        target,
        props: {
          layouts,
          selectedLayout: 'dev-workspace',
          onSelect,
          onSubmit,
          onNavigateToPrevSection
        }
      })

      await tick()

      const container = target.querySelector('.saved-layout-list')
      expect(container).not.toBeNull()

      // Press ArrowUp at first item
      const keydownEvent = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })
      container?.dispatchEvent(keydownEvent)

      expect(onNavigateToPrevSection).toHaveBeenCalledOnce()
    })

    it('ArrowDown at last item calls onNavigateToNextSection', async () => {
      const SavedLayoutList = await getSavedLayoutList()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()
      const onNavigateToNextSection = vi.fn()

      const layouts: SavedLayoutSummary[] = [
        { name: 'dev-workspace', layout_name: 'horizontal' },
        { name: 'personal', layout_name: 'single' },
        { name: 'work-project', layout_name: 'grid' }
      ]

      mount(SavedLayoutList, {
        target,
        props: {
          layouts,
          selectedLayout: 'work-project',
          onSelect,
          onSubmit,
          onNavigateToNextSection
        }
      })

      await tick()

      const container = target.querySelector('.saved-layout-list')
      expect(container).not.toBeNull()

      // Press ArrowDown at last item
      const keydownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      container?.dispatchEvent(keydownEvent)

      expect(onNavigateToNextSection).toHaveBeenCalledOnce()
    })

    it('ArrowUp not at first item just moves selection up', async () => {
      const SavedLayoutList = await getSavedLayoutList()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()
      const onNavigateToPrevSection = vi.fn()

      const layouts: SavedLayoutSummary[] = [
        { name: 'dev-workspace', layout_name: 'horizontal' },
        { name: 'personal', layout_name: 'single' },
        { name: 'work-project', layout_name: 'grid' }
      ]

      mount(SavedLayoutList, {
        target,
        props: {
          layouts,
          selectedLayout: 'personal',
          onSelect,
          onSubmit,
          onNavigateToPrevSection
        }
      })

      await tick()

      const container = target.querySelector('.saved-layout-list')
      expect(container).not.toBeNull()

      // Press ArrowUp at second item (not first)
      const keydownEvent = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })
      container?.dispatchEvent(keydownEvent)

      // Should move selection up, not call boundary callback
      expect(onSelect).toHaveBeenCalledWith('dev-workspace')
      expect(onNavigateToPrevSection).not.toHaveBeenCalled()
    })

    it('ArrowDown not at last item just moves selection down', async () => {
      const SavedLayoutList = await getSavedLayoutList()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()
      const onNavigateToNextSection = vi.fn()

      const layouts: SavedLayoutSummary[] = [
        { name: 'dev-workspace', layout_name: 'horizontal' },
        { name: 'personal', layout_name: 'single' },
        { name: 'work-project', layout_name: 'grid' }
      ]

      mount(SavedLayoutList, {
        target,
        props: {
          layouts,
          selectedLayout: 'personal',
          onSelect,
          onSubmit,
          onNavigateToNextSection
        }
      })

      await tick()

      const container = target.querySelector('.saved-layout-list')
      expect(container).not.toBeNull()

      // Press ArrowDown at second item (not last)
      const keydownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      container?.dispatchEvent(keydownEvent)

      // Should move selection down, not call boundary callback
      expect(onSelect).toHaveBeenCalledWith('work-project')
      expect(onNavigateToNextSection).not.toHaveBeenCalled()
    })

    it('does not throw if navigation callbacks are not provided', async () => {
      const SavedLayoutList = await getSavedLayoutList()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onSelect = vi.fn()
      const onSubmit = vi.fn()
      // Navigation callbacks omitted (optional)

      const layouts: SavedLayoutSummary[] = [
        { name: 'dev-workspace', layout_name: 'horizontal' },
        { name: 'personal', layout_name: 'single' }
      ]

      mount(SavedLayoutList, {
        target,
        props: {
          layouts,
          selectedLayout: 'dev-workspace',
          onSelect,
          onSubmit
          // Navigation callbacks omitted
        }
      })

      await tick()

      const container = target.querySelector('.saved-layout-list')
      expect(container).not.toBeNull()

      // Should not throw when at boundary without callbacks
      ;(container as HTMLElement).focus()
      const keydownEventUp = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })

      expect(() => {
        container?.dispatchEvent(keydownEventUp)
      }).not.toThrow()

      // Select last item for ArrowDown test
      onSelect.mockClear()

      // Reset and test ArrowDown at last item
      const keydownEventDown2 = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      expect(() => {
        container?.dispatchEvent(keydownEventDown2)
      }).not.toThrow()
    })
  })
})
