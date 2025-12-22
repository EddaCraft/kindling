# PocketFlow Adapter

| Scope   | Owner  | Priority | Status |
|---------|--------|----------|--------|
| ADAPTER | @aneki | medium   | Draft  |

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

**Depends on:**
* kindling-core

**Exposes:**
* Adapter hooks/instrumentation for PocketFlow runs

## Tasks

### ADAPTER-PF-001: Confirm PocketFlow license and vendoring approach

**Intent:** Ensure vendoring is legally and operationally clean for internal dogfooding and potential open-source boundaries.

**Expected Outcome:** PocketFlow code is included as dependency or vendored with licence notices preserved; approach documented.

**Confidence:** high

**Scopes:** [ADAPTER]

**Tags:** [license, vendoring]

**Dependencies:** (none)

---

### ADAPTER-PF-002: Implement node lifecycle ingestion

**Intent:** Make PocketFlow runs produce structured observations and capsules automatically.

**Expected Outcome:** Each node run opens/closes a capsule and attaches observations deterministically.

**Confidence:** medium

**Scopes:** [ADAPTER]

**Tags:** [pocketflow, capsules]

**Dependencies:** [KINDLING-003]

---

### ADAPTER-PF-003: Derive intent and confidence signals

**Intent:** Improve retrieval relevance and trust by using workflow structure instead of LLM guesswork.

**Expected Outcome:** Capsules include intent tags and confidence hints that can be used by retrieval and later promotion.

**Confidence:** medium

**Scopes:** [ADAPTER]

**Tags:** [intent, confidence]

**Dependencies:** [ADAPTER-PF-002]

---

### ADAPTER-PF-004: Output bounding and privacy defaults

**Intent:** Prevent huge node outputs from polluting storage and retrieval; keep evidence usable.

**Expected Outcome:** Outputs are truncated/summarised before storage; redaction policy is applied consistently.

**Confidence:** low

**Scopes:** [ADAPTER]

**Tags:** [privacy, truncation]

**Dependencies:** [STORAGE-003]

---

## Decisions

* **D-001:** PocketFlow is treated as a workflow input source; Kindling core remains orchestration-agnostic
* **D-002:** Capsules are node-scoped by default for highest signal

## Notes

* Keep this adapter small. The value is the boundary signal, not extra features.
