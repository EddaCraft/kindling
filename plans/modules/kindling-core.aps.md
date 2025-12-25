# Kindling Core

Scope: KINDLING
Owner: @josh
Priority: high

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

Depends on:

* kindling-store-sqlite — persistence
* kindling-provider-local — retrieval

Exposes:

* appendObservation()
* openCapsule() / closeCapsule()
* retrieve()

## Tasks

### KINDLING-001: Define domain types and validation

**Intent:** Establish stable core schema
**Expected Outcome:** Types compile and are reused everywhere
**Confidence:** high
**Status:** Draft

**Deliverables:**
* Core TypeScript types: Observation, Capsule, Summary, Pin
* Validation functions for all domain types
* Shared constants and enums
* Unit tests for type validation

**Acceptance Criteria:**
* All domain types are properly typed with TypeScript
* Validation functions prevent invalid data from entering the system
* Types are exported and reusable across packages

### KINDLING-002: Capsule lifecycle implementation

**Intent:** Enable bounded units of meaning
**Expected Outcome:** Sessions and nodes form capsules
**Confidence:** medium
**Status:** Draft

**Deliverables:**
* openCapsule() implementation
* closeCapsule() implementation
* Capsule state management
* Observation attachment to capsules
* Unit tests for capsule lifecycle

**Acceptance Criteria:**
* Capsules can be opened with type and intent
* Observations can be attached to open capsules
* Capsules can be closed with summary generation
* State transitions are enforced
