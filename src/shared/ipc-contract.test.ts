import { describe, it, expectTypeOf } from 'vitest'
import type { Result, IpcContract, SavedLayoutData, SavedPaneData } from './ipc-contract'

describe('Result<T>', () => {
  it('allows ok branch with data', () => {
    const r: Result<string> = { ok: true, data: 'v1.0.0' }
    expectTypeOf(r).toMatchTypeOf<Result<string>>()
  })

  it('allows error branch with code and message', () => {
    const r: Result<string> = { ok: false, error: { code: 'ERR', message: 'fail' } }
    expectTypeOf(r).toMatchTypeOf<Result<string>>()
  })
})

describe('SavedPaneData', () => {
  it('allows pane with all optional fields', () => {
    const pane: SavedPaneData = {
      pane_id: 1,
      name: 'Editor',
      command: 'vim .',
      color: 'blue'
    }
    expectTypeOf(pane).toMatchTypeOf<SavedPaneData>()
  })

  it('allows pane with minimal fields', () => {
    const pane: SavedPaneData = {}
    expectTypeOf(pane).toMatchTypeOf<SavedPaneData>()
  })

  it('allows pane with partial fields', () => {
    const pane: SavedPaneData = { pane_id: 1, name: 'Terminal' }
    expectTypeOf(pane).toMatchTypeOf<SavedPaneData>()
  })
})

describe('SavedLayoutData', () => {
  it('requires name, layout_name, and panes', () => {
    const layout: SavedLayoutData = {
      name: 'dev-workspace',
      layout_name: 'horizontal',
      panes: [{ pane_id: 1, name: 'Editor' }]
    }
    expectTypeOf(layout).toMatchTypeOf<SavedLayoutData>()
  })

  it('allows empty panes array', () => {
    const layout: SavedLayoutData = {
      name: 'empty',
      layout_name: 'single',
      panes: []
    }
    expectTypeOf(layout).toMatchTypeOf<SavedLayoutData>()
  })

  it('allows multiple panes', () => {
    const layout: SavedLayoutData = {
      name: 'grid-workspace',
      layout_name: 'grid',
      panes: [
        { pane_id: 1, name: 'Top Left' },
        { pane_id: 2 },
        { pane_id: 3, command: 'npm run dev' },
        { pane_id: 4, name: 'Bottom Right', color: 'green' }
      ]
    }
    expectTypeOf(layout).toMatchTypeOf<SavedLayoutData>()
  })
})

describe('IpcContract', () => {
  it('has app.getVersion returning Promise<Result<string>>', () => {
    expectTypeOf<IpcContract['app']['getVersion']>().toMatchTypeOf<() => Promise<Result<string>>>()
  })

  it('has app.getPaths returning Promise<Result<{ home: string; userData: string; logsDir: string }>>', () => {
    expectTypeOf<IpcContract['app']['getPaths']>().toMatchTypeOf<
      () => Promise<Result<{ home: string; userData: string; logsDir: string }>>
    >()
  })

  it('has pty namespace with spawn, kill, write, resize, onData, onExit', () => {
    expectTypeOf<IpcContract['pty']['spawn']>().toMatchTypeOf<
      (shell: string, args: string[], cwd: string) => Promise<Result<{ sessionId: number }>>
    >()
    expectTypeOf<IpcContract['pty']['kill']>().toMatchTypeOf<
      (sessionId: number) => Promise<Result<void>>
    >()
    expectTypeOf<IpcContract['pty']['write']>().toMatchTypeOf<
      (sessionId: number, data: string) => void
    >()
    expectTypeOf<IpcContract['pty']['resize']>().toMatchTypeOf<
      (sessionId: number, cols: number, rows: number) => void
    >()
    expectTypeOf<IpcContract['pty']['onData']>().toMatchTypeOf<
      (sessionId: number, cb: (data: string) => void) => () => void
    >()
    expectTypeOf<IpcContract['pty']['onExit']>().toMatchTypeOf<
      (sessionId: number, cb: (code: number) => void) => () => void
    >()
  })

  it('has layout namespace with save, load, list, delete', () => {
    expectTypeOf<IpcContract['layout']['save']>().toMatchTypeOf<
      (name: string, data: unknown) => Promise<Result<void>>
    >()
    expectTypeOf<IpcContract['layout']['load']>().toMatchTypeOf<
      (name: string) => Promise<Result<SavedLayoutData>>
    >()
    expectTypeOf<IpcContract['layout']['list']>().toMatchTypeOf<() => Promise<Result<string[]>>>()
    expectTypeOf<IpcContract['layout']['delete']>().toMatchTypeOf<
      (name: string) => Promise<Result<void>>
    >()
  })

  it('has config namespace with read and write', () => {
    expectTypeOf<IpcContract['config']['read']>().toMatchTypeOf<() => Promise<Result<unknown>>>()
    expectTypeOf<IpcContract['config']['write']>().toMatchTypeOf<
      (data: unknown) => Promise<Result<void>>
    >()
  })

  it('has fs namespace with listDir and getCwd', () => {
    expectTypeOf<IpcContract['fs']['listDir']>().toMatchTypeOf<
      (path: string) => Promise<Result<string[]>>
    >()
    expectTypeOf<IpcContract['fs']['getCwd']>().toMatchTypeOf<
      (sessionId: number) => Promise<Result<string>>
    >()
  })

  it('has shell namespace with detect', () => {
    expectTypeOf<IpcContract['shell']['detect']>().toMatchTypeOf<() => Promise<Result<string[]>>>()
  })

  it('has quit namespace with confirm, cancel and onShowDialog', () => {
    expectTypeOf<IpcContract['quit']['confirm']>().toMatchTypeOf<() => void>()
    expectTypeOf<IpcContract['quit']['cancel']>().toMatchTypeOf<() => void>()
    expectTypeOf<IpcContract['quit']['onShowDialog']>().toMatchTypeOf<
      (cb: (data: { sessionCount: number }) => void) => () => void
    >()
  })

  it('has commandCenter namespace with onOpen returning UnsubscribeFn', () => {
    expectTypeOf<IpcContract['commandCenter']['onOpen']>().toMatchTypeOf<
      (cb: () => void) => () => void
    >()
  })
})
