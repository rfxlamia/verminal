import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSave = vi.fn()
vi.stubGlobal('window', {
  api: {
    layout: { save: mockSave }
  }
})

// Mock the layout-serializer module
vi.mock('../lib/layout-serializer', () => ({
  serializeLayoutForSave: vi.fn(() => ({
    name: 'test-layout',
    layout_name: 'horizontal',
    panes: []
  }))
}))

// Import after mock setup
const { openSaveLayout, closeSaveLayout, saveCurrent, saveLayoutState, validateName } =
  await import('./save-layout-store.svelte')
const { layoutState } = await import('./layout-store.svelte')

describe('save-layout-store', () => {
  beforeEach(() => {
    mockSave.mockReset()
    closeSaveLayout()
    layoutState.layoutName = 'horizontal'
    layoutState.panes = [{ paneId: 1, sessionId: 11, name: 'Code' }]
  })

  it('starts closed', () => {
    expect(saveLayoutState.isOpen).toBe(false)
  })

  it('openSaveLayout returns false and stays closed when no active workspace exists', () => {
    layoutState.layoutName = ''
    layoutState.panes = []
    expect(openSaveLayout()).toBe(false)
    expect(saveLayoutState.isOpen).toBe(false)
  })

  it('openSaveLayout sets isOpen=true and resets form', () => {
    expect(openSaveLayout()).toBe(true)
    expect(saveLayoutState.isOpen).toBe(true)
    expect(saveLayoutState.nameInput).toBe('')
    expect(saveLayoutState.validationError).toBe('')
    expect(saveLayoutState.isSaving).toBe(false)
  })

  it('closeSaveLayout sets isOpen=false', () => {
    openSaveLayout()
    closeSaveLayout()
    expect(saveLayoutState.isOpen).toBe(false)
  })

  describe('validateName', () => {
    it('returns error for empty name', () => {
      expect(validateName('')).not.toBe('')
      expect(validateName('   ')).not.toBe('')
    })

    it('returns error for name with leading/trailing space', () => {
      // trimmed !== raw → invalid
      expect(validateName(' myLayout')).not.toBe('')
      expect(validateName('myLayout ')).not.toBe('')
    })

    it('returns error for names with path separators', () => {
      expect(validateName('my/layout')).not.toBe('')
      expect(validateName('my\\layout')).not.toBe('')
    })

    it('returns error for dot-prefixed names', () => {
      expect(validateName('.hidden')).not.toBe('')
    })

    it('returns error for names with ".."', () => {
      expect(validateName('my..layout')).not.toBe('')
      expect(validateName('../etc')).not.toBe('')
    })

    it('returns error for names longer than 255 chars', () => {
      expect(validateName('a'.repeat(256))).not.toBe('')
    })

    it('returns empty string for valid names', () => {
      expect(validateName('dev-setup')).toBe('')
      expect(validateName('my workspace')).toBe('')
      expect(validateName('layout 2025')).toBe('')
      expect(validateName('a'.repeat(255))).toBe('')
    })
  })

  describe('saveCurrent', () => {
    it('returns NO_ACTIVE_LAYOUT when workspace is empty', async () => {
      layoutState.layoutName = ''
      layoutState.panes = []
      saveLayoutState.isOpen = true
      saveLayoutState.nameInput = 'my-layout'
      const result = await saveCurrent()
      expect(result.ok).toBe(false)
      expect(result.error.code).toBe('NO_ACTIVE_LAYOUT')
      expect(mockSave).not.toHaveBeenCalled()
    })

    it('sets validationError and aborts if name invalid', async () => {
      openSaveLayout()
      saveLayoutState.nameInput = ''
      const result = await saveCurrent()
      expect(result.ok).toBe(false)
      expect(saveLayoutState.validationError).not.toBe('')
      expect(mockSave).not.toHaveBeenCalled()
      expect(saveLayoutState.isOpen).toBe(true) // surface stays open
    })

    it('calls window.api.layout.save with correct args on valid input', async () => {
      mockSave.mockResolvedValue({ ok: true, data: undefined })
      openSaveLayout()
      saveLayoutState.nameInput = 'my-layout'
      const result = await saveCurrent()
      expect(mockSave).toHaveBeenCalledOnce()
      expect(mockSave).toHaveBeenCalledWith('my-layout', expect.any(Object))
      expect(result.ok).toBe(true)
      expect(saveLayoutState.isOpen).toBe(false) // surface closes on success
    })

    it('sets validationError and keeps surface open on IPC failure', async () => {
      mockSave.mockResolvedValue({
        ok: false,
        error: { code: 'SAVE_FAILED', message: 'disk full' }
      })
      openSaveLayout()
      saveLayoutState.nameInput = 'my-layout'
      const result = await saveCurrent()
      expect(result.ok).toBe(false)
      expect(saveLayoutState.validationError).toContain('disk full')
      expect(saveLayoutState.isOpen).toBe(true) // stays open for retry
    })

    it('sets isSaving=true during save and false after', async () => {
      let capturedisSaving = false
      mockSave.mockImplementation(async () => {
        capturedisSaving = saveLayoutState.isSaving
        return { ok: true, data: undefined }
      })
      openSaveLayout()
      saveLayoutState.nameInput = 'my-layout'
      await saveCurrent()
      expect(capturedisSaving).toBe(true)
      expect(saveLayoutState.isSaving).toBe(false)
    })
  })
})
