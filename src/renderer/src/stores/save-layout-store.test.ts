import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSave = vi.fn()
vi.stubGlobal('window', {
  api: {
    layout: { save: mockSave }
  }
})

// Import after mock setup - use dynamic import for proper test isolation
// Store references will be re-imported in beforeEach for fresh state
let storeModule: typeof import('./save-layout-store.svelte')
let layoutModule: typeof import('./layout-store.svelte')

describe('save-layout-store', () => {
  beforeEach(async () => {
    // Reset mocks
    mockSave.mockReset()

    // Re-import modules to get fresh state for each test
    // This ensures test isolation by creating new module instances
    storeModule = await import('./save-layout-store.svelte')
    layoutModule = await import('./layout-store.svelte')

    // Close any open surface and reset layout state
    storeModule.closeSaveLayout()
    layoutModule.layoutState.layoutName = 'horizontal'
    layoutModule.layoutState.panes = [{ paneId: 1, sessionId: 11, name: 'Code' }]
  })

  it('starts closed', () => {
    expect(storeModule.saveLayoutState.isOpen).toBe(false)
  })

  it('openSaveLayout returns false and stays closed when no active workspace exists', () => {
    layoutModule.layoutState.layoutName = ''
    layoutModule.layoutState.panes = []
    expect(storeModule.openSaveLayout()).toBe(false)
    expect(storeModule.saveLayoutState.isOpen).toBe(false)
  })

  it('openSaveLayout sets isOpen=true and resets form', () => {
    expect(storeModule.openSaveLayout()).toBe(true)
    expect(storeModule.saveLayoutState.isOpen).toBe(true)
    expect(storeModule.saveLayoutState.nameInput).toBe('')
    expect(storeModule.saveLayoutState.validationError).toBe('')
    expect(storeModule.saveLayoutState.isSaving).toBe(false)
  })

  it('closeSaveLayout sets isOpen=false', () => {
    storeModule.openSaveLayout()
    storeModule.closeSaveLayout()
    expect(storeModule.saveLayoutState.isOpen).toBe(false)
  })

  describe('validateName', () => {
    it('returns error for empty name', () => {
      expect(storeModule.validateName('')).not.toBe('')
      expect(storeModule.validateName('   ')).not.toBe('')
    })

    it('returns error for name with leading/trailing space', () => {
      // trimmed !== raw → invalid
      expect(storeModule.validateName(' myLayout')).not.toBe('')
      expect(storeModule.validateName('myLayout ')).not.toBe('')
    })

    it('returns error for names with path separators', () => {
      expect(storeModule.validateName('my/layout')).not.toBe('')
      expect(storeModule.validateName('my\\layout')).not.toBe('')
    })

    it('returns error for dot-prefixed names', () => {
      expect(storeModule.validateName('.hidden')).not.toBe('')
    })

    it('returns error for names with ".."', () => {
      expect(storeModule.validateName('my..layout')).not.toBe('')
      expect(storeModule.validateName('../etc')).not.toBe('')
    })

    it('returns error for names longer than 255 chars', () => {
      expect(storeModule.validateName('a'.repeat(256))).not.toBe('')
    })

    it('returns empty string for valid names', () => {
      expect(storeModule.validateName('dev-setup')).toBe('')
      expect(storeModule.validateName('my workspace')).toBe('')
      expect(storeModule.validateName('layout 2025')).toBe('')
      expect(storeModule.validateName('a'.repeat(255))).toBe('')
    })
  })

  describe('saveCurrent', () => {
    it('returns NO_ACTIVE_LAYOUT when workspace is empty', async () => {
      layoutModule.layoutState.layoutName = ''
      layoutModule.layoutState.panes = []
      storeModule.saveLayoutState.isOpen = true
      storeModule.saveLayoutState.nameInput = 'my-layout'
      const result = await storeModule.saveCurrent()
      expect(result.ok).toBe(false)
      expect(result.error.code).toBe('NO_ACTIVE_LAYOUT')
      expect(mockSave).not.toHaveBeenCalled()
    })

    it('sets validationError and aborts if name invalid', async () => {
      storeModule.openSaveLayout()
      storeModule.saveLayoutState.nameInput = ''
      const result = await storeModule.saveCurrent()
      expect(result.ok).toBe(false)
      expect(storeModule.saveLayoutState.validationError).not.toBe('')
      expect(mockSave).not.toHaveBeenCalled()
      expect(storeModule.saveLayoutState.isOpen).toBe(true) // surface stays open
    })

    it('calls window.api.layout.save with correct args on valid input', async () => {
      mockSave.mockResolvedValue({ ok: true, data: undefined })
      storeModule.openSaveLayout()
      storeModule.saveLayoutState.nameInput = 'my-layout'
      const result = await storeModule.saveCurrent()
      expect(mockSave).toHaveBeenCalledOnce()
      expect(mockSave).toHaveBeenCalledWith('my-layout', expect.any(Object))
      expect(result.ok).toBe(true)
      expect(storeModule.saveLayoutState.isOpen).toBe(false) // surface closes on success
    })

    it('sets validationError and keeps surface open on IPC failure', async () => {
      mockSave.mockResolvedValue({
        ok: false,
        error: { code: 'SAVE_FAILED', message: 'disk full' }
      })
      storeModule.openSaveLayout()
      storeModule.saveLayoutState.nameInput = 'my-layout'
      const result = await storeModule.saveCurrent()
      expect(result.ok).toBe(false)
      expect(storeModule.saveLayoutState.validationError).toContain('disk full')
      expect(storeModule.saveLayoutState.isOpen).toBe(true) // stays open for retry
    })

    it('sets isSaving=true during save and false after', async () => {
      let capturedisSaving = false
      mockSave.mockImplementation(async () => {
        capturedisSaving = storeModule.saveLayoutState.isSaving
        return { ok: true, data: undefined }
      })
      storeModule.openSaveLayout()
      storeModule.saveLayoutState.nameInput = 'my-layout'
      await storeModule.saveCurrent()
      expect(capturedisSaving).toBe(true)
      expect(storeModule.saveLayoutState.isSaving).toBe(false)
    })

    it('returns ALREADY_SAVING error on concurrent save calls', async () => {
      // Start first save
      mockSave.mockImplementation(async () => {
        // Simulate slow save
        await new Promise((resolve) => setTimeout(resolve, 100))
        return { ok: true, data: undefined }
      })
      storeModule.openSaveLayout()
      storeModule.saveLayoutState.nameInput = 'my-layout'

      // Start first save
      const firstSavePromise = storeModule.saveCurrent()

      // Immediately try second save while first is in progress
      const secondResult = await storeModule.saveCurrent()

      // Second save should fail with ALREADY_SAVING
      expect(secondResult.ok).toBe(false)
      expect(secondResult.error.code).toBe('ALREADY_SAVING')

      // Wait for first save to complete
      await firstSavePromise
    })

    // command-related tests scope Story 7.3
  })
})
