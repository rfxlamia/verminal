# Active Lanes

## Source Of Truth

- Live execution status: `docs/implementation-artifacts/sprint-status.yaml`
- Bootstrap context: `repo-config/agent-context.json`

## Lane: main

- Branch: `main`
- Current epic: `epic-4`
- Allowed work: continue Epic 4 stories already represented in sprint status
- Disallowed work: Do not start Epic 5 on main

## Lane: epic-5-worktree

- Branch pattern: `epic/5-*`
- Current epic: `epic-5`
- Status: planned
- Entry condition: only start after branch/worktree is created
- Default write-set:
  - `src/renderer/src/components/workspace/PaneHeader.svelte`
  - `src/renderer/src/components/workspace/PaneContainer.svelte`
  - `src/renderer/src/stores/layout-store.svelte.ts`
