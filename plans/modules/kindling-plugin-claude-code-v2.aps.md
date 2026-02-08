# Kindling Claude Code Plugin v2

| Scope     | Owner  | Priority | Status |
| --------- | ------ | -------- | ------ |
| PLUGIN-CC | @aneki | critical | Ready  |

## Purpose

Fix the existing Claude Code plugin at `plugins/kindling-claude-code/` which is broken in production. Three critical failures:

1. **Wrong plugin format** -- uses `plugin.json` at root instead of the official `.claude-plugin/plugin.json` + `hooks/hooks.json` structure
2. **Disconnected from monorepo engine** -- uses flat JSON files (`observations.jsonl`, `capsules.json`, `pins.json`) instead of the SQLite/FTS5 engine that the rest of Kindling provides
3. **No automatic context injection** -- sessions start cold with no prior context, defeating the core value proposition ("remember what you built yesterday")

Additional issues discovered:

- Slash commands use non-standard frontmatter (`arguments` with `name`/`description`/`required` instead of `argument-hint`)
- `require()` calls in ESM context (commands embed `node -e` with `require` but `package.json` is `type: module`)
- No per-project isolation (all projects share `~/.kindling/`)
- `capsules.json` has write contention (full read-parse-modify-write on every observation)
- `observations.jsonl` grows unbounded with no rotation or cleanup
- No `UserPromptSubmit` hook
- No TTL on pins
- README install instructions clone the entire monorepo into the plugins directory

This module replaces the v1 plan with a focused rework that fixes the plugin format, wires it to the real engine, and adds context injection.

## In Scope

- Fix plugin directory structure to match official Claude Code plugin format
- Wire hooks and commands to `@kindling/store-sqlite` and `@kindling/provider-local`
- Automatic context injection on SessionStart
- Fix ESM/CJS issues in slash command scripts
- Per-project database isolation (scope by cwd/repoId)
- Proper install story (no monorepo clone)
- `/memory forget` command and TTL support for pins

## Out of Scope

- OpenCode plugin (separate module: kindling-plugin-opencode)
- Multi-user or cloud sync
- Adapter framework refactoring (separate module: kindling-adapter-framework)
- New observation kinds beyond what Claude Code hooks provide
- Plugin marketplace submission (future work)

## Interfaces

**Depends on:**

- `@kindling/core` -- KindlingService API for capsule lifecycle and retrieval
- `@kindling/store-sqlite` -- SQLite persistence with FTS5
- `@kindling/provider-local` -- FTS-based retrieval with ranking
- Claude Code plugin system -- `.claude-plugin/` format, hooks, slash commands

**Exposes:**

- Claude Code plugin directory installable via git clone or npm
- Hook handlers for SessionStart, PostToolUse, Stop, UserPromptSubmit
- Slash commands: `/memory search`, `/memory status`, `/memory pin`, `/memory pins`, `/memory unpin`, `/memory forget`
- Configuration for database path and filtering rules

## Boundary Rules

- Plugin hooks must use `@kindling/core` API; no direct SQLite access from hook scripts
- Plugin must remain installable without running `pnpm install` in the monorepo root (bundled or pre-compiled JS)
- All observations must include provenance pointing to concrete evidence
- Per-project isolation is mandatory; no cross-project data leakage by default
- Context injection on SessionStart must be opt-in configurable

## Plugin Structure (Target)

```
plugins/kindling-claude-code/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest (official format)
├── hooks/
│   ├── hooks.json               # Hook definitions
│   ├── session-start.js         # Opens capsule, injects context
│   ├── post-tool-use.js         # Captures observations
│   ├── user-prompt-submit.js    # Captures user messages
│   ├── stop.js                  # Closes capsule with summary
│   └── lib/
│       ├── store.js             # Store initialization (wraps @kindling/store-sqlite)
│       ├── service.js           # KindlingService initialization
│       ├── filter.js            # Secret filtering
│       └── mapping.js           # Event mapping
├── commands/
│   ├── memory-search.md         # /memory search <query>
│   ├── memory-status.md         # /memory status
│   ├── memory-pin.md            # /memory pin [note]
│   ├── memory-pins.md           # /memory pins
│   ├── memory-unpin.md          # /memory unpin <id>
│   └── memory-forget.md         # /memory forget <id>
├── dist/                        # Bundled JS (esbuild output)
│   └── kindling-bundle.cjs      # Single CJS bundle of core+store+provider
├── package.json
├── README.md
└── scripts/
    └── build-bundle.js          # Build script for dist/
```

## Ready Checklist

Change status to **Ready** when:

