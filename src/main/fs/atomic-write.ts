import { openSync, writeSync, fsyncSync, closeSync, renameSync } from 'fs'
import { dirname, basename, join } from 'path'

let tmpCounter = 0

/**
 * Atomically writes content to a file using the write-to-temp-then-rename pattern.
 *
 * This ensures that the target file is never in a partially-written state, even if
 * the process is killed during the write operation. Uses fsyncSync to flush
 * operating system buffers to persistent storage before renaming.
 *
 * @param targetPath - The final path where the content should be written
 * @param content - The string content to write
 * @throws Error if the parent directory does not exist or if any write operation fails
 */
export function atomicWrite(targetPath: string, content: string): void {
  const dir = dirname(targetPath)
  const tmpPath = join(
    dir,
    `${basename(targetPath)}.tmp.${process.pid}.${++tmpCounter}`
  )

  const fd = openSync(tmpPath, 'w')
  try {
    writeSync(fd, content, 0, 'utf-8')
    fsyncSync(fd)
  } finally {
    closeSync(fd)
  }
  renameSync(tmpPath, targetPath)
}
