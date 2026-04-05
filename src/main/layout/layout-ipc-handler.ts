import { ipcMain } from 'electron'
import { listLayouts, loadLayout, saveLayout } from './layout-manager'
import type { SavedLayoutData } from '../../shared/ipc-contract'

export function registerLayoutIpcHandlers(): void {
  ipcMain.handle('layout:list', () => listLayouts())
  ipcMain.handle('layout:load', (_event, name: string) => loadLayout(name))
  ipcMain.handle('layout:save', (_event, name: string, data: SavedLayoutData) => saveLayout(name, data))
}
