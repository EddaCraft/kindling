# PLAN_NEXT.md

## Kindling OSS v0.1 – Local Memory & Continuity Engine

### Problem & Success Criteria

**Problem**
AI-assisted development produces large volumes of transient activity (tool calls, diffs, agent runs) but loses context between sessions. Developers and local agents repeatedly re-discover the same information, leading to wasted time, architectural drift, and brittle workflows.

**Why this work matters**
Kindling provides _continuity without judgement_. It captures what happened, preserves provenance, and makes context retrievable in a deterministic, explainable way, without asserting organisational truth or governance.

**System context**
Kindling is the observability and capture layer in a broader architecture (see `docs/system-spec.md`). The orchestration layer (vendored PocketFlow) mediates agents and the memory stack. Downstream systems handle interpretation, knowledge curation, and policy. Kindling OSS v0.1 is independently useful as a standalone tool with its built-in mechanical retrieval layer.

**Non-goals (explicit)**

- Kindling does **not** decide what memory is authoritative
- Kindling does **not** promote or curate institutional memory
- Kindling does **not** manage organisational lifecycle, conflict resolution, or approval workflows
- Kindling does **not** generate summaries, infer intent, or perform ranked/budgeted context assembly
- Kindling does **not** define retention policy (it implements retention mechanisms)

Those concerns belong to downstream systems and are intentionally out of scope for OSS v0.1.

**Success Criteria**

- A developer can resume work without re-explaining repo context
- Retrieval results are deterministic, scoped, and explainable
- All retrieved context can point to concrete evidence (files, diffs, commands, outputs)
- Kindling can be embedded and run locally with no external services
- The project is safe to open-source under Apache-2.0

---

## System Map

- `kindling-core` → depends on → `kindling-store-sqlite`
- `kindling-core` → depends on → `kindling-provider-local`
- `kindling-adapter-opencode` → depends on → `kindling-core`
- `kindling-adapter-pocketflow` → depends on → `kindling-core`
- `kindling-adapter-claude-code` → depends on → `kindling-core`
- `kindling-cli` → depends on → `kindling-core`

---

## Milestones

### M1: Kindling OSS Scaffolding

- Public repository created (`kindling`)
- Package boundaries enforced (core / store / provider / adapters)
- Architecture, data model, and retrieval contract docs published

**Status:** Complete

**Target:** Repo builds, types compile, no runtime behaviour required

### M2: Local Capture + Continuity (OpenCode)

- Observation ingestion via OpenCode adapter
- Session capsules (open/close)
- SQLite-backed system of record
- Local retrieval provider (FTS + recency)
- `/memory` command surface

**Status:** Complete

**Target:** End-to-end local memory works in OpenCode

### M3: High-Signal Workflows (PocketFlow)

- PocketFlow adapter (vendored or dependency)
- Node-level capsules with intent hints
- Structured evidence capture

**Status:** Complete

**Target:** Workflow-driven capsules outperform heuristic session summaries

### M4: OSS Hardening

- Redaction + pinning semantics
- Export/import
- Minimal CLI for inspection, debugging, and standalone use
- Documentation polish (README, examples)

**Status:** Complete

**Target:** Safe, understandable OSS v0.1 release

### M5: Quick-Start Plugins (NEW)

- Claude Code plugin (zero-install, git clone)
- OpenCode plugin (same UX)
- CLI `init` command (one-liner setup)
- CLI `serve` command (API server)
- Compelling use cases and documentation

**Status:** In Progress

**Target:** New user can get value in < 2 minutes without writing code

### M6: Standard Adapter Framework

- Base adapter interface and abstract class in `kindling-core`
- Standard event model (`AdapterEvent`) for platform-agnostic ingestion
- Shared event receiver (HTTP, stdin, file watch modes)
- Platform adapters as thin wrappers (Claude Code, Cursor, Aider, etc.)
- Adapter development documentation

**Status:** Planned

**Target:** Adding a new platform adapter requires minimal code (event mapping + content formatting only)

---

## Modules

### kindling-core

- **Path:** ./modules/kindling-core.aps.md
- **Scope:** KINDLING
- **Owner:** @aneki
- **Status:** Implemented
- **Priority:** high
- **Tags:** memory, domain, core
- **Dependencies:** kindling-store-sqlite, kindling-provider-local

### kindling-store-sqlite

- **Path:** ./modules/kindling-store-sqlite.aps.md
- **Scope:** STORAGE
- **Owner:** @aneki
- **Status:** Implemented
- **Priority:** high
- **Tags:** sqlite, persistence
- **Dependencies:** (none)

### kindling-provider-local

- **Path:** ./modules/kindling-provider-local.aps.md
- **Scope:** RETRIEVAL
- **Owner:** @aneki
- **Status:** Implemented
- **Priority:** high
- **Tags:** search, fts
- **Dependencies:** kindling-store-sqlite

### kindling-adapter-opencode

- **Path:** ./modules/kindling-adapter-opencode.aps.md
- **Scope:** ADAPTER
- **Owner:** @aneki
- **Status:** Implemented
- **Priority:** high
- **Tags:** opencode, ingestion
- **Dependencies:** kindling-core

### kindling-adapter-pocketflow

- **Path:** ./modules/kindling-adapter-pocketflow.aps.md
- **Scope:** ADAPTER
- **Owner:** @aneki
- **Status:** Implemented
- **Priority:** medium
- **Tags:** pocketflow, workflows
- **Dependencies:** kindling-core

### kindling-cli

