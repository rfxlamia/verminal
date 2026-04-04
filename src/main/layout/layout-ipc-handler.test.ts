import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ipcMain } from 'electron'
import { registerLayoutIpcHandlers } from './layout-ipc-handler'
import * as layoutManager from './layout-manager'
import type { Result, SavedLayoutData } from '../../shared/ipc-contract'

// Mock layout-manager
vi.mock('./layout-manager', () => ({
  listLayouts: vi.fn(),
  loadLayout: vi.fn()
}))

// Mock electron's ipcMain
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn()
  }
}))

describe('layout-ipc-handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('registerLayoutIpcHandlers', () => {
    it('registers layout:list handler', () => {
      registerLayoutIpcHandlers()

      expect(ipcMain.handle).toHaveBeenCalledWith('layout:list', expect.any(Function))
    })

    it('registers layout:load handler', () => {
      registerLayoutIpcHandlers()

      expect(ipcMain.handle).toHaveBeenCalledWith('layout:load', expect.any(Function))
    })

    it('layout:list handler calls listLayouts()', async () => {
      const mockResult: Result<string[]> = { ok: true, data: ['dev', 'work'] }
      vi.mocked(layoutManager.listLayouts).mockReturnValue(mockResult)

      registerLayoutIpcHandlers()

      // Get the registered handler
      const listHandler = vi.mocked(ipcMain.handle).mock.calls.find(
        call => call[0] === 'layout:list'
      )?.[1] as Function

      expect(listHandler).toBeDefined()

      const result = await listHandler()

      expect(layoutManager.listLayouts).toHaveBeenCalled()
      expect(result).toEqual(mockResult)
    })

    it('layout:load handler calls loadLayout with name argument', async () => {
      const mockLayout: SavedLayoutData = {
        name: 'dev-workspace',
        layout_name: 'horizontal',
        panes: [{ pane_id: 1, name: 'Editor' }]
      }
      const mockResult: Result<SavedLayoutData> = { ok: true, data: mockLayout }
      vi.mocked(layoutManager.loadLayout).mockReturnValue(mockResult)

      registerLayoutIpcHandlers()

      // Get the registered handler
      const loadHandler = vi.mocked(ipcMain.handle).mock.calls.find(
        call => call[0] === 'layout:load'
      )?.[1] as Function

      expect(loadHandler).toBeDefined()

      const mockEvent = {} as any
      const result = await loadHandler(mockEvent, 'dev-workspace')

      expect(layoutManager.loadLayout).toHaveBeenCalledWith('dev-workspace')
      expect(result).toEqual(mockResult)
    })

    it('layout:load handler passes name as positional argument', async () => {
      registerLayoutIpcHandlers()

      const loadHandler = vi.mocked(ipcMain.handle).mock.calls.find(
        call => call[0] === 'layout:load'
      )?.[1] as Function

      await loadHandler({}, 'test-layout')

      // Verify loadLayout was called with just the name (not an object)
      expect(layoutManager.loadLayout).toHaveBeenCalledWith('test-layout')
    })
  })
})