- [x] Purpose and scope are clear
- [x] Critical failures documented
- [x] Plugin target structure designed
- [x] All tasks defined with validation
- [x] Dependencies identified

## Tasks

### PLUGIN-CC-V2-001: Fix plugin directory structure

- **Status:** Ready
- **Intent:** Restructure plugin to match the official Claude Code plugin format so it is recognized and loaded correctly
- **Expected Outcome:** Plugin loads in Claude Code without errors; hooks fire on the correct events; commands appear in the slash command list
- **Scope:** `plugins/kindling-claude-code/`
- **Non-scope:** Hook logic, command logic, storage layer
- **Files:** `.claude-plugin/plugin.json`, `hooks/hooks.json`, `commands/*.md` (frontmatter fixes)
- **Dependencies:** (none)
- **Validation:** Plugin appears in Claude Code plugin list; verify structure matches official plugins at `~/.claude/plugins/marketplaces/`
- **Confidence:** high

**Deliverables:**

- Create `.claude-plugin/plugin.json` with proper metadata fields
- Move hook definitions to `hooks/hooks.json` with correct event-to-script mappings
- Remove root `plugin.json`
- Fix all command frontmatter to use `argument-hint` instead of `arguments` with `name`/`description`/`required`
- Verify against the structure of official installed plugins

### PLUGIN-CC-V2-002: Wire plugin to monorepo SQLite engine

- **Status:** Ready
- **Intent:** Replace flat JSON file storage with the actual `@kindling/store-sqlite` and `@kindling/provider-local` packages so the plugin benefits from FTS5 search, WAL mode, and proper data management
- **Expected Outcome:** All observations stored in SQLite via the KindlingService API; FTS5 search returns ranked results; no more JSON file contention
- **Scope:** `plugins/kindling-claude-code/hooks/lib/`, `plugins/kindling-claude-code/dist/`
- **Non-scope:** Changing the hook handler interfaces (those are fixed by PLUGIN-CC-V2-001)
- **Files:** `hooks/lib/store.js`, `hooks/lib/service.js`, `dist/kindling-bundle.cjs`, `scripts/build-bundle.js`
- **Dependencies:** PLUGIN-CC-V2-001
- **Validation:** `node -e "const s = require('./dist/kindling-bundle.cjs'); console.log(typeof s.KindlingService)"` prints `function`; observation insert and FTS query round-trip succeeds
- **Confidence:** medium
- **Risks:** Native `better-sqlite3` binding may not work in all environments; may need sql.js fallback

**Decision required:** Bundle compiled JS into plugin (esbuild single-file CJS) vs require users to run `npm install`. Recommendation: bundle with esbuild, include `better-sqlite3` as optional peer dependency.

**Deliverables:**

- `scripts/build-bundle.js` using esbuild to produce `dist/kindling-bundle.cjs`
- `hooks/lib/store.js` -- initializes `SqliteKindlingStore` with per-project DB path
- `hooks/lib/service.js` -- initializes `KindlingService` with store and provider
- Remove `hooks/lib/db.js` (old flat-file implementation)
- Remove `~/.kindling/observations.jsonl`, `capsules.json`, `pins.json` dependency

### PLUGIN-CC-V2-003: Add mechanical context injection on session start

- **Status:** Ready
- **Intent:** On SessionStart, dump recent prior observations for the current project so new sessions start warm instead of cold
- **Expected Outcome:** When a Claude Code session begins, the plugin queries previous session observations scoped to the current repo/project and outputs them via the hook output mechanism
- **Scope:** `plugins/kindling-claude-code/hooks/`
- **Non-scope:** Ranked/budgeted context assembly (downstream system responsibility)
- **Files:** `hooks/session-start.js`, `hooks/lib/service.js`
- **Dependencies:** PLUGIN-CC-V2-002
- **Validation:** Start a new Claude Code session in a project with prior observations; verify injected context appears in the session; verify no injection when disabled via config
- **Confidence:** medium
- **Risks:** Context injection point in Claude Code hooks may have output format constraints; injected context may be too large or too noisy

**Deliverables:**

- Update `hooks/session-start.js` to call `service.retrieve()` scoped to current cwd/repoId (mechanical BM25 + recency)
- Format retrieved context as structured markdown suitable for Claude Code consumption
- Add configuration toggle (`KINDLING_INJECT_CONTEXT=true|false`, default `true`)
- Add configurable max result count
- Handle graceful fallback when no prior context exists

> **Boundary note:** This is a mechanical session-start context dump (temporal, not ranked). Intelligent context assembly belongs to downstream systems.

