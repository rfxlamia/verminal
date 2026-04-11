import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { parse } from 'smol-toml'
import { saveLayout, loadLayout } from './layout-manager'
import * as configManager from '../config-manager'
import type { SavedLayoutData } from '../../shared/ipc-contract'

// Mock config-manager to use temp directory
vi.mock('../config-manager', async () => {
  const actual = await vi.importActual<typeof import('../config-manager')>('../config-manager')
  return {
    ...actual,
    getConfigPath: vi.fn()
  }
})

describe('Layout TOML Integration', () => {
  let tmpDir: string
  let layoutsDir: string

  beforeEach(() => {
    // Create isolated temp directory per test
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verminal-integration-test-'))
    layoutsDir = path.join(tmpDir, 'layouts')
    vi.mocked(configManager.getConfigPath).mockReturnValue(tmpDir)
  })

  afterEach(() => {
    // Clean up temp directory with error handling
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors — temp files will be cleaned by OS eventually
    }
    // Restore all mocks to prevent state leakage
    vi.restoreAllMocks()
  })

  it('produces valid TOML with snake_case keys via saveLayout() (AC #3, #4)', async () => {
    const data: SavedLayoutData = {
      name: 'dev-setup',
      layout_name: 'horizontal',
      panes: [
        { pane_id: 1, name: 'Editor', color: 'blue' },
        { pane_id: 2, name: 'Terminal', color: 'green' }
      ]
    }

    // Use actual production saveLayout function
    const result = await saveLayout('dev-setup', data)
    expect(result.ok).toBe(true)

    const filePath = path.join(layoutsDir, 'dev-setup.toml')
    expect(fs.existsSync(filePath)).toBe(true)

    // Parseable TOML
    const parsed = parse(fs.readFileSync(filePath, 'utf-8'))
    expect(parsed).toMatchObject({
      name: 'dev-setup',
      layout_name: 'horizontal'
    })

    // snake_case keys check: no camelCase contamination
    expect(parsed).not.toHaveProperty('layoutName')
    expect(parsed).not.toHaveProperty('paneId')
    expect(parsed).not.toHaveProperty('isFocusMode')
    expect(parsed).not.toHaveProperty('focusedPaneId')

    // Verify panes array with snake_case keys
    const parsedPanes = (parsed as Record<string, unknown>).panes as Array<Record<string, unknown>>
    expect(parsedPanes).toHaveLength(2)
    expect(parsedPanes[0]).toHaveProperty('pane_id', 1)
    expect(parsedPanes[0]).toHaveProperty('name', 'Editor')
    expect(parsedPanes[0]).toHaveProperty('color', 'blue')
  })

  it('TOML output is deterministic — same save = empty diff (AC #5)', async () => {
    const data: SavedLayoutData = {
      name: 'monitoring',
      layout_name: 'grid',
      panes: [
        { pane_id: 1, name: 'Logs', color: 'red' },
        { pane_id: 2, name: 'Metrics', color: 'orange' },
        { pane_id: 3, name: 'Alerts' },
        { pane_id: 4, name: 'Status', color: 'green' }
      ]
    }

    // Save twice to the SAME file — should produce identical output (AC #5)
    await saveLayout('monitoring', data)
    const content1 = fs.readFileSync(path.join(layoutsDir, 'monitoring.toml'), 'utf-8')

    // Overwrite with same data
    await saveLayout('monitoring', data)
    const content2 = fs.readFileSync(path.join(layoutsDir, 'monitoring.toml'), 'utf-8')

    // Byte-for-byte identical (AC #5 — git diff empty on repeated save)
    expect(content1).toBe(content2)
  })

  it('ephemeral state is never written to TOML (AC #3 spec compliant)', async () => {
    const data: SavedLayoutData = {
      name: 'test-layout',
      layout_name: 'single',
      panes: [{ pane_id: 1, name: 'Main' }]
    }

    await saveLayout('test-layout', data)
    const content = fs.readFileSync(path.join(layoutsDir, 'test-layout.toml'), 'utf-8')

    // Ephemeral fields must NOT appear (both snake_case and camelCase variants)
    expect(content).not.toContain('is_focus_mode')
    expect(content).not.toContain('focused_pane_id')
    expect(content).not.toContain('isFocusMode')
    expect(content).not.toContain('focusedPaneId')
    expect(content).not.toContain('sessionId')
    expect(content).not.toContain('session_id')
  })

  it('loads saved layout correctly via loadLayout()', async () => {
    const data: SavedLayoutData = {
      name: 'roundtrip-test',
      layout_name: 'mixed',
      panes: [
        { pane_id: 1, name: 'Pane 1', color: 'blue' },
        { pane_id: 2, name: 'Pane 2', command: 'echo hello' }
      ]
    }

    // Save then load
    await saveLayout('roundtrip-test', data)
    const loaded = loadLayout('roundtrip-test')

    expect(loaded.ok).toBe(true)
    if (loaded.ok) {
      expect(loaded.data.name).toBe('roundtrip-test')
      expect(loaded.data.layout_name).toBe('mixed')
      expect(loaded.data.panes).toHaveLength(2)
      expect(loaded.data.panes[0]).toMatchObject({
        pane_id: 1,
        name: 'Pane 1',
        color: 'blue'
      })
      expect(loaded.data.panes[1]).toMatchObject({
        pane_id: 2,
        name: 'Pane 2',
        command: 'echo hello'
      })
      // AC #4: verify pane WITHOUT command loads correctly
      expect(loaded.data.panes[0].command).toBeUndefined()
    }
  })
})

