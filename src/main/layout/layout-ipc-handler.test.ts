import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { registerLayoutIpcHandlers } from './layout-ipc-handler'
import * as layoutManager from './layout-manager'
import type { Result, SavedLayoutData, SavedLayoutSummary } from '../../shared/ipc-contract'

// Mock layout-manager
vi.mock('./layout-manager', () => ({
  listLayouts: vi.fn(),
  loadLayout: vi.fn(),
  saveLayout: vi.fn()
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

    it('layout:list handler calls listLayouts() and returns SavedLayoutSummary[]', async () => {
      const mockResult: Result<SavedLayoutSummary[]> = {
        ok: true,
        data: [
          { name: 'dev', layout_name: 'horizontal' },
          { name: 'work', layout_name: 'grid' }
        ]
      }
      vi.mocked(layoutManager.listLayouts).mockReturnValue(mockResult)

      registerLayoutIpcHandlers()

      // Get the registered handler
      type ListHandler = () => Result<SavedLayoutSummary[]>
      const listHandler = vi
        .mocked(ipcMain.handle)
        .mock.calls.find((call) => call[0] === 'layout:list')?.[1] as ListHandler

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
      type LoadHandler = (event: IpcMainInvokeEvent, name: string) => Result<SavedLayoutData>
      const loadHandler = vi
        .mocked(ipcMain.handle)
        .mock.calls.find((call) => call[0] === 'layout:load')?.[1] as LoadHandler

      expect(loadHandler).toBeDefined()

      const mockEvent = {} as IpcMainInvokeEvent
      const result = await loadHandler(mockEvent, 'dev-workspace')

      expect(layoutManager.loadLayout).toHaveBeenCalledWith('dev-workspace')
      expect(result).toEqual(mockResult)
    })

    it('layout:load handler passes name as positional argument', async () => {
      registerLayoutIpcHandlers()

      type LoadHandler = (event: IpcMainInvokeEvent, name: string) => Result<SavedLayoutData>
      const loadHandler = vi
        .mocked(ipcMain.handle)
        .mock.calls.find((call) => call[0] === 'layout:load')?.[1] as LoadHandler

      const mockEvent = {} as IpcMainInvokeEvent
      await loadHandler(mockEvent, 'test-layout')

      // Verify loadLayout was called with just the name (not an object)
      expect(layoutManager.loadLayout).toHaveBeenCalledWith('test-layout')
    })

    it('registers layout:save handler', () => {
      registerLayoutIpcHandlers()

      expect(ipcMain.handle).toHaveBeenCalledWith('layout:save', expect.any(Function))
    })

    it('layout:save handler calls saveLayout with name and data arguments', async () => {
      const mockResult: Result<void> = { ok: true, data: undefined }
      vi.mocked(layoutManager.saveLayout).mockResolvedValue(mockResult)

      registerLayoutIpcHandlers()

      // Get the registered handler
      type SaveHandler = (
        event: IpcMainInvokeEvent,
        name: string,
        data: SavedLayoutData
      ) => Promise<Result<void>>
      const saveHandler = vi
        .mocked(ipcMain.handle)
        .mock.calls.find((call) => call[0] === 'layout:save')?.[1] as SaveHandler

      expect(saveHandler).toBeDefined()

      const mockEvent = {} as IpcMainInvokeEvent
      const mockData: SavedLayoutData = {
        name: 'dev-workspace',
        layout_name: 'grid',
        panes: [
          { pane_id: 1, name: 'Server', color: 'blue' },
          { pane_id: 2, name: 'Tests', color: 'green' }
        ]
      }
      const result = await saveHandler(mockEvent, 'dev-workspace', mockData)

      expect(layoutManager.saveLayout).toHaveBeenCalledWith('dev-workspace', mockData)
      expect(result).toEqual(mockResult)
    })
  })
})
