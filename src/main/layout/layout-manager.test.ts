import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fs module before importing the module under test
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs')
  return {
    ...actual,
    existsSync: vi.fn(),
    readdirSync: vi.fn(),
    readFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    promises: {
      mkdir: vi.fn().mockResolvedValue(undefined)
    }
  }
})

import * as fs from 'fs'
import { listLayouts, loadLayout, saveLayout } from './layout-manager'
import * as configManager from '../config-manager'
import { atomicWrite } from '../fs/atomic-write'
import type { SavedLayoutSummary, SavedLayoutData } from '../../shared/ipc-contract'

// Mock config-manager
vi.mock('../config-manager', () => ({
  getConfigPath: vi.fn()
}))

// Mock atomic-write
vi.mock('../fs/atomic-write', () => ({
  atomicWrite: vi.fn()
}))

describe('layout-manager', () => {
  const mockConfigPath = '/home/test/.verminal'

  beforeEach(() => {
    vi.mocked(configManager.getConfigPath).mockReturnValue(mockConfigPath)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('listLayouts', () => {
    it('returns empty array when layouts directory does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const result = listLayouts()

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toEqual([])
      }
    })

    it('returns sorted list of SavedLayoutSummary from .toml files', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync).mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ['dev-workspace.toml', 'personal.toml', 'work.toml', 'not-a-layout.txt', 'README.md'] as any
      )
      // Mock readFileSync to return valid TOML content for each layout file
      vi.mocked(fs.readFileSync).mockImplementation((filepath: unknown) => {
        const path = String(filepath)
        if (path.includes('dev-workspace')) {
          return 'name = "dev-workspace"\nlayout_name = "horizontal"\npanes = []'
        }
        if (path.includes('personal')) {
          return 'name = "personal"\nlayout_name = "single"\npanes = []'
        }
        if (path.includes('work')) {
          return 'name = "work"\nlayout_name = "grid"\npanes = []'
        }
        return ''
      })

      const result = listLayouts()

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toHaveLength(3)
        expect(result.data).toEqual([
          { name: 'dev-workspace', layout_name: 'horizontal' },
          { name: 'personal', layout_name: 'single' },
          { name: 'work', layout_name: 'grid' }
        ] as SavedLayoutSummary[])
      }
    })

    it('returns empty array when directory exists but has no .toml files', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync).mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ['README.md', 'config.json'] as any
      )

      const result = listLayouts()

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toEqual([])
      }
    })

    it('returns error when reading directory fails', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync).mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const result = listLayouts()

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('LAYOUT_LIST_ERROR')
        expect(result.error.message).toContain('Permission denied')
      }
    })

    it('skips files with invalid layout_name when listing layouts', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync).mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ['invalid.toml', 'valid.toml'] as any
      )
      // Use mockReturnValueOnce to return different values for each call
      // Files are sorted alphabetically: invalid.toml, valid.toml
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce('name = "invalid"\nlayout_name = "invalid-type"\npanes = []')
        .mockReturnValueOnce('name = "valid"\nlayout_name = "horizontal"\npanes = []')

      const result = listLayouts()

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toEqual([
          { name: 'valid', layout_name: 'horizontal' }
        ] as SavedLayoutSummary[])
      }
    })
  })

  describe('loadLayout', () => {
    it('returns LAYOUT_NOT_FOUND error when file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const result = loadLayout('non-existent')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('LAYOUT_NOT_FOUND')
        expect(result.error.message).toContain('non-existent')
      }
    })

    it('returns LAYOUT_INVALID_NAME error when name contains path separator', () => {
      const result = loadLayout('../etc/passwd')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('LAYOUT_INVALID_NAME')
        expect(result.error.message).toContain('Invalid layout name')
      }
    })

    it('returns LAYOUT_INVALID_NAME error when name contains traversal', () => {
      const result = loadLayout('foo/../../bar')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('LAYOUT_INVALID_NAME')
      }
    })

    it('returns LAYOUT_INVALID_TOML error when file contains invalid TOML', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('invalid toml content [[[[')

      const result = loadLayout('invalid-layout')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('LAYOUT_INVALID_TOML')
      }
    })

    it('returns LAYOUT_INVALID_DATA error when TOML is valid but missing required fields', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('name = "test"') // missing layout_name and panes

      const result = loadLayout('incomplete-layout')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('LAYOUT_INVALID_DATA')
      }
    })

    it('returns LAYOUT_INVALID_DATA error when layout_name is invalid', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(`
name = "test"
layout_name = "invalid-layout-type"
panes = []
`)

      const result = loadLayout('test')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('LAYOUT_INVALID_DATA')
      }
    })

    it('returns LAYOUT_INVALID_DATA error when panes is not an array', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(`
name = "test"
layout_name = "single"
panes = "not-an-array"
`)

      const result = loadLayout('test')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('LAYOUT_INVALID_DATA')
      }
    })

    it('successfully loads valid layout with minimal data', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(`
name = "dev-workspace"
layout_name = "horizontal"

[[panes]]
pane_id = 1
name = "Editor"
`)

      const result = loadLayout('dev-workspace')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.name).toBe('dev-workspace')
        expect(result.data.layout_name).toBe('horizontal')
        expect(result.data.panes).toHaveLength(1)
        expect(result.data.panes[0].pane_id).toBe(1)
        expect(result.data.panes[0].name).toBe('Editor')
      }
    })

    it('successfully loads valid layout with multiple panes', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(`
name = "complex-workspace"
layout_name = "grid"

[[panes]]
pane_id = 1
name = "Top Left"
command = "vim ."
color = "blue"

[[panes]]
pane_id = 2
name = "Top Right"

[[panes]]
pane_id = 3

[[panes]]
pane_id = 4
name = "Bottom Right"
`)

      const result = loadLayout('complex-workspace')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.name).toBe('complex-workspace')
        expect(result.data.layout_name).toBe('grid')
        expect(result.data.panes).toHaveLength(4)
        expect(result.data.panes[0]).toEqual({
          pane_id: 1,
          name: 'Top Left',
          command: 'vim .',
          color: 'blue'
        })
        expect(result.data.panes[2]).toEqual({
          pane_id: 3,
          name: undefined,
          command: undefined,
          color: undefined
        })
      }
    })

    it('returns LAYOUT_INVALID_DATA error when pane has invalid pane_id', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(`
name = "test"
layout_name = "single"

[[panes]]
pane_id = "not-a-number"
`)

      const result = loadLayout('test')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('LAYOUT_INVALID_DATA')
      }
    })

    it('drops invalid color on load', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(`
name = "test"
layout_name = "single"

[[panes]]
pane_id = 1
name = "Server"
color = "hotpink"
`)

      const result = loadLayout('test')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.panes[0].color).toBeUndefined()
      }
    })

    it('drops color with wrong case (case-sensitive validation)', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(`
name = "test"
layout_name = "single"

[[panes]]
pane_id = 1
color = "Blue"
`)

      const result = loadLayout('test')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.panes[0].color).toBeUndefined()
      }
    })

    it('preserves undefined color for panes without color tag', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(`
name = "test"
layout_name = "single"

[[panes]]
pane_id = 1
name = "Server"
`)

      const result = loadLayout('test')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.panes[0].color).toBeUndefined()
      }
    })

    it('preserves valid color values', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(`
name = "test"
layout_name = "single"

[[panes]]
pane_id = 1
name = "Server"
color = "blue"

[[panes]]
pane_id = 2
name = "Tests"
color = "green"

[[panes]]
pane_id = 3
name = "Logs"
color = "teal"
`)

      const result = loadLayout('test')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.panes[0].color).toBe('blue')
        expect(result.data.panes[1].color).toBe('green')
        expect(result.data.panes[2].color).toBe('teal')
      }
    })
  })

  describe('saveLayout', () => {
    it('returns error for layout name with path traversal', async () => {
      const data: SavedLayoutData = {
        name: 'test',
        layout_name: 'single',
        panes: [{ pane_id: 1 }]
      }
      const result = await saveLayout('../../../etc/passwd', data)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_LAYOUT_NAME')
      }
    })

    it('returns error for layout name with path separators', async () => {
      const data: SavedLayoutData = {
        name: 'test',
        layout_name: 'single',
        panes: [{ pane_id: 1 }]
      }
      const result = await saveLayout('layouts/test', data)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_LAYOUT_NAME')
      }
    })

    it('returns error for layout name starting with dot', async () => {
      const data: SavedLayoutData = {
        name: 'test',
        layout_name: 'single',
        panes: [{ pane_id: 1 }]
      }
      const result = await saveLayout('.hidden', data)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_LAYOUT_NAME')
      }
    })

    it('returns error for empty layout name', async () => {
      const data: SavedLayoutData = {
        name: 'test',
        layout_name: 'single',
        panes: [{ pane_id: 1 }]
      }
      const result = await saveLayout('', data)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_LAYOUT_NAME')
      }
    })

    it('returns error for whitespace-only layout name', async () => {
      const data: SavedLayoutData = {
        name: 'test',
        layout_name: 'single',
        panes: [{ pane_id: 1 }]
      }
      const result = await saveLayout('   ', data)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_LAYOUT_NAME')
      }
    })

    it('creates layouts directory if it does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined)
      const atomicWriteMock = vi.mocked(atomicWrite).mockImplementation(() => undefined)

      const data: SavedLayoutData = {
        name: 'dev-workspace',
        layout_name: 'grid',
        panes: [
          { pane_id: 1, name: 'Server', color: 'blue' },
          { pane_id: 2, name: 'Tests', color: 'green' }
        ]
      }

      await saveLayout('dev-workspace', data)

      expect(fs.promises.mkdir).toHaveBeenCalledWith(
        '/home/test/.verminal/layouts',
        { recursive: true }
      )
      expect(atomicWriteMock).toHaveBeenCalled()
    })
  })
})
