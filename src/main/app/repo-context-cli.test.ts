import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import yaml from 'yaml'
import { describe, expect, it } from 'vitest'

describe('repo-context CLI', () => {
  it('exits non-zero when sprint-status.yaml is missing', () => {
    const repoRoot = path.resolve(__dirname, '../../..')
    const scriptPath = path.join(repoRoot, 'scripts/repo-context.mjs')
    try {
      execFileSync('node', [scriptPath], {
        cwd: '/tmp',
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      })
      expect.fail('expected CLI to exit non-zero')
    } catch (err) {
      const error = err as { stderr?: string; message?: string }
      const output = error.stderr ?? error.message ?? ''
      expect(output).toContain('sprint-status.yaml')
    }
  })

  it('prints required repo bootstrap information', () => {
    const repoRoot = path.resolve(__dirname, '../../..')
    const contextPath = path.join(repoRoot, 'repo-config/agent-context.json')
    const sprintStatusPath = path.join(repoRoot, 'docs/implementation-artifacts/sprint-status.yaml')
    const context = JSON.parse(fs.readFileSync(contextPath, 'utf8')) as {
      requiredDocs: string[]
      statusSource: string
      mainBranchPolicy: string
    }
    const sprintStatus = yaml.parse(fs.readFileSync(sprintStatusPath, 'utf8'))
    const developmentStatus = sprintStatus.development_status ?? {}

    // Derive expected epic: highest in-progress epic without dedicated worktree
    const worktreesOutput = execFileSync('git', ['worktree', 'list'], {
      cwd: repoRoot,
      encoding: 'utf8'
    })
    const worktreeBranches = [
      ...worktreesOutput.matchAll(/\.worktrees\/[\w-]+\s+[\w]+\s+\[([\w/-]+)\]/g)
    ].map((m) => m[1])

    const allEpics = Object.entries(developmentStatus)
      .filter(([key]) => key.startsWith('epic-'))
      .sort(([a], [b]) => {
        const numA = parseInt(a.replace('epic-', ''), 10)
        const numB = parseInt(b.replace('epic-', ''), 10)
        return numA - numB
      })
    const expectedEpic =
      allEpics.find(([key, status]) => {
        if (status !== 'in-progress') return false
        const epicNum = key.replace('epic-', '')
        const hasWorktree = worktreeBranches.some((b) => b.includes(`epic/${epicNum}-`))
        return !hasWorktree
      })?.[0] ?? 'unknown'

    const output = execFileSync('node', ['scripts/repo-context.mjs'], {
      cwd: repoRoot,
      encoding: 'utf8'
    })

    expect(output).toContain('Repository Context')
    expect(output).toContain('Current branch:')
    expect(output).toContain('Worktrees:')
    expect(output).toContain('Required docs:')
    expect(output).toContain('Default main policy:')
    expect(output).toContain(`Current main lane: ${expectedEpic}`)
    expect(output).toContain(`Default main policy: ${context.mainBranchPolicy}`)
    expect(output).toContain('Active lane policy:')
    for (const doc of context.requiredDocs) {
      expect(output).toContain(doc)
    }
  })
})
