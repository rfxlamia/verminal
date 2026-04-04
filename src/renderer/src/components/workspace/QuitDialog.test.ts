import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { tick } from 'svelte'
import type { IPCAPI } from '../../shared/ipc-contract'

describe('QuitDialog', () => {
  beforeEach(() => {
    vi.resetModules()
    document.body.innerHTML = ''
    // Stub window.api to prevent teardown errors
    vi.stubGlobal('window', {
      api: {
        quit: {
          onShowDialog: vi.fn(() => () => {}),
          cancel: vi.fn(),
          confirm: vi.fn()
        }
      } as Pick<IPCAPI, 'quit'>
    })
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  // Helper to get fresh component after resetModules
  async function getQuitDialog(): Promise<typeof import('./QuitDialog.svelte').default> {
    const mod = await import('./QuitDialog.svelte')
    return mod.default
  }

  describe('workspace replace mode', () => {
    it('shows dialog with replace-specific copy when workspace replace is requested', async () => {
      const QuitDialog = await getQuitDialog()
      const { workspaceReplaceState: _, requestWorkspaceReplace } =
        await import('../../stores/workspace-replace-confirmation-store.svelte')

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')

      mount(QuitDialog, { target })

      await tick()

      // Initially not visible
      let dialog = target.querySelector('.quit-dialog')
      expect(dialog).toBeNull()

      // Request workspace replace with 2 active sessions
      requestWorkspaceReplace(2)
      await tick()

      dialog = target.querySelector('.quit-dialog')
      expect(dialog).not.toBeNull()

      // Check replace-specific title
      const title = target.querySelector('.quit-dialog-title')
      expect(title?.textContent).toContain('Replace current workspace?')

      // Check body text mentions active sessions
      const body = target.querySelector('.quit-dialog-desc')
      expect(body?.textContent).toContain('2 active terminal session')
      expect(body?.textContent).toContain('replaced')
    })

    it('Cancel button cancels replace and does not call confirm callback', async () => {
      const QuitDialog = await getQuitDialog()
      const {
        workspaceReplaceState: _,
        requestWorkspaceReplace,
        onWorkspaceReplaceConfirm
      } = await import('../../stores/workspace-replace-confirmation-store.svelte')

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')

      const confirmCallback = vi.fn()
      onWorkspaceReplaceConfirm(confirmCallback)

      mount(QuitDialog, { target })

      await tick()

      // Request replace
      requestWorkspaceReplace(1)
      await tick()

      // Click Cancel
      const cancelBtn = target.querySelector('.quit-dialog-btn--cancel')
      expect(cancelBtn).not.toBeNull()
      ;(cancelBtn as HTMLElement).click()

      await tick()

      // Callback should not be called
      expect(confirmCallback).not.toHaveBeenCalled()

      // Dialog should be closed
      const dialog = target.querySelector('.quit-dialog')
      expect(dialog).toBeNull()
    })

    it('Replace button calls confirm callback once and closes dialog', async () => {
      const QuitDialog = await getQuitDialog()
      const {
        workspaceReplaceState: _,
        requestWorkspaceReplace,
        onWorkspaceReplaceConfirm
      } = await import('../../stores/workspace-replace-confirmation-store.svelte')

      const target = document.createElement('div')
      document.body.appendChild(target)

      const { mount } = await import('svelte')

      const confirmCallback = vi.fn()
      onWorkspaceReplaceConfirm(confirmCallback)

      mount(QuitDialog, { target })

      await tick()

      // Request replace
      requestWorkspaceReplace(3)
      await tick()

      // Click Replace
      const replaceBtn = target.querySelector('.quit-dialog-btn--quit')
      expect(replaceBtn).not.toBeNull()
      expect(replaceBtn?.textContent).toContain('Replace')
      ;(replaceBtn as HTMLElement).click()

      await tick()

      // Callback should be called once
      expect(confirmCallback).toHaveBeenCalledTimes(1)

      // Dialog should be closed
      const dialog = target.querySelector('.quit-dialog')
      expect(dialog).toBeNull()
    })
  })
})
