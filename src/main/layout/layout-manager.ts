import * as fs from 'fs'
import * as path from 'path'
import { parse, stringify } from 'smol-toml'
import type {
  Result,
  SavedLayoutData,
  SavedLayoutSummary,
  LayoutName
} from '../../shared/ipc-contract'
import { isValidPaneColor } from '../../shared/ipc-contract'
import { getConfigPath } from '../config-manager'
import { atomicWrite } from '../fs/atomic-write'

function getLayoutsDir(): string {
  return path.join(getConfigPath(), 'layouts')
}

function isValidLayoutName(name: string): boolean {
  // Reject empty or whitespace-only names
  if (!name || name.trim().length === 0) return false

  // Reject names that are only whitespace
  if (name.trim().length !== name.length) return false

  // Reject names with path separators or traversal attempts
  if (name.includes('/') || name.includes('\\')) return false
  if (name.includes('..')) return false
  if (name.startsWith('.')) return false

  // Reject null bytes (path traversal on some filesystems)
  if (name.includes('\0')) return false

  // Maximum length check (255 chars for most filesystems)
  if (name.length > 255) return false

  return true
}

const validLayoutNames: LayoutName[] = ['single', 'horizontal', 'mixed', 'grid']

function isValidLayoutNameString(name: string): name is LayoutName {
  return validLayoutNames.includes(name as LayoutName)
}

function validateSavedLayoutData(data: unknown): SavedLayoutData {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Layout data must be an object')
  }

  const obj = data as Record<string, unknown>

  // Validate name
  if (typeof obj.name !== 'string') {
    throw new Error('Layout must have a name string')
  }

  // Validate layout_name
  if (typeof obj.layout_name !== 'string') {
    throw new Error('Layout must have a layout_name string')
  }
  if (!isValidLayoutNameString(obj.layout_name)) {
    throw new Error(`Layout has invalid layout_name: ${obj.layout_name}`)
  }

  // Validate panes
  if (!Array.isArray(obj.panes)) {
    throw new Error('Layout must have a panes array')
  }

  // Validate each pane
  const seenPaneIds = new Set<number>()
  const validatedPanes = obj.panes.map((pane: unknown, index: number) => {
    if (typeof pane !== 'object' || pane === null) {
      throw new Error(`Pane at index ${index} must be an object`)
    }
    const paneObj = pane as Record<string, unknown>

    // pane_id is optional but must be a positive number if present
    if (paneObj.pane_id !== undefined) {
      if (typeof paneObj.pane_id !== 'number') {
        throw new Error(`Pane at index ${index} has invalid pane_id`)
      }
      if (paneObj.pane_id <= 0) {
        throw new Error(`Pane at index ${index} has invalid pane_id: must be positive`)
      }
      if (seenPaneIds.has(paneObj.pane_id)) {
        throw new Error(`Pane at index ${index} has duplicate pane_id: ${paneObj.pane_id}`)
      }
      seenPaneIds.add(paneObj.pane_id)
    }

    return {
      pane_id: paneObj.pane_id as number | undefined,
      name: typeof paneObj.name === 'string' ? paneObj.name : undefined,
      command: typeof paneObj.command === 'string' ? paneObj.command : undefined,
      color:
        typeof paneObj.color === 'string' && isValidPaneColor(paneObj.color)
          ? paneObj.color
          : undefined
    }
  })

  return {
    name: obj.name,
    layout_name: obj.layout_name,
    panes: validatedPanes
  }
}

