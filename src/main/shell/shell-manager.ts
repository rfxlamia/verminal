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

  // Return copy to prevent mutation by caller (IPC will serialize anyway)
  return { ok: true, data: [...shells] }
}
