import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { tick } from 'svelte'

describe('ShortcutCheatsheet', () => {
  beforeEach(() => {
    vi.resetModules()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  // Helper to get fresh component after resetModules
  async function getShortcutCheatsheet(): Promise<
    typeof import('./ShortcutCheatsheet.svelte').default
  > {
    const mod = await import('./ShortcutCheatsheet.svelte')
    return mod.default
  }

  describe('rendering', () => {
    it('renders shortcut reference when component is mounted', async () => {
      const ShortcutCheatsheet = await getShortcutCheatsheet()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onClose = vi.fn()

      mount(ShortcutCheatsheet, {
        target,
        props: {
          onClose
        }
      })

      await tick()

      // Should have role="region" for inline help surface
      const cheatsheet = target.querySelector('.shortcut-cheatsheet')
      expect(cheatsheet).not.toBeNull()
    })

    it('has role="region" and aria-label="Keyboard shortcuts"', async () => {
      const ShortcutCheatsheet = await getShortcutCheatsheet()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onClose = vi.fn()

      mount(ShortcutCheatsheet, {
        target,
        props: {
          onClose
        }
      })

      await tick()

      const cheatsheet = target.querySelector('.shortcut-cheatsheet')
      expect(cheatsheet?.getAttribute('role')).toBe('region')
      expect(cheatsheet?.getAttribute('aria-label')).toBe('Keyboard shortcuts')
    })

    it('displays all required shortcuts: 1-4, ↑/↓, ←/→, Enter, Esc, ?/F1', async () => {
      const ShortcutCheatsheet = await getShortcutCheatsheet()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onClose = vi.fn()

      mount(ShortcutCheatsheet, {
        target,
        props: {
          onClose
        }
      })

      await tick()

      const table = target.querySelector('.cheatsheet-table')
      expect(table).not.toBeNull()

      const content = table?.textContent || ''

      // Check for key shortcuts
      expect(content).toContain('1')
      expect(content).toContain('4')
      expect(content).toContain('↑')
      expect(content).toContain('↓')
      expect(content).toContain('←')
      expect(content).toContain('→')
      expect(content).toContain('Enter')
      expect(content).toContain('Esc')
      expect(content).toContain('?')
      expect(content).toContain('F1')
    })

    it('has a close button with proper aria-label', async () => {
      const ShortcutCheatsheet = await getShortcutCheatsheet()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onClose = vi.fn()

      mount(ShortcutCheatsheet, {
        target,
        props: {
          onClose
        }
      })

      await tick()

      const closeBtn = target.querySelector('.cheatsheet-close-btn')
      expect(closeBtn).not.toBeNull()
      expect(closeBtn?.getAttribute('aria-label')).toBe('Close keyboard shortcuts')
    })
  })

  describe('presentational nature', () => {
    it('is presentational - has no open/closed state internal', async () => {
      const ShortcutCheatsheet = await getShortcutCheatsheet()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onClose = vi.fn()

      mount(ShortcutCheatsheet, {
        target,
        props: {
          onClose
        }
      })

      await tick()

      // Component should be presentational - visibility controlled by parent
      // It should render when mounted without internal state check
      const cheatsheet = target.querySelector('.shortcut-cheatsheet')
      expect(cheatsheet).not.toBeNull()
    })

    it('does not accept isOpen prop', async () => {
      const ShortcutCheatsheet = await getShortcutCheatsheet()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onClose = vi.fn()

      // Mount with only onClose prop - no isOpen
      mount(ShortcutCheatsheet, {
        target,
        props: {
          onClose
        }
      })

      await tick()

      // Component should render without isOpen
      const cheatsheet = target.querySelector('.shortcut-cheatsheet')
      expect(cheatsheet).not.toBeNull()
    })
  })

  describe('interactions', () => {
    it('clicking close button calls onClose', async () => {
      const ShortcutCheatsheet = await getShortcutCheatsheet()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onClose = vi.fn()

      mount(ShortcutCheatsheet, {
        target,
        props: {
          onClose
        }
      })

      await tick()

      const closeBtn = target.querySelector('.cheatsheet-close-btn')
      expect(closeBtn).not.toBeNull()

      // Click the close button
      ;(closeBtn as HTMLElement).click()

      expect(onClose).toHaveBeenCalledOnce()
    })
  })

  describe('accessibility', () => {
    it('has table with aria-label="Available shortcuts"', async () => {
      const ShortcutCheatsheet = await getShortcutCheatsheet()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onClose = vi.fn()

      mount(ShortcutCheatsheet, {
        target,
        props: {
          onClose
        }
      })

      await tick()

      const table = target.querySelector('.cheatsheet-table')
      expect(table?.getAttribute('aria-label')).toBe('Available shortcuts')
    })

    it('uses semantic heading for title', async () => {
      const ShortcutCheatsheet = await getShortcutCheatsheet()

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')
      const onClose = vi.fn()

      mount(ShortcutCheatsheet, {
        target,
        props: {
          onClose
        }
      })

      await tick()

      const title = target.querySelector('.cheatsheet-title')
      expect(title).not.toBeNull()
      expect(title?.textContent).toContain('Keyboard Shortcuts')
    })
  })
})
