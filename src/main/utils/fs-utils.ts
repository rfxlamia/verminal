import { existsSync, accessSync, constants } from 'node:fs'

/**
 * Check if a path is an executable file.
 * Verifies both file existence and execute permission.
 *
 * This is a defense-in-depth check:
 * 1. existsSync verifies the path exists
 * 2. accessSync with X_OK verifies execute permission
 *
 * Both checks are required because:
 * - A path may exist but not be executable (directory, regular file without +x)
 * - existsSync alone doesn't guarantee we can execute the file
 *
 * @param path - The file path to check
 * @returns true if the path exists and is executable, false otherwise
 */
export function isExecutable(path: string): boolean {
  if (!existsSync(path)) {
    return false
  }
  try {
    accessSync(path, constants.X_OK)
    return true
  } catch (error) {
    // Only return false for permission errors (EACCES, EPERM)
    // Re-throw other errors (ENOENT, etc.) so caller knows something is wrong
    const err = error as NodeJS.ErrnoException
    if (err.code === 'EACCES' || err.code === 'EPERM') {
      return false
    }
    throw error
  }
}
