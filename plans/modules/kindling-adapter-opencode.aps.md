# OpenCode Adapter

Scope: ADAPTER
Owner: @josh
Priority: high

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
* `/memory` commands:
  * status, search, pin, forget, export

**Out of Scope:**

* Storage and retrieval logic
* Any attempt to re-implement OpenCode session management
* Governance (promotion, lifecycle)

## Interfaces

Depends on:

* kindling-core — primary API

Exposes:

* Adapter initialiser for OpenCode server/client hooks
* `/memory` command handlers

## Tasks

### ADAPTER-OC-001: Discover OpenCode event surfaces and define mapping table

**Intent:** Identify the concrete OpenCode hooks/events available and map them to observation kinds with provenance fields.
**Expected Outcome:** A single mapping table exists and is used by all ingestion code; no ad-hoc event handling.
**Confidence:** medium
**Status:** Draft
**Dependencies:** (none)

**Inputs:**
* OpenCode server/client event APIs (actual code)

**Deliverables:**
* `src/opencode/mapping.ts` mapping:
  * tool_call → Observation(kind=tool_call, provenance=toolName, args)
  * command → Observation(kind=command, provenance=cmd, exitCode)
  * file_diff → Observation(kind=file_diff, provenance=paths)
  * error → Observation(kind=error, provenance=stack)
  * message → Observation(kind=message)
* Unit tests for mapping output shapes

### ADAPTER-OC-002: Implement session capsule lifecycle

**Intent:** Ensure each OpenCode session becomes a bounded capsule by default.
**Expected Outcome:** Session start opens a capsule; events attach to that capsule; session end closes it.
**Confidence:** high
**Status:** Draft
**Dependencies:** [KINDLING-003]

**Inputs:**
* Session identifiers from OpenCode

**Deliverables:**
* `src/opencode/session.ts`:
  * `onSessionStart(sessionId, repoId?) → openCapsule(type=session, intent=general)`
  * `onEvent(...) → appendObservation(capsuleId=current)`
  * `onSessionEnd(...) → closeCapsule(signals)`
* Tests:
  * events always attach to correct capsule
  * adapter handles missing repoId gracefully

### ADAPTER-OC-003: Implement `/memory` command handlers

**Intent:** Provide user control over local memory without leaving OpenCode.
**Expected Outcome:** Commands call Kindling service methods and print deterministic output.
**Confidence:** medium
**Status:** Draft
**Dependencies:** [KINDLING-004, KINDLING-005]

**Inputs:**
* OpenCode command/extension mechanism

**Deliverables:**
* `/memory status` → counts, DB location, last summary time
* `/memory search <q>` → retrieval response formatted as a block
* `/memory pin` → pin last assistant/user message or selected snippet (implementation choice)
* `/memory forget <id>` → redact/forget
* `/memory export` → writes export bundle path
* Tests:
  * command outputs are stable

### ADAPTER-OC-004: Dogfood instrumentation + safety defaults

**Intent:** Prevent accidental capture of secrets and reduce noise early.
**Expected Outcome:** Adapter has basic filtering rules and opt-outs; redaction is supported.
**Confidence:** low
**Status:** Draft
**Dependencies:** [STORAGE-003]

**Inputs:**
* A small allow/deny list of observation kinds or fields

**Deliverables:**
* Filtering rules (v1):
  * allowlist tool result fields when possible
  * truncate large outputs
  * optional patterns to mask obvious secrets
* Notes in README on what is captured

## Decisions

* **D-001:** Adapter stays thin; mapping table is the contract
* **D-002:** Default behaviour is session capsule per OpenCode session

## Notes

* Keep output formatting readable; do not make the user parse JSON in their terminal.