### PLUGIN-CC-V2-004: Fix command implementations

- **Status:** Ready
- **Intent:** Fix broken slash commands so they work correctly with the new SQLite-backed storage and follow Claude Code command format conventions
- **Expected Outcome:** All `/memory` commands execute without ESM/CJS errors and return results from the SQLite store; new `/memory forget` command available; pins support TTL
- **Scope:** `plugins/kindling-claude-code/commands/`
- **Non-scope:** New command types beyond search/status/pin/unpin/forget
- **Files:** `commands/memory-search.md`, `commands/memory-status.md`, `commands/memory-pin.md`, `commands/memory-pins.md`, `commands/memory-unpin.md`, `commands/memory-forget.md`
- **Dependencies:** PLUGIN-CC-V2-002
- **Validation:** Each command executes without error; `/memory search "test"` returns FTS-ranked results; `/memory forget` removes target observation
- **Confidence:** high

**Deliverables:**

- Fix ESM/CJS mismatch: use CJS-compatible invocation or reference the bundled `dist/kindling-bundle.cjs`
- Wire all commands to use `KindlingService` instead of flat file reads
- Add `/memory forget <id>` command to delete specific observations
- Add TTL support to `/memory pin` (optional duration parameter)
- Verify frontmatter uses `argument-hint` format (coordinated with PLUGIN-CC-V2-001)

### PLUGIN-CC-V2-005: Add per-project isolation and install story

- **Status:** Ready
- **Intent:** Ensure each project gets its own database and provide a clean install path that does not require cloning the entire monorepo
- **Expected Outcome:** Projects do not share observation data by default; new users can install the plugin with a single command; configuration is documented
- **Scope:** `plugins/kindling-claude-code/`
- **Non-scope:** npm publishing of the plugin as a standalone package (future work)
- **Files:** `hooks/lib/store.js`, `README.md`, `package.json`
- **Dependencies:** PLUGIN-CC-V2-002
- **Validation:** Two separate projects produce separate databases; `ls ~/.kindling/` shows per-project subdirectories or per-project DB files; README install instructions work from a clean state
- **Confidence:** high

**Deliverables:**

- Scope database path by project: `~/.kindling/projects/<repo-hash>/kindling.db` or `<cwd>/.kindling/kindling.db`
- Update `hooks/lib/store.js` to derive project-scoped DB path from `cwd` or git remote
- Fix README install instructions: provide git clone of plugin directory only (sparse checkout or subtree) or npm install path
- Document configuration options: `KINDLING_DB_PATH`, `KINDLING_INJECT_CONTEXT`, `KINDLING_PROJECT_SCOPE`
- Add `.gitignore` entry recommendation for `.kindling/` in project roots

## Decisions

- **D-001:** Supersedes v1 plan. The v1 plugin (Complete: 2025-01-29) is broken in production and must be reworked
- **D-002:** Plugin uses bundled CJS output (esbuild) to avoid requiring `npm install` in the monorepo
- **D-003:** Per-project isolation is the default; global storage is opt-in
- **D-004:** Context injection on SessionStart is opt-in (enabled by default, configurable)
- **D-005:** Flat JSON storage (`observations.jsonl`, `capsules.json`, `pins.json`) is replaced entirely by SQLite
- **D-006:** All slash commands use `argument-hint` frontmatter format per Claude Code spec

## Risks & Mitigations

| Risk                                                            | Mitigation                                                                         |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Native `better-sqlite3` may not work in all plugin environments | Bundle sql.js (WASM) as fallback; detect at runtime                                |
| Claude Code plugin format may change                            | Keep `.claude-plugin/plugin.json` minimal; test against installed official plugins |
| Bundled JS may be too large for plugin directory                | Tree-shake aggressively with esbuild; measure bundle size                          |
| Context injection may produce noisy or oversized output         | Configurable max size; relevance threshold; opt-in toggle                          |
| Per-project DB paths may conflict with existing global data     | Migration path: detect old global data, offer import                               |
| Hook output format constraints for context injection            | Test against actual Claude Code hook runner; document limitations                  |

## Notes

- The existing v1 plugin at `plugins/kindling-claude-code/` has the file listing to rework in place
- Claude Code plugin format reference: official plugins at `~/.claude/plugins/marketplaces/`
- Claude Code hooks documentation: https://docs.anthropic.com/en/docs/claude-code/hooks
- The adapter at `packages/kindling-adapter-claude-code/` is a separate TypeScript library; this plugin is the user-facing installable artifact
- Consider aligning with the adapter framework (M6) once that module is ready
