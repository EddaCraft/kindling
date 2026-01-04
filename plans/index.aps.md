# PLAN_NEXT.md

## Kindling OSS v0.1 – Local Memory & Continuity Engine

### Problem & Success Criteria

**Problem**
AI-assisted development produces large volumes of transient activity (tool calls, diffs, agent runs) but loses context between sessions. Developers and local agents repeatedly re-discover the same information, leading to wasted time, architectural drift, and brittle workflows.

**Why this work matters**
Kindling provides *continuity without judgement*. It captures what happened, preserves provenance, and makes context retrievable in a deterministic, explainable way, without asserting organisational truth or governance.

**Non-goals (explicit)**

* Kindling does **not** decide what memory is authoritative
* Kindling does **not** promote or curate institutional memory
* Kindling does **not** manage organisational lifecycle, conflict resolution, or approval workflows

Those concerns belong to downstream systems (e.g. Edda) and are intentionally out of scope for OSS v0.1.

**Success Criteria**

* A developer can resume work without re-explaining repo context
* Retrieval results are deterministic, scoped, and explainable
* All retrieved context can point to concrete evidence (files, diffs, commands, outputs)
* Kindling can be embedded and run locally with no external services
* The project is safe to open-source under Apache-2.0

---

## System Map

* `kindling-core` → depends on → `kindling-store-sqlite`
* `kindling-core` → depends on → `kindling-provider-local`
* `kindling-adapter-opencode` → depends on → `kindling-core`
* `kindling-adapter-pocketflow` → depends on → `kindling-core`
* `kindling-cli` → depends on → `kindling-core`

---

## Milestones

### M1: Kindling OSS Scaffolding

* Public repository created (`kindling`)
* Package boundaries enforced (core / store / provider / adapters)
* Architecture, data model, and retrieval contract docs published

**Target:** Repo builds, types compile, no runtime behaviour required

### M2: Local Capture + Continuity (OpenCode)

* Observation ingestion via OpenCode adapter
* Session capsules (open/close)
* SQLite-backed system of record
* Local retrieval provider (FTS + recency)
* `/memory` command surface

**Target:** End-to-end local memory works in OpenCode

### M3: High-Signal Workflows (PocketFlow)

* PocketFlow adapter (vendored or dependency)
* Node-level capsules with intent hints
* Structured evidence capture

**Target:** Workflow-driven capsules outperform heuristic session summaries

### M4: OSS Hardening

* Redaction + pinning semantics
* Export/import
* Minimal CLI for inspection, debugging, and standalone use
* Documentation polish (README, examples)

**Target:** Safe, understandable OSS v0.1 release

---

## Modules

### kindling-core

* **Path:** ./modules/kindling-core.aps.md
* **Scope:** KINDLING
* **Owner:** @aneki
* **Status:** Draft
* **Priority:** high
* **Tags:** memory, domain, core
* **Dependencies:** kindling-store-sqlite, kindling-provider-local

### kindling-store-sqlite

* **Path:** ./modules/kindling-store-sqlite.aps.md
* **Scope:** STORAGE
* **Owner:** @aneki
* **Status:** Draft
* **Priority:** high
* **Tags:** sqlite, persistence
* **Dependencies:** (none)

### kindling-provider-local

* **Path:** ./modules/kindling-provider-local.aps.md
* **Scope:** RETRIEVAL
* **Owner:** @aneki
* **Status:** Draft
* **Priority:** high
* **Tags:** search, fts
* **Dependencies:** kindling-store-sqlite

### kindling-adapter-opencode

* **Path:** ./modules/kindling-adapter-opencode.aps.md
* **Scope:** ADAPTER
* **Owner:** @aneki
* **Status:** Draft
* **Priority:** high
* **Tags:** opencode, ingestion
* **Dependencies:** kindling-core

### kindling-adapter-pocketflow

* **Path:** ./modules/kindling-adapter-pocketflow.aps.md
* **Scope:** ADAPTER
* **Owner:** @aneki
* **Status:** Draft
* **Priority:** medium
* **Tags:** pocketflow, workflows
* **Dependencies:** kindling-core

### kindling-cli

* **Path:** ./modules/kindling-cli.aps.md
* **Scope:** CLI
* **Owner:** @aneki
* **Status:** Draft
* **Priority:** medium
* **Tags:** cli, tooling, debugging
* **Dependencies:** kindling-core

---

## Decisions

* **D-001:** Kindling is an infrastructure project; it captures context but does not assert truth
* **D-002:** SQLite is the default embedded system of record as it is deterministic, portable, auditable
* **D-003:** Retrieval must be deterministic and explainable
* **D-004:** All governance, promotion, and lifecycle logic is explicitly out of scope for Kindling OSS
* **D‑005:** Providers are accelerators, never sources of truth. This preserves provenance
* **D-006:** A minimal CLI ships in v0.1 to enable inspection, debugging, export/import, and use without adapters
* **D-007:** Summarisation is conservative in v0.1. Primary summaries occur on capsule close. Mid-capsule rollups are optional and triggered only by size or noise thresholds. Raw observations are retained by default
* **D-008:** DB location is configurable. Default is `~/.kindling/kindling.db` (or platform equivalent), with support for per-repo paths and explicit overrides
* **D-009:** Capsules auto-close when the source provides a natural end signal (e.g. session end, workflow node end). Otherwise, explicit close is required, with a safety timeout for inactivity
* **D-010:** Promotion and MemoryObjects are out of scope for Kindling OSS v0.1; pins and notes are the only persistence mechanism

---

## Open Questions

*No open questions at this time.*
