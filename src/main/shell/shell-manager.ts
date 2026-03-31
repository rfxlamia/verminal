import type { Result } from '../../shared/ipc-contract'
import { detectShells } from './shell-detector'

export async function handleShellDetect(): Promise<Result<string[]>> {
  const shells = detectShells()

  if (shells.length === 0) {
    return {
      ok: false,
      error: {
        code: 'SHELL_NOT_AVAILABLE',
        message: 'No valid shell found. Please configure shell path in config.'
      }
    }
  }

  // Return a copy to prevent mutation by caller
  // Note: While IPC serialization creates a copy anyway, we return a copy here
  // for safety in case this function is called directly without IPC
  return { ok: true, data: [...shells] }
}
