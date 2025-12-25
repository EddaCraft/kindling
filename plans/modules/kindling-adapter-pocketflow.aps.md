# PocketFlow Adapter

Scope: ADAPTER
Owner: @josh
Priority: medium

## Purpose

Transforms PocketFlow workflow execution into **high-signal memory capsules**. PocketFlow provides explicit node boundaries and intent-like structure, which makes capsule creation more reliable than heuristic time windows.

This adapter should:

* capture node lifecycle as observations
* create a capsule per node run (or per flow run if configured)
* attach node inputs/outputs as evidence
* emit confidence signals from execution structure (success/failure, downstream reuse)

PocketFlow may be vendored internally (MIT and explicitly supports copying source). The adapter boundary remains the same either way.

## In Scope / Out of Scope

**In Scope:**

* Node start/end event capture
* Node input/output observation capture
* Capsule creation per node
* Intent derivation (from node name/type/config)
* Confidence signals (basic)

**Out of Scope:**

* Modifying PocketFlow execution semantics (beyond light instrumentation)
* Building a new workflow engine
* Governance and promotion

## Interfaces

Depends on:

* kindling-core

Exposes:

* Adapter hooks/instrumentation for PocketFlow runs

## Tasks

### ADAPTER-PF-001: Confirm PocketFlow license and vendoring approach

**Intent:** Ensure vendoring is legally and operationally clean for internal dogfooding and potential open-source boundaries.
**Expected Outcome:** PocketFlow code is included as dependency or vendored with licence notices preserved; approach documented.
**Confidence:** high
**Status:** Draft
**Dependencies:** (none)

**Inputs:**
* PocketFlow-Typescript repository licence and README guidance

**Deliverables:**
* `docs/third-party/pocketflow.md` (origin, commit/tag, licence text, update procedure)
* Repo implementation choice recorded (dependency vs vendored)

### ADAPTER-PF-002: Implement node lifecycle ingestion

**Intent:** Make PocketFlow runs produce structured observations and capsules automatically.
**Expected Outcome:** Each node run opens/closes a capsule and attaches observations deterministically.
**Confidence:** medium
**Status:** Draft
**Dependencies:** [KINDLING-003]

**Inputs:**
* PocketFlow node lifecycle hooks (or instrumentation wrapper)

**Deliverables:**
* Observations emitted:
  * `node_start` (node name/id, intent)
  * `node_output` (bounded output summary, refs)
  * `node_error` (error details)
  * `node_end` (status, timings)
* Capsule:
  * type=`pocketflow_node`
  * intent derived from node label/config
* Tests with a minimal sample flow

### ADAPTER-PF-003: Derive intent and confidence signals

**Intent:** Improve retrieval relevance and trust by using workflow structure instead of LLM guesswork.
**Expected Outcome:** Capsules include intent tags and confidence hints that can be used by retrieval and later promotion.
**Confidence:** medium
**Status:** Draft
**Dependencies:** [ADAPTER-PF-002]

**Inputs:**
* Node metadata (name/type)
* Execution outcome (success/failure)

**Deliverables:**
* Intent derivation rules (v1):
  * mapping table from node naming conventions → intent
* Confidence signals (v1):
  * success increases confidence
  * repeated failure decreases confidence
  * optional downstream reuse flag (if flow engine exposes it)
* Tests with fixtures

### ADAPTER-PF-004: Output bounding and privacy defaults

**Intent:** Prevent huge node outputs from polluting storage and retrieval; keep evidence usable.
**Expected Outcome:** Outputs are truncated/summarised before storage; redaction policy is applied consistently.
**Confidence:** low
**Status:** Draft
**Dependencies:** [STORAGE-003]

**Deliverables:**
* Output size limits + truncation strategy
* Optional allowlist for fields persisted from node I/O

## Decisions

* **D-001:** PocketFlow is treated as a workflow input source; Kindling core remains orchestration-agnostic
* **D-002:** Capsules are node-scoped by default for highest signal

## Notes

* Keep this adapter small. The value is the boundary signal, not extra features.
