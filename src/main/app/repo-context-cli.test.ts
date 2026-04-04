import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('repo-context CLI', () => {
  it('prints required repo bootstrap information', () => {
    const repoRoot = path.resolve(__dirname, '../../..')
    const contextPath = path.join(repoRoot, 'docs/implementation-artifacts/agent-context.json')
    const originalContext = fs.readFileSync(contextPath, 'utf8')
    const controlledContext = {
      requiredDocs: [
        'docs/implementation-artifacts/sprint-status.yaml',
        'AGENTS.md',
        'CLAUDE.md',
        'GEMINI.md'
      ],
      statusSource: 'docs/implementation-artifacts/sprint-status.yaml',
      mainBranchPolicy: 'use the current checked-out branch as the active main lane',
      lanes: {
        main: {
          currentEpic: 'epic-4'
        }
      }
    }

    fs.writeFileSync(contextPath, JSON.stringify(controlledContext, null, 2))

    try {
      const output = execFileSync('node', ['scripts/repo-context.mjs'], {
        cwd: repoRoot,
        encoding: 'utf8'
      })

      expect(output).toContain('Repository Context')
      expect(output).toContain('Current branch:')
      expect(output).toContain('Worktrees:')
      expect(output).toContain('Required docs:')
      for (const doc of controlledContext.requiredDocs) {
        expect(output).toContain(doc)
      }
    } finally {
      fs.writeFileSync(contextPath, originalContext)
    }
  })
})
