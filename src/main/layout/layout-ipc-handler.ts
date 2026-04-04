import { ipcMain } from 'electron'
import { listLayouts, loadLayout } from './layout-manager'

export function registerLayoutIpcHandlers(): void {
  ipcMain.handle('layout:list', () => listLayouts())
  ipcMain.handle('layout:load', (_event, name: string) => loadLayout(name))
}
