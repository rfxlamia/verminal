import { openSync, writeSync, fsyncSync, closeSync, renameSync } from 'fs'
import { basename, join } from 'path'
import { tmpdir } from 'os'

let tmpCounter = 0

/**
 * Atomically writes content to a file using the write-to-temp-then-rename pattern.
 *
 * The temp file is created in the OS temp directory to avoid partial writes in the
 * target directory. Once fully written and fsynced, it is atomically renamed to the
 * final target path. Uses fsyncSync to flush operating system buffers to persistent
 * storage before renaming.
 *
 * @param targetPath - The final path where the content should be written
 * @param content - The string content to write
 * @throws Error if the parent directory does not exist or if any write operation fails
 */
export function atomicWrite(targetPath: string, content: string): void {
  const tmpPath = join(tmpdir(), `${basename(targetPath)}.tmp.${process.pid}.${++tmpCounter}`)

  const fd = openSync(tmpPath, 'w')
  try {
    writeSync(fd, content, 0, 'utf-8')
    fsyncSync(fd)
  } finally {
    closeSync(fd)
  }
  renameSync(tmpPath, targetPath)
}
