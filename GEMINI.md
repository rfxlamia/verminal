# GEMINI.md

This file provides guidance to Gemini agents when working with code in this repository.

## Execution Status And Bootstrap

- Current execution status lives in `docs/implementation-artifacts/sprint-status.yaml`
- Before any non-trivial work, read AGENTS.md, CLAUDE.md, and GEMINI.md from the repo root even if they were not injected into session header context
- Run `npm run repo:context` to see current branch, worktrees, active lane guidance, and required docs
- If you are on `main`, only continue the in-progress epic from `sprint-status.yaml`
- Do not start worktree-scoped parallel epic work on `main`

## Project Overview

**Verminal** is a tiling terminal emulator built with Electron, Svelte 5, and TypeScript. It provides an intuitive, context-aware workspace for developers with features like auto-tiling layouts, Focus Mode, Super Handler (contextual file browser), and Pane Naming with color tags.

- **Phase**: implementation in progress; consult sprint-status.yaml for live epic/story state
- **Target Platforms**: Linux (Ubuntu 20.04+, Debian, Arch) and macOS (13 Ventura+)
- **License**: Apache 2.0

## Technology Stack

| Layer             | Technology                                                       |
| ----------------- | ---------------------------------------------------------------- |
| Desktop Runtime   | Electron + electron-vite                                         |
| Frontend          | Svelte 5 (runes-based) + TypeScript                              |
| PTY Engine        | node-pty                                                         |
| Terminal Renderer | @xterm/xterm + addons (fit, webgl, search, web-links, unicode11) |
| Config/Layout     | smol-toml (deterministic TOML)                                   |
| UI Components     | bits-ui (shadcn-svelte foundation)                               |
| Testing           | Vitest (unit) + Playwright (E2E)                                 |
| Packaging         | electron-builder                                                 |

````

## Architecture Decisions

### Process Architecture
- **main**: Node.js process (PTY, filesystem, OS integration)
- **preload**: Context bridge (typed IPC API only)
- **renderer**: Svelte UI (workspace, overlays, terminal views)
- **shared**: Pure types/constants (no Electron/DOM imports)

### IPC Patterns
All IPC uses typed contracts via `src/shared/ipc-contract.ts`:

**Request/Response** (`invoke`):
- `layout:save`, `layout:load`, `layout:list`, `layout:delete`
- `config:read`, `config:write`
- `pty:spawn`, `pty:kill`, `shell:detect`
- `fs:listDir`, `fs:getCwd`
- `app:getVersion`, `app:getPaths`

**Push Streaming** (main → renderer):
- `pty:data` (buffered ~8ms in main process)
- `pty:exit`

**Fire-and-Forget** (`send`):
- `pty:write`, `pty:resize`

### Response Format
All invoke responses use discriminated union:
```ts
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };
````

### State Ownership

- **Renderer** is source-of-truth for workspace state
- **Split state model**:
  - `LayoutState` (serializable): layout name, panes array
  - `WorkspaceUIState` (ephemeral): focused pane ID, focus mode flag

### Session Identity

- Sequential integer IDs (not UUID) for sessions and panes
- Pane ID counter lives in `layout-store.ts`, only `createPane()` can increment

### Security Boundary

- `contextIsolation: true`
- `nodeIntegration: false` in renderer
- All OS/file/PTY access via preload contextBridge only
- Renderer never touches Node API directly

### Persistence Rules

- Config location: `~/.verminal/` (resolved via `app.getPath('home')`, never literal `~`)
- Atomic writes: write to temp → flush → atomic rename
- TOML format only, deterministic ordering for git-friendly diffs

## Naming Conventions

| Category            | Pattern                                                       |
| ------------------- | ------------------------------------------------------------- |
| IPC channels        | `domain:action` (kebab-case) e.g., `pty:spawn`, `layout:save` |
| Types/Interfaces    | PascalCase (`PaneState`, `PTYManager`)                        |
| Functions/Variables | camelCase (`spawnPty`, `focusedPaneId`)                       |
| Constants           | UPPER_SNAKE_CASE (`MAX_PANES`)                                |
| Svelte components   | PascalCase (`PaneContainer.svelte`)                           |
| TS modules          | kebab-case (`pty-manager.ts`)                                 |
| TOML keys           | snake_case                                                    |

## Critical Implementation Rules

1. **No exceptions across IPC boundary** for business errors - use `Result<T>`
2. **Always unregister listeners** - `onData`/`onExit` must return cleanup function
3. **No tilde literal paths** - always resolve via `app.getPath('home')`
4. **Buffer pty:data** - ~8ms window in main process before push to renderer
5. **No serialize ephemeral state** - `isFocusMode`, `focusedPaneId` never go to TOML
6. **Pane ID ownership** - only `createPane()` in layout store can generate IDs
7. **Slugify snapshot names** - lowercase, spaces to `-`, strip non-alphanumeric

## Error Handling Layers

- **App error**: Display in status bar or help surface (not in terminal stream)
- **PTY runtime error**: Handle in PTY manager, emit to renderer
- **Shell/process error**: Normal terminal output (user sees in pane)
- **Config/layout error**: `Result<T>` with machine-readable code + user-facing message

## Accessibility Requirements

- 100% keyboard navigable (no mouse required for core flows)
- Status bar always visible with shortcut hints
- Focus indicator: min 2px border, 3:1 contrast
- WCAG AA contrast for color tags (4.5:1)
- Respect `prefers-reduced-motion` for Focus Mode animations

## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy to keep main context window clean

- **ALWAYS** load delegate skill before spawn any subagents
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: update 'tasks/lessons.md' with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests -> then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to 'tasks/todo.md' with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review to 'tasks/todo.md'
6. **Capture Lessons**: Update 'tasks/lessons.md' after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