describe('Fixture File Verification', () => {
  let tmpDir: string
  let layoutsDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verminal-integration-test-'))
    layoutsDir = path.join(tmpDir, 'layouts')
    vi.mocked(configManager.getConfigPath).mockReturnValue(tmpDir)
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('all valid fixtures can be loaded via loadLayout()', () => {
    const fixtureDir = path.join(__dirname, '../../../tests/fixtures/layouts/valid')

    // Count .toml files
    const tomlFiles = fs.readdirSync(fixtureDir).filter((f) => f.endsWith('.toml'))
    expect(tomlFiles.length).toBeGreaterThanOrEqual(3) // at least 3 fixtures exist

    // Ensure layouts directory exists
    fs.mkdirSync(layoutsDir, { recursive: true })

    // Each fixture must be loadable via loadLayout
    for (const file of tomlFiles) {
      const layoutName = path.basename(file, '.toml') // Safe extraction of layout name

      // Copy fixture to temp layouts dir for loading
      const srcPath = path.join(fixtureDir, file)
      const destPath = path.join(layoutsDir, file)
      fs.copyFileSync(srcPath, destPath)

      // Use actual production loadLayout function
      const result = loadLayout(layoutName)
      expect(result.ok).toBe(true)

      if (result.ok) {
        expect(result.data.name).toBe(layoutName)
        expect(['single', 'horizontal', 'mixed', 'grid']).toContain(result.data.layout_name)
        expect(Array.isArray(result.data.panes)).toBe(true)
      }
    }
  })

  it('fixtures match expected schema', () => {
    const fixtureDir = path.join(__dirname, '../../../tests/fixtures/layouts/valid')
    const tomlFiles = fs.readdirSync(fixtureDir).filter((f) => f.endsWith('.toml'))

    for (const file of tomlFiles) {
      const content = fs.readFileSync(path.join(fixtureDir, file), 'utf-8')
      const parsed = parse(content) as Record<string, unknown>

      // Required fields per AC #4
      expect(typeof parsed.name).toBe('string')
      expect(['single', 'horizontal', 'mixed', 'grid']).toContain(parsed.layout_name)
      expect(Array.isArray(parsed.panes)).toBe(true)

      // snake_case validation per AC #3
      expect(parsed).not.toHaveProperty('layoutName')
      expect(parsed).not.toHaveProperty('paneId')
      expect(parsed).not.toHaveProperty('isFocusMode')
      expect(parsed).not.toHaveProperty('focusedPaneId')
      expect(parsed).not.toHaveProperty('is_focus_mode')
      expect(parsed).not.toHaveProperty('focused_pane_id')
    }
  })
})
