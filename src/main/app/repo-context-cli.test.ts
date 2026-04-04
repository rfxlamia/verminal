import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

describe('repo-context CLI', () => {
  it('prints required repo bootstrap information', () => {
    const repoRoot = path.resolve(__dirname, '../../..')

    const output = execFileSync('node', ['scripts/repo-context.mjs'], {
      cwd: repoRoot,
      encoding: 'utf8'
    })

    expect(output).toContain('Repository Context')
    expect(output).toContain('Current branch:')
    expect(output).toContain('Worktrees:')
    expect(output).toContain('Required docs:')
    expect(output).toContain('docs/implementation-artifacts/sprint-status.yaml')
    expect(output).toContain('AGENTS.md')
    expect(output).toContain('CLAUDE.md')
    expect(output).toContain('GEMINI.md')
  })
})
