# Kindling Core

| Scope    | Owner  | Priority | Status |
|----------|--------|----------|--------|
| KINDLING | @aneki | high     | Draft  |

## Purpose

Provides the shared domain model and orchestration logic for memory capture, capsule management, and retrieval. This is the spine of both Kindling and Edda.

## In Scope

* Observation ingestion API
* Capsule open/close lifecycle
* Summary registration
* Retrieval orchestration (pins + summaries + providers)
* Export / import

## Out of Scope

* Storage implementation
* Workflow semantics
* Promotion, lifecycle, governance

## Interfaces

**Depends on:**
* kindling-store-sqlite — persistence
* kindling-provider-local — retrieval

**Exposes:**
* `appendObservation()`
* `openCapsule()` / `closeCapsule()`
* `retrieve()`

## Tasks

### KINDLING-001: Define domain types and validation

**Intent:** Establish stable core schema

**Expected Outcome:** Types compile and are reused everywhere

**Confidence:** high

**Scopes:** [KINDLING]

**Tags:** [types, domain]

**Dependencies:** (none)

---

### KINDLING-002: Capsule lifecycle implementation

**Intent:** Enable bounded units of meaning

**Expected Outcome:** Sessions and nodes form capsules

**Confidence:** medium

**Scopes:** [KINDLING]

**Tags:** [capsules, lifecycle]

**Dependencies:** [KINDLING-001, STORAGE-002]

---

### KINDLING-003: Observation ingestion and linking

**Intent:** Provide atomic append operations with capsule attachment

**Expected Outcome:** Adapters can reliably capture observations

**Confidence:** high

**Scopes:** [KINDLING]

**Tags:** [ingestion, observations]

**Dependencies:** [KINDLING-001, STORAGE-002]

---

### KINDLING-004: Retrieval orchestration

**Intent:** Coordinate pins, summaries, and provider candidates

**Expected Outcome:** Retrieve() returns deterministic, tiered results

**Confidence:** medium

**Scopes:** [KINDLING]

**Tags:** [retrieval, orchestration]

**Dependencies:** [STORAGE-004, RETRIEVAL-001]

---

### KINDLING-005: Pin management

**Intent:** Allow explicit context preservation with TTL support

**Expected Outcome:** Users can pin observations/summaries; pins expire predictably

**Confidence:** high

**Scopes:** [KINDLING]

**Tags:** [pins, ttl]

**Dependencies:** [STORAGE-002]

---

## Decisions

* **D-001:** Kindling is an infrastructure project; it captures context but does not assert truth
* **D-002:** Retrieval must be deterministic and explainable
* **D-003:** Providers are accelerators, never sources of truth

## Notes

* This is the coordination layer. Keep it thin and delegate to store/provider where possible.
