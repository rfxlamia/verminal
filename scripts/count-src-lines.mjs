/* eslint-disable @typescript-eslint/explicit-function-return-type */
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const args = process.argv.slice(2)
const excludeTests = args.includes('--exclude-tests')
const requestedTarget = args.find((arg) => !arg.startsWith('--')) ?? 'src'
const targetDir = path.resolve(repoRoot, requestedTarget)

const countableExtensions = new Set([
  '.cjs',
  '.css',
  '.cts',
  '.d.ts',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.less',
  '.mjs',
  '.sass',
  '.scss',
  '.svelte',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml'
])

function isCountableFile(filePath) {
  const basename = path.basename(filePath)

  if (basename.endsWith('.d.ts')) {
    return true
  }

  return countableExtensions.has(path.extname(filePath))
}

function isTestFile(filePath) {
  return (
    filePath.endsWith('.test.ts') ||
    filePath.endsWith('.test.tsx') ||
    filePath.endsWith('.test.js') ||
    filePath.endsWith('.test.jsx')
  )
}

function countLines(contents) {
  if (contents.length === 0) {
    return 0
  }

  const newlineMatches = contents.match(/\r\n|\r|\n/g)
  const newlineCount = newlineMatches?.length ?? 0
  const endsWithNewline = /\r\n|\r|\n$/.test(contents)

  return endsWithNewline ? newlineCount : newlineCount + 1
}

function pluralize(count, singular, plural = `${singular}s`) {
  return count === 1 ? singular : plural
}

function walkDirectory(directoryPath, files = []) {
  const directoryEntries = fs.readdirSync(directoryPath, { withFileTypes: true })

  for (const entry of directoryEntries) {
    const entryPath = path.join(directoryPath, entry.name)

    if (entry.isDirectory()) {
      walkDirectory(entryPath, files)
      continue
    }

    if (entry.isFile() && isCountableFile(entryPath)) {
      if (excludeTests && isTestFile(entryPath)) {
        continue
      }

      files.push(entryPath)
    }
  }

  return files
}

if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
  console.error(`ERROR: Directory not found: ${requestedTarget}`)
  process.exit(1)
}

const files = walkDirectory(targetDir).sort()
const totalsByExtension = new Map()
let totalLines = 0

for (const filePath of files) {
  const contents = fs.readFileSync(filePath, 'utf8')
  const lineCount = countLines(contents)
  const extension = path.basename(filePath).endsWith('.d.ts') ? '.d.ts' : path.extname(filePath)
  const current = totalsByExtension.get(extension) ?? { files: 0, lines: 0 }

  current.files += 1
  current.lines += lineCount
  totalsByExtension.set(extension, current)
  totalLines += lineCount
}

console.log(`Source line count for ${path.relative(repoRoot, targetDir) || '.'}`)
console.log(`Files counted: ${files.length}`)
console.log(`Total lines: ${totalLines}`)
console.log(`Test files excluded: ${excludeTests ? 'yes' : 'no'}`)

if (files.length > 0) {
  console.log('')
  console.log('Breakdown by extension:')

  const extensionRows = [...totalsByExtension.entries()].sort((left, right) =>
    left[0].localeCompare(right[0])
  )

  for (const [extension, stats] of extensionRows) {
    const label = extension.padEnd(7, ' ')
    const fileLabel = String(stats.files).padStart(3, ' ')
    const lineLabel = String(stats.lines).padStart(5, ' ')
    const fileWord = pluralize(stats.files, 'file')
    const lineWord = pluralize(stats.lines, 'line')
    console.log(`${label} ${fileLabel} ${fileWord} ${lineLabel} ${lineWord}`)
  }
}
