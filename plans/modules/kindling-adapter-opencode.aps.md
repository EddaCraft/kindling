# OpenCode Adapter

| Scope   | Owner  | Priority | Status |
|---------|--------|----------|--------|
| ADAPTER | @aneki | high     | Draft  |

## Purpose

Ingests OpenCode sessions and tool activity into Kindling. This adapter translates OpenCode's observable actions into:

* Observations (tool calls, command runs, file diffs, errors, messages)
* Session capsules (open on session start, close on session end)
* `/memory` command surface for user control

The adapter must remain thin: mapping and plumbing only. The rules for capsules, retrieval, and provenance live in Kindling Core.

## In Scope / Out of Scope

**In Scope:**

* Event mapping: OpenCode → Kindling observations
* Session capsule lifecycle management
* Provenance extraction (paths, command args, exit codes, diff summaries)
* `/memory` commands: status, search, pin, forget, export

**Out of Scope:**

* Storage and retrieval logic
* Any attempt to re-implement OpenCode session management
* Governance (promotion, lifecycle)

## Interfaces

**Depends on:**
* kindling-core — primary API

**Exposes:**
* Adapter initialiser for OpenCode server/client hooks
* `/memory` command handlers

## Tasks

### ADAPTER-OC-001: Discover OpenCode event surfaces and define mapping table

**Intent:** Identify the concrete OpenCode hooks/events available and map them to observation kinds with provenance fields.

**Expected Outcome:** A single mapping table exists and is used by all ingestion code; no ad-hoc event handling.

**Confidence:** medium

**Scopes:** [ADAPTER]

**Tags:** [opencode, ingestion, mapping]

**Dependencies:** (none)

---

### ADAPTER-OC-002: Implement session capsule lifecycle

**Intent:** Ensure each OpenCode session becomes a bounded capsule by default.

**Expected Outcome:** Session start opens a capsule; events attach to that capsule; session end closes it.

**Confidence:** high

**Scopes:** [ADAPTER]

**Tags:** [capsules, sessions]

**Dependencies:** [KINDLING-003]

---

### ADAPTER-OC-003: Implement `/memory` command handlers

**Intent:** Provide user control over local memory without leaving OpenCode.

**Expected Outcome:** Commands call Kindling service methods and print deterministic output.

**Confidence:** medium

**Scopes:** [ADAPTER]

**Tags:** [commands, ux]

**Dependencies:** [KINDLING-004, KINDLING-005]

---

### ADAPTER-OC-004: Dogfood instrumentation + safety defaults

**Intent:** Prevent accidental capture of secrets and reduce noise early.

**Expected Outcome:** Adapter has basic filtering rules and opt-outs; redaction is supported.

**Confidence:** low

**Scopes:** [ADAPTER]

**Tags:** [privacy, filtering]

**Dependencies:** [STORAGE-003]

---

## Decisions

* **D-001:** Adapter stays thin; mapping table is the contract
* **D-002:** Default behaviour is session capsule per OpenCode session

## Notes

* Keep output formatting readable; do not make the user parse JSON in their terminal.
