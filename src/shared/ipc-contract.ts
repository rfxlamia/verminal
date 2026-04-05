export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } }

export type UnsubscribeFn = () => void

export type LayoutName = 'single' | 'horizontal' | 'mixed' | 'grid'

/** Valid pane color values */
export type PaneColor = 'gray' | 'red' | 'orange' | 'amber' | 'green' | 'teal' | 'blue' | 'purple'

/** Set of valid pane colors for runtime validation */
export const VALID_PANE_COLORS: ReadonlySet<string> = new Set<PaneColor>([
  'gray',
  'red',
  'orange',
  'amber',
  'green',
  'teal',
  'blue',
  'purple'
])

/** Validates if a string is a valid PaneColor (case-sensitive) */
export function isValidPaneColor(color: string): color is PaneColor {
  return VALID_PANE_COLORS.has(color)
}

export interface SavedLayoutSummary {
  name: string
  layout_name: LayoutName
}

export interface SavedPaneData {
  pane_id?: number
  name?: string
  command?: string
  color?: PaneColor
}

export interface SavedLayoutData {
  name: string
  layout_name: LayoutName
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
    save: (name: string, data: SavedLayoutData) => Promise<Result<void>>
    load: (name: string) => Promise<Result<SavedLayoutData>>
    list: () => Promise<Result<SavedLayoutSummary[]>>
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
