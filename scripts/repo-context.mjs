/* eslint-disable @typescript-eslint/explicit-function-return-type */
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const repoRoot = process.cwd()
const contextPath = path.join(repoRoot, 'repo-config/agent-context.json')

let context
try {
  context = JSON.parse(fs.readFileSync(contextPath, 'utf8'))
} catch {
  console.error(`ERROR: Cannot read agent-context.json at ${contextPath}`)
  console.error('Run from repo root or ensure repo-config/agent-context.json exists.')
  process.exit(1)
}

function safeGit(command) {
  try {
    return execSync(command, { cwd: repoRoot, encoding: 'utf8' }).trim()
  } catch (error) {
    return `ERROR: ${error instanceof Error ? error.message : String(error)}`
  }
}

const branch = safeGit('git rev-parse --abbrev-ref HEAD')
const worktrees = safeGit('git worktree list')

console.log('Repository Context')
console.log(`Current branch: ${branch}`)
console.log('Worktrees:')
console.log(worktrees)
console.log('Required docs:')
for (const doc of context.requiredDocs) console.log(`- ${doc}`)
console.log(`Status source of truth: ${context.statusSource}`)
console.log(`Default main policy: ${context.mainBranchPolicy}`)
console.log(`Current main lane: ${context.lanes.main.currentEpic}`)
const activePolicy =
  branch === 'main'
    ? context.mainBranchPolicy
    : (context.worktreePolicy ?? context.mainBranchPolicy)
console.log(`Active lane policy: ${activePolicy}`)