- **Path:** ./modules/kindling-cli.aps.md
- **Scope:** CLI
- **Owner:** @aneki
- **Status:** Implemented
- **Priority:** medium
- **Tags:** cli, tooling, debugging
- **Dependencies:** kindling-core

### kindling-adapter-claude-code

- **Path:** ./modules/kindling-adapter-claude-code.aps.md
- **Scope:** ADAPTER-CC
- **Owner:** @aneki
- **Status:** Implemented
- **Priority:** high
- **Tags:** claude-code, hooks, ingestion, dogfooding
- **Dependencies:** kindling-core

### kindling-adapter-framework

- **Path:** ./modules/kindling-adapter-framework.aps.md
- **Scope:** ADAPTER
- **Owner:** @aneki
- **Status:** Planned
- **Priority:** medium
- **Tags:** adapter, framework, integration
- **Dependencies:** kindling-core

### kindling-plugin-claude-code

- **Path:** ./modules/kindling-plugin-claude-code-v2.aps.md
- **Scope:** PLUGIN-CC
- **Owner:** @aneki
- **Status:** Needs Rework
- **Priority:** critical
- **Tags:** plugin, claude-code, quick-start, zero-config
- **Dependencies:** (none - self-contained)

### kindling-plugin-opencode

- **Path:** ./modules/kindling-plugin-opencode.aps.md
- **Scope:** PLUGIN-OC
- **Owner:** @aneki
- **Status:** Draft
- **Priority:** high
- **Tags:** plugin, opencode, quick-start, zero-config
- **Dependencies:** kindling-plugin-claude-code (shared patterns)

### kindling-cli-quickstart

- **Path:** ./modules/kindling-cli-quickstart.aps.md
- **Scope:** CLI-QS
- **Owner:** @aneki
- **Status:** Complete: 2025-01-29
- **Priority:** medium
- **Tags:** cli, init, serve, quick-start
- **Dependencies:** kindling-cli, kindling-api-server

### npm-publishing

- **Path:** ./modules/npm-publishing.aps.md
- **Scope:** NPM
- **Owner:** @aneki
- **Status:** Planned
- **Priority:** high
- **Tags:** npm, publishing, release, oss
- **Dependencies:** (all packages)

### kindling-api-server

- **Path:** ./modules/kindling-api-server.aps.md
- **Scope:** API
- **Owner:** @aneki
- **Status:** Implemented
- **Priority:** medium
- **Tags:** api, server, http
- **Dependencies:** kindling-core

### kindling-store-sqljs

- **Path:** ./modules/kindling-store-sqljs.aps.md
- **Scope:** STORAGE
- **Owner:** @aneki
- **Status:** Implemented
- **Priority:** low
- **Tags:** sqlite, wasm, browser
- **Dependencies:** (none)

### kindling-dx-hardening

- **Path:** ./modules/kindling-dx-hardening.aps.md
- **Scope:** DX
- **Owner:** @aneki
- **Status:** Ready
- **Priority:** high
- **Tags:** dx, hardening, quality, integration
- **Dependencies:** kindling-core, kindling-store-sqlite, kindling-provider-local

---

## Decisions

- **D-001:** Kindling is an infrastructure project; it captures context but does not assert truth
- **D-002:** SQLite is the default embedded system of record as it is deterministic, portable, auditable
- **D-003:** Retrieval must be deterministic and explainable
- **D-004:** All governance, promotion, and lifecycle logic is explicitly out of scope for Kindling OSS
- **D‑005:** Providers are accelerators, never sources of truth. This preserves provenance
- **D-006:** A minimal CLI ships in v0.1 to enable inspection, debugging, export/import, and use without adapters
- **D-007:** Summary generation is a downstream system responsibility. Kindling can store summaries on behalf of downstream systems but does not generate them. Raw observations are retained by default
- **D-008:** DB location is configurable. Default is `~/.kindling/kindling.db` (or platform equivalent), with support for per-repo paths and explicit overrides
- **D-009:** Capsules auto-close when the source provides a natural end signal (e.g. session end, workflow node end). Otherwise, explicit close is required, with a safety timeout for inactivity
- **D-010:** Promotion and MemoryObjects are out of scope for Kindling OSS v0.1; pins are stored on behalf of downstream systems as a convenience for standalone use
- **D-011:** Platform adapters follow a standard contract (`BaseSessionAdapter`) to minimize per-platform code. Platform-specific logic is limited to event mapping and content formatting. Intent inference is not part of the adapter contract.

---

## Open Questions

_No open questions at this time._

---

## What's Next

**M1-M4: Complete.** All core packages (core, store-sqlite, provider-local, adapter-opencode, adapter-pocketflow, adapter-claude-code, cli) are implemented, building, and passing 596 tests.

**M5 Progress:**

| Deliverable        | Status       | Next Action                                                                    |
| ------------------ | ------------ | ------------------------------------------------------------------------------ |
| Claude Code plugin | Needs Rework | Fix plugin format, wire to SQLite engine, add context injection (PLUGIN-CC-V2) |
| CLI `serve`        | Complete     | —                                                                              |
| CLI `init`         | Complete     | —                                                                              |
| OpenCode plugin    | Draft        | Ready to start                                                                 |

**Critical Path:**

1. **npm-publishing** — All packages are buildable and tested but not yet published to npm. This is the next critical step for OSS v0.1 release.
2. **PLUGIN-OC-001:** Research OpenCode extension system
   - Research how OpenCode extensions work
   - Document event model and hook points
   - Plan shared patterns with Claude Code plugin
