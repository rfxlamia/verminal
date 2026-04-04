export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } }

export type UnsubscribeFn = () => void

export interface SavedPaneData {
  pane_id?: number
  name?: string
  command?: string
  color?: string
}

export interface SavedLayoutData {
  name: string
  layout_name: string
  panes: SavedPaneData[]
}

export interface IpcContract {
  app: {
    getVersion: () => Promise<Result<string>>
    getPaths: () => Promise<Result<{ home: string; userData: string; logsDir: string }>>
  }
  pty: {
    spawn: (shell: string, args: string[], cwd: string) => Promise<Result<{ sessionId: number }>>
    kill: (sessionId: number) => Promise<Result<void>>
    write: (sessionId: number, data: string) => void
    resize: (sessionId: number, cols: number, rows: number) => void
    onData: (sessionId: number, cb: (data: string) => void) => UnsubscribeFn
    onExit: (sessionId: number, cb: (code: number) => void) => UnsubscribeFn
  }
  layout: {
    save: (name: string, data: unknown) => Promise<Result<void>>
    load: (name: string) => Promise<Result<SavedLayoutData>>
    list: () => Promise<Result<string[]>>
    delete: (name: string) => Promise<Result<void>>
  }
  config: {
    read: () => Promise<Result<unknown>>
    write: (data: unknown) => Promise<Result<void>>
    getPath: () => Promise<Result<string>> // NEW
  }
  fs: {
    listDir: (path: string) => Promise<Result<string[]>>
    getCwd: (sessionId: number) => Promise<Result<string>>
  }
  shell: {
    detect: () => Promise<Result<string[]>>
  }
  quit: {
    confirm: () => void
    cancel: () => void
    onShowDialog: (cb: (data: { sessionCount: number }) => void) => UnsubscribeFn
  }
  commandCenter: {
    onOpen: (cb: () => void) => UnsubscribeFn // push: main → renderer
  }
}
