import fs from 'node:fs'
import os from 'node:os'
import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

describe('repo-context CLI', () => {
  it('prints required repo bootstrap information', () => {
    const repoRoot = path.resolve(__dirname, '../../..')
    const contextDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verminal-repo-context-'))
    const contextPath = path.join(contextDir, 'agent-context.json')
    const bootstrapContext = {
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

    fs.writeFileSync(contextPath, JSON.stringify(bootstrapContext, null, 2))

    try {
      const output = execFileSync('node', ['scripts/repo-context.mjs'], {
        cwd: repoRoot,
        env: {
          ...process.env,
          REPO_CONTEXT_BOOTSTRAP_PATH: contextPath
        },
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
    } finally {
      fs.rmSync(contextDir, { recursive: true, force: true })
    }
  })
})
