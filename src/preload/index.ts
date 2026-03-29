import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer matching IpcContract
const api = {
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPaths: () => ipcRenderer.invoke('app:getPaths'),
  },
  pty: {
    spawn: (shell: string, args: string[], cwd: string) =>
      ipcRenderer.invoke('pty:spawn', { shell, args, cwd }),
    kill: (sessionId: number) => ipcRenderer.invoke('pty:kill', sessionId),
    write: (sessionId: number, data: string) => ipcRenderer.send('pty:write', sessionId, data),
    resize: (sessionId: number, cols: number, rows: number) =>
      ipcRenderer.send('pty:resize', sessionId, cols, rows),
    onData: (sessionId: number, cb: (data: string) => void): (() => void) => {
      const channel = `pty:data:${sessionId}`
      const listener = (_event: Electron.IpcRendererEvent, data: string): void => cb(data)
      ipcRenderer.on(channel, listener)
      return (): void => ipcRenderer.removeListener(channel, listener)
    },
    onExit: (sessionId: number, cb: (code: number) => void): (() => void) => {
      const channel = `pty:exit:${sessionId}`
      const listener = (_event: Electron.IpcRendererEvent, code: number): void => cb(code)
      ipcRenderer.on(channel, listener)
      return (): void => ipcRenderer.removeListener(channel, listener)
    },
  },
  layout: {
    save: (name: string, data: unknown) => ipcRenderer.invoke('layout:save', name, data),
    load: (name: string) => ipcRenderer.invoke('layout:load', name),
    list: () => ipcRenderer.invoke('layout:list'),
    delete: (name: string) => ipcRenderer.invoke('layout:delete', name),
  },
  config: {
    read: () => ipcRenderer.invoke('config:read'),
    write: (data: unknown) => ipcRenderer.invoke('config:write', data),
    getPath: () => ipcRenderer.invoke('config:getPath'),  // NEW
  },
  fs: {
    listDir: (path: string) => ipcRenderer.invoke('fs:listDir', path),
    getCwd: (sessionId: number) => ipcRenderer.invoke('fs:getCwd', sessionId),
  },
  shell: {
    detect: () => ipcRenderer.invoke('shell:detect'),
  },
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
    throw error
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
