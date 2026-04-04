import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '../../..')
const docs = ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md']

describe('root guidance files', () => {
  for (const doc of docs) {
    it(`${doc} points agents to the live execution status`, () => {
      const content = fs.readFileSync(path.join(repoRoot, doc), 'utf8')

      expect(content).toContain('docs/implementation-artifacts/sprint-status.yaml')
      expect(content).toContain('npm run repo:context')
      expect(content).toContain('read AGENTS.md, CLAUDE.md, and GEMINI.md')
      expect(content).toContain('repo-config/active-lanes.md')
      // Stale text must be gone
      expect(content).not.toContain('implementation not yet started')
      // Replacement text must be present (proves the edit happened, not just removal)
      expect(content).toContain('implementation in progress')
    })
  }

  it('active-lanes documents main and planned worktree lanes', () => {
    const content = fs.readFileSync(path.join(repoRoot, 'repo-config/active-lanes.md'), 'utf8')

    expect(content).toContain('main')
    expect(content).toContain('epic-4')
    expect(content).toContain('Epic 5')
    expect(content).toContain('Do not start Epic 5 on main')
  })
})
