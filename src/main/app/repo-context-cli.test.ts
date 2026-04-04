import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('repo-context CLI', () => {
  it('prints required repo bootstrap information', () => {
    const repoRoot = path.resolve(__dirname, '../../..')
    const contextPath = path.join(repoRoot, 'docs/implementation-artifacts/agent-context.json')
    const context = JSON.parse(fs.readFileSync(contextPath, 'utf8')) as {
      requiredDocs: string[]
      statusSource: string
      mainBranchPolicy: string
      lanes: {
        main: {
          currentEpic: string
        }
      }
    }

    const output = execFileSync('node', ['scripts/repo-context.mjs'], {
      cwd: repoRoot,
      encoding: 'utf8'
    })

    expect(output).toContain('Repository Context')
    expect(output).toContain('Current branch:')
    expect(output).toContain('Worktrees:')
    expect(output).toContain('Required docs:')
    expect(output).toContain('Default main policy:')
    expect(output).toContain('Current main lane: epic-4')
    expect(output).toContain(
      'Default main policy: On main, only continue the in-progress epic from sprint-status.yaml. Do not start worktree-only epics on main.'
    )
    for (const doc of context.requiredDocs) {
      expect(output).toContain(doc)
    }
  })
})
