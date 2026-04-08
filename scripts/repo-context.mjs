/* eslint-disable @typescript-eslint/explicit-function-return-type */
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import yaml from 'yaml'

const repoRoot = process.cwd()
const sprintStatusPath = path.join(repoRoot, 'docs/implementation-artifacts/sprint-status.yaml')
const contextPath = path.join(repoRoot, 'repo-config/agent-context.json')

let sprintStatus
try {
  const rawYaml = fs.readFileSync(sprintStatusPath, 'utf8')
  sprintStatus = yaml.parse(rawYaml)
} catch {
  console.error(`ERROR: Cannot read sprint-status.yaml at ${sprintStatusPath}`)
  process.exit(1)
}

// Guard against malformed structure (valid YAML but missing expected keys)
if (!sprintStatus || !sprintStatus.development_status) {
  console.error('ERROR: sprint-status.yaml missing development_status key')
  process.exit(1)
}

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
const worktreesOutput = safeGit('git worktree list')

// Parse worktree branches (extract branch names from worktree list)
const worktreeBranches = [
  ...worktreesOutput.matchAll(/\.worktrees\/[\w-]+\s+[\w]+\s+\[([\w/-]+)\]/g)
].map((m) => m[1])

// Derive current epic from sprint-status.yaml (source of truth)
// Logic:
// - If on main branch: find in_progress epic that does NOT have a dedicated worktree
// - If in a worktree: find the epic matching the worktree branch name
const developmentStatus = sprintStatus.development_status ?? {}
const allEpics = Object.entries(developmentStatus)
  .filter(([key]) => key.startsWith('epic-'))
  .sort(([a], [b]) => {
    const numA = parseInt(a.replace('epic-', ''), 10)
    const numB = parseInt(b.replace('epic-', ''), 10)
    return numA - numB
  })

let currentMainEpic = 'unknown'

if (branch === 'main') {
  // On main: find in_progress epic without dedicated worktree
  const inProgressWithoutWorktree = allEpics.find(([key, status]) => {
    if (status !== 'in-progress') return false
    // Check if this epic has a dedicated worktree by looking for branch pattern in worktree list
    const epicNum = key.replace('epic-', '')
    const hasWorktree = worktreeBranches.some((b) => b.includes(`epic/${epicNum}-`))
    return !hasWorktree
  })
  currentMainEpic = inProgressWithoutWorktree?.[0] ?? 'unknown'
} else {
  // In worktree: match branch name to epic number
  const branchEpicMatch = branch.match(/epic\/(\d+)/)
  if (branchEpicMatch) {
    const epicNum = branchEpicMatch[1]
    currentMainEpic = `epic-${epicNum}`
  } else {
    // Fallback: find in_progress epic that has this branch in its worktree
    const matchedEpic = allEpics.find(([key, status]) => {
      if (status !== 'in-progress') return false
      return worktreeBranches.some((b) => b.includes(key.replace('epic-', '')))
    })
    currentMainEpic = matchedEpic?.[0] ?? 'unknown'
  }
}

console.log('Repository Context')
console.log(`Current branch: ${branch}`)
console.log('Worktrees:')
console.log(worktreesOutput)
console.log('Required docs:')
for (const doc of context.requiredDocs) console.log(`- ${doc}`)
console.log(`Status source of truth: ${context.statusSource}`)
console.log(`Default main policy: ${context.mainBranchPolicy}`)
console.log(`Current main lane: ${currentMainEpic}`)
const activePolicy =
  branch === 'main'
    ? context.mainBranchPolicy
    : (context.worktreePolicy ?? context.mainBranchPolicy)
console.log(`Active lane policy: ${activePolicy}`)
