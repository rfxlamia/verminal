import { app } from 'electron'

/**
 * Resolves the user's home directory path using Electron's app.getPath('home').
 * This is the canonical source for home path resolution in the main process.
 *
 * @returns The absolute path to the user's home directory (no tilde literal)
 */
export function resolveHome(): string {
  return app.getPath('home')
}
