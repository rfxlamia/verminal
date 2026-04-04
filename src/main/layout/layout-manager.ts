import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'smol-toml'
import type { Result, SavedLayoutData } from '../../shared/ipc-contract'
import { getConfigPath } from '../config-manager'

function getLayoutsDir(): string {
  return path.join(getConfigPath(), 'layouts')
}

function isValidLayoutName(name: string): boolean {
  // Reject names with path separators or traversal attempts
  if (name.includes('/') || name.includes('\\')) return false
  if (name.includes('..')) return false
  if (name.startsWith('.')) return false
  return true
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
  const validLayoutNames = ['single', 'horizontal', 'mixed', 'grid']
  if (typeof obj.layout_name !== 'string') {
    throw new Error('Layout must have a layout_name string')
  }
  if (!validLayoutNames.includes(obj.layout_name)) {
    throw new Error(`Invalid layout_name: ${obj.layout_name}`)
  }

  // Validate panes
  if (!Array.isArray(obj.panes)) {
    throw new Error('Layout must have a panes array')
  }

  // Validate each pane
  const validatedPanes = obj.panes.map((pane: unknown, index: number) => {
    if (typeof pane !== 'object' || pane === null) {
      throw new Error(`Pane at index ${index} must be an object`)
    }
    const paneObj = pane as Record<string, unknown>

    // pane_id is optional but must be a number if present
    if (paneObj.pane_id !== undefined && typeof paneObj.pane_id !== 'number') {
      throw new Error(`Pane at index ${index} has invalid pane_id`)
    }

    return {
      pane_id: paneObj.pane_id as number | undefined,
      name: typeof paneObj.name === 'string' ? paneObj.name : undefined,
      command: typeof paneObj.command === 'string' ? paneObj.command : undefined,
      color: typeof paneObj.color === 'string' ? paneObj.color : undefined
    }
  })

  return {
    name: obj.name,
    layout_name: obj.layout_name,
    panes: validatedPanes
  }
}

export function listLayouts(): Result<string[]> {
  const layoutsDir = getLayoutsDir()
  try {
    if (!fs.existsSync(layoutsDir)) {
      return { ok: true, data: [] }
    }
    const files = fs.readdirSync(layoutsDir)
    const names = files
      .filter(f => f.endsWith('.toml'))
      .map(f => f.slice(0, -5)) // Remove .toml extension
      .sort((a, b) => a.localeCompare(b))
    return { ok: true, data: names }
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
    // Check if it's a validation error from validateSavedLayoutData
    const errorMessage = (error as Error).message
    if (
      errorMessage.includes('must have') ||
      errorMessage.includes('must be') ||
      errorMessage.includes('Invalid')
    ) {
      return {
        ok: false,
        error: {
          code: 'LAYOUT_INVALID_DATA',
          message: `Failed to load layout "${name}": ${errorMessage}`
        }
      }
    }

    return {
      ok: false,
      error: {
        code: 'LAYOUT_INVALID_DATA',
        message: `Failed to load layout "${name}": ${errorMessage}`
      }
    }
  }
}
