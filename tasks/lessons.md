# Lessons Learned

## Project: Verminal

### Code Review (2026-04-09)
**Finding:** Code review untuk Story 3.2 - awalnya men-dismiss temuan sebagai "defer", tapi ternyata ada bug fungsional serius (preload path salah).

**Rule:** Treat every code review finding as valuable advice that must be investigated. No minor suggestion is dismissed - minor suggestions are valuable edge cases. Investigate and verify every finding seriously.

**Why:** Pre-7.3 code review dismissed a finding as "defer" but it turned out to be a functional bug (wrong preload path).

---

### Quality Gates (2026-04-05)
**Rule:** WAJIB zero regresi (test suite lulus), strict TypeScript harus zero warning dan zero error, serta DILARANG melakukan push atau create PR sebelum quality gates terpenuhi (termasuk lolos CI/CD).

**Before any commit:** `npm run lint && npx tsc --noEmit && npm test && npm run build`

**Why:** Quality gates ensure no regressions, zero TypeScript errors, clean builds.

---

### Docs Folder (2026-04-05)
**Rule:** Story files di-update langsung di main repo `docs/`, tidak perlu copy ke worktree.

**Why:** docs/ di-ignore karena punya repo terpisah khusus dokumentasi internal/pengembangan.

---

### Epic 7 Worktree Execution (2026-04-09)
**Rule:** Epic 7 (Layout Persistence) HARUS di-implementasikan di worktree dedicated: `.worktrees/epic-7-worktree` branch `epic/7-layout-persistence`. TIDAK BOLEH di-implementasikan langsung di main.

**Why:** Epic execution rules dalam sprint-status.yaml mandate dedicated worktree.

**Files changed in main repo during worktree session must be explicitly committed to worktree.**

---

### Svelte 5 Testing Patterns (2026-04-09)
**Observation from Story 7.3:** When adding tests for `serializeLayoutForSave`:
- Mock `window.api` at top of test file with `vi.stubGlobal`
- When mocking modules (`vi.mock`), do it BEFORE importing the module under test
- Use dynamic `import()` in beforeEach for fresh module state

**Wrong pattern:** Import real implementation then try to mock after imports.

**Correct pattern:**
```ts
vi.stubGlobal('window', { api: { layout: { save: mockSave } } })
vi.mock('../lib/layout-serializer', () => ({
  serializeLayoutForSave: vi.fn()
}))
// THEN import the module under test
```