export function listLayouts(): Result<SavedLayoutSummary[]> {
  const layoutsDir = getLayoutsDir()
  try {
    if (!fs.existsSync(layoutsDir)) {
      return { ok: true, data: [] }
    }
    const files = fs.readdirSync(layoutsDir)
    const tomlFiles = files.filter((f) => f.endsWith('.toml')).sort((a, b) => a.localeCompare(b))

    // Read each layout file to extract summary (name + layout_name)
    const summaries: SavedLayoutSummary[] = []
    for (const file of tomlFiles) {
      const name = file.slice(0, -5) // Remove .toml extension
      const layoutFile = path.join(layoutsDir, file)
      try {
        const content = fs.readFileSync(layoutFile, 'utf-8')
        const parsed = parse(content)
        // Runtime validation: ensure parsed is an object
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          console.warn(`[layout-manager] Skipping file "${file}": not a valid TOML object`)
          continue
        }
        const layoutName = (parsed as Record<string, unknown>).layout_name
        // Runtime validation: ensure layout_name is a string
        if (typeof layoutName !== 'string') {
          console.warn(`[layout-manager] Skipping file "${file}": layout_name missing or invalid`)
          continue
        }
        // Only include if layout_name is valid
        if (isValidLayoutNameString(layoutName)) {
          summaries.push({ name, layout_name: layoutName })
        }
      } catch (error) {
        // Log parse errors for debugging but continue processing other files
        console.warn(
          `[layout-manager] Failed to parse layout file "${file}":`,
          (error as Error).message
        )
      }
    }

    return { ok: true, data: summaries }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'LAYOUT_LIST_ERROR',
        message: (error as Error).message
      }
    }
  }
}

export function loadLayout(name: string): Result<SavedLayoutData> {
  // Validate name before using it in path
  if (!isValidLayoutName(name)) {
    return {
      ok: false,
      error: {
        code: 'LAYOUT_INVALID_NAME',
        message: `Invalid layout name: "${name}". Names cannot contain path separators or traversal sequences.`
      }
    }
  }

  const layoutFile = path.join(getLayoutsDir(), `${name}.toml`)

  try {
    if (!fs.existsSync(layoutFile)) {
      return {
        ok: false,
        error: {
          code: 'LAYOUT_NOT_FOUND',
          message: `Layout "${name}" not found`
        }
      }
    }

    const content = fs.readFileSync(layoutFile, 'utf-8')
    let parsed: unknown
    try {
      parsed = parse(content)
    } catch (parseError) {
      return {
        ok: false,
        error: {
          code: 'LAYOUT_INVALID_TOML',
          message: `Failed to parse layout "${name}": ${(parseError as Error).message}`
        }
      }
    }

    const validated = validateSavedLayoutData(parsed)
    return { ok: true, data: validated }
  } catch (error) {
    // Check if it's a validation error from validateSavedLayoutData by error type
    if (error instanceof Error && error.message.startsWith('Layout ')) {
      return {
        ok: false,
        error: {
          code: 'LAYOUT_INVALID_DATA',
          message: `Failed to load layout "${name}": ${error.message}`
        }
      }
    }

    return {
      ok: false,
      error: {
        code: 'LAYOUT_INVALID_DATA',
        message: `Failed to load layout "${name}": ${(error as Error).message}`
      }
    }
  }
}

export async function saveLayout(name: string, data: SavedLayoutData): Promise<Result<void>> {
  if (!isValidLayoutName(name)) {
    return {
      ok: false,
      error: { code: 'LAYOUT_INVALID_NAME', message: `Invalid layout name: "${name}"` }
    }
  }

  const layoutsDir = getLayoutsDir()
  await fs.promises.mkdir(layoutsDir, { recursive: true })

  const panes = data.panes.map((pane) => {
    const obj: Record<string, unknown> = {}
    if (pane.pane_id !== undefined) obj.pane_id = pane.pane_id
    if (pane.name) obj.name = pane.name
    if (pane.color) obj.color = pane.color
    if (pane.command) obj.command = pane.command
    return obj
  })

  const tomlObj = {
    name: data.name,
    layout_name: data.layout_name,
    panes
  }

  const content = stringify(tomlObj)
  const filePath = path.join(layoutsDir, `${name}.toml`)
  await atomicWrite(filePath, content)

  return { ok: true, data: undefined }
}
