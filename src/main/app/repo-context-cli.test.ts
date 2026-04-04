import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('repo-context CLI', () => {
  it('exits non-zero when agent-context.json is missing', () => {
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
      expect(output).toContain('agent-context.json')
    }
  })

  it('prints required repo bootstrap information', () => {
    const repoRoot = path.resolve(__dirname, '../../..')
    const contextPath = path.join(repoRoot, 'repo-config/agent-context.json')
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
    expect(output).toContain(`Current main lane: ${context.lanes.main.currentEpic}`)
    expect(output).toContain(`Default main policy: ${context.mainBranchPolicy}`)
    expect(output).toContain('Active lane policy:')
    for (const doc of context.requiredDocs) {
      expect(output).toContain(doc)
    }
  })
})
