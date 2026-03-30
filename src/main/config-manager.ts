import { app } from 'electron'
import { mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import type { Result } from '../shared/ipc-contract'

export const CONFIG_DIR_NAME = '.verminal'
export const SUBDIRS = ['layouts', 'logs', 'snapshots']

export function getConfigPath(): string {
  return join(app.getPath('home'), CONFIG_DIR_NAME)
}

export function getLogsPath(): string {
  return join(getConfigPath(), 'logs')
}

export function ensureConfigDirectory(): Result<void> {
  try {
    const configPath = getConfigPath()

    // Create main directory with user-only permissions
    if (!existsSync(configPath)) {
      mkdirSync(configPath, { recursive: true, mode: 0o700 })
    }

    // Create subdirectories (inherit parent permissions)
    for (const subdir of SUBDIRS) {
      const subdirPath = join(configPath, subdir)
      if (!existsSync(subdirPath)) {
        mkdirSync(subdirPath, { recursive: true })
      }
    }

    return { ok: true, data: undefined }
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code === 'EACCES') {
      return {
        ok: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: `Cannot create config directory: ${err.message}`,
          details: { path: getConfigPath() }
        }
      }
    }
    if (err.code === 'ENOSPC') {
      return {
        ok: false,
        error: {
          code: 'DISK_FULL',
          message: `Insufficient disk space: ${err.message}`,
          details: { path: getConfigPath() }
        }
      }
    }
    return {
      ok: false,
      error: {
        code: 'DIRECTORY_CREATE_ERROR',
        message: err.message,
        details: { path: getConfigPath() }
      }
    }
  }
}
