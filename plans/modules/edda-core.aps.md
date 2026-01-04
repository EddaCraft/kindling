# Edda Core

Scope: EDDA
Owner: @josh
Priority: medium

## Purpose

Provides the **curation layer**: converting captured capsules into durable, trusted MemoryObjects with lifecycle and conflict handling.

Edda Core consumes Kindling artefacts (capsules, summaries, evidence refs) and adds:

* review states
* promotion workflow
* lifecycle operations (supersede, deprecate, expire)
* conflict surfacing and resolution metadata

## In Scope / Out of Scope

**In Scope:**

* Capsule review queue mechanics (data model + API)
* Promotion: capsule → MemoryObject
* MemoryObject lifecycle management
* Conflict detection primitives (heuristics + metadata)

**Out of Scope:**

* UI for review (Phase 2+)
* Multi-user RBAC and audit logging (Phase 2+)
* External connectors beyond what Kindling captures

## Interfaces

Depends on:

* kindling-core (capsules, summaries, evidence)

Exposes:

* `reviewCapsule()` / `approveCapsule()` / `rejectCapsule()`
* `promoteToMemoryObject()`
* `supersedeMemoryObject()` / `deprecateMemoryObject()` / `expireMemoryObject()`
* `listConflicts()`

## Tasks

### EDDA-001: Define MemoryObject model + lifecycle states

**Intent:** Establish the durable memory entity and the lifecycle rules that keep memory truthful over time.
**Expected Outcome:** MemoryObject type exists with status transitions and evidence/provenance requirements.
**Confidence:** medium
**Status:** Draft
**Dependencies:** [KINDLING-001]

**Inputs:**
* `docs/data-model.md` MemoryObject definition

**Deliverables:**
* `src/edda/memoryObject.ts` types + validators
* Lifecycle rules:
  * active → superseded (with `supersedesId`)
  * active → deprecated (reason)
  * active → expired (TTL)
  * never delete without tombstone
* Unit tests for transition rules

### EDDA-002: Implement capsule review workflow (headless)

**Intent:** Add a human-in-the-loop gate for what becomes institutional memory without requiring a UI in Phase 1.
**Expected Outcome:** Capsules can be marked reviewed/approved/rejected and promoted only when approved.
**Confidence:** low
**Status:** Draft
**Dependencies:** [KINDLING-003, STORAGE-002]

**Inputs:**
* Capsule status field exists in store

**Deliverables:**
* Functions:
  * `reviewCapsule(capsuleId, reviewer, notes)`
  * `approveCapsule(capsuleId)`
  * `rejectCapsule(capsuleId, reason)`
* Minimal storage additions (if needed) via migrations (Phase 3+)
* Tests for allowed transitions

### EDDA-003: Implement promotion pipeline (capsule → MemoryObjects)

**Intent:** Convert high-signal capsule summaries into durable MemoryObjects with evidence refs and confidence.
**Expected Outcome:** Promotion creates MemoryObjects; retrieval can surface them as durable knowledge.
**Confidence:** low
**Status:** Draft
**Dependencies:** [EDDA-001, EDDA-002]

**Inputs:**
* Capsule summaries and evidence refs

**Deliverables:**
* `promoteToMemoryObject(capsuleId, selection)`
  * selection can be manual in v1 (no LLM required)
* Enforced requirements:
  * evidenceRefs non-empty
  * scope specified (repo/user/agent)
  * confidence specified
* Tests:
  * promotion blocked unless approved
  * evidence refs preserved

### EDDA-004: Conflict detection primitives

**Intent:** Surface disagreements in memory rather than silently selecting one truth.
**Expected Outcome:** Conflicts are discoverable and resolvable by superseding rather than deleting.
**Confidence:** low
**Status:** Draft
**Dependencies:** [EDDA-001]

**Inputs:**
* MemoryObjects list

**Deliverables:**
* Heuristic conflict detection (v1):
  * same scope + same intentTags + similar statement but different content
* `listConflicts()` returns pairs with reasons
* Tests with fixture objects

## Decisions

* **D-001:** Edda is downstream: capture is Kindling; governance is Edda
* **D-002:** MemoryObjects must carry evidence refs; otherwise they are not promotable
* **D-003:** Conflict is surfaced, not erased; resolution uses lifecycle transitions

## Notes

* Edda Core stays headless in Phase 1; UI is a later layer.
