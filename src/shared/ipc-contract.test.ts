import { describe, it, expectTypeOf } from 'vitest'
import type { Result, IpcContract } from './ipc-contract'

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

describe('IpcContract', () => {
  it('has app.getVersion returning Promise<Result<string>>', () => {
    expectTypeOf<IpcContract['app']['getVersion']>().toMatchTypeOf<() => Promise<Result<string>>>()
  })

  it('has app.getPaths returning Promise<Result<{ home: string; userData: string; logsDir: string }>>', () => {
    expectTypeOf<IpcContract['app']['getPaths']>().toMatchTypeOf<() => Promise<Result<{ home: string; userData: string; logsDir: string }>>>()
  })

  it('has pty namespace with spawn, kill, write, resize, onData, onExit', () => {
    expectTypeOf<IpcContract['pty']['spawn']>().toMatchTypeOf<(shell: string, args: string[], cwd: string) => Promise<Result<{ sessionId: number }>>>()
    expectTypeOf<IpcContract['pty']['kill']>().toMatchTypeOf<(sessionId: number) => Promise<Result<void>>>()
    expectTypeOf<IpcContract['pty']['write']>().toMatchTypeOf<(sessionId: number, data: string) => void>()
    expectTypeOf<IpcContract['pty']['resize']>().toMatchTypeOf<(sessionId: number, cols: number, rows: number) => void>()
    expectTypeOf<IpcContract['pty']['onData']>().toMatchTypeOf<(sessionId: number, cb: (data: string) => void) => (() => void)>()
    expectTypeOf<IpcContract['pty']['onExit']>().toMatchTypeOf<(sessionId: number, cb: (code: number) => void) => (() => void)>()
  })

  it('has layout namespace with save, load, list, delete', () => {
    expectTypeOf<IpcContract['layout']['save']>().toMatchTypeOf<(name: string, data: unknown) => Promise<Result<void>>>()
    expectTypeOf<IpcContract['layout']['load']>().toMatchTypeOf<(name: string) => Promise<Result<unknown>>>()
    expectTypeOf<IpcContract['layout']['list']>().toMatchTypeOf<() => Promise<Result<string[]>>>()
    expectTypeOf<IpcContract['layout']['delete']>().toMatchTypeOf<(name: string) => Promise<Result<void>>>()
  })

  it('has config namespace with read and write', () => {
    expectTypeOf<IpcContract['config']['read']>().toMatchTypeOf<() => Promise<Result<unknown>>>()
    expectTypeOf<IpcContract['config']['write']>().toMatchTypeOf<(data: unknown) => Promise<Result<void>>>()
  })

  it('has fs namespace with listDir and getCwd', () => {
    expectTypeOf<IpcContract['fs']['listDir']>().toMatchTypeOf<(path: string) => Promise<Result<string[]>>>()
    expectTypeOf<IpcContract['fs']['getCwd']>().toMatchTypeOf<(sessionId: number) => Promise<Result<string>>>()
  })

  it('has shell namespace with detect', () => {
    expectTypeOf<IpcContract['shell']['detect']>().toMatchTypeOf<() => Promise<Result<string[]>>>()
  })
})
