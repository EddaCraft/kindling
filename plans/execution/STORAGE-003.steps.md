# Steps: STORAGE-003

| Field | Value |
|-------|-------|
| Source | [../modules/kindling-store-sqlite.aps.md](../modules/kindling-store-sqlite.aps.md) |
| Task(s) | STORAGE-003 — Implement redaction/tombstone support |
| Created by | @aneki / AI |
| Status | Draft |

## Why This Matters

Users must be able to remove sensitive content from their local memory. However, naive deletion breaks provenance chains and capsule integrity. Redaction preserves structure while removing content.

## What We're Building

A redaction mechanism that:
- Removes content from retrieval (including FTS)
- Preserves observation existence and relationships
- Maintains capsule integrity

## Prerequisites

- [ ] STORAGE-001 complete (schema exists)
- [ ] STORAGE-002 complete (write path available)

## Steps

### 1. Define redaction semantics

- **Why:** Clear rules prevent ambiguity about what "redacted" means
- **What:** Documentation and type definitions
- **Checkpoint:** `src/store/redaction.ts` exports:
  - `RedactOptions` type (preserveProvenance: boolean)
  - Documented behaviour: content cleared, redacted=true, FTS removed
- **Validate:** `pnpm tsc --noEmit`

### 2. Implement observation redaction

- **Why:** Observations contain the actual sensitive content
- **What:** Update that clears content and removes from FTS
- **Checkpoint:** `redactObservation(id, opts)`:
  - Sets content to '[redacted]'
  - Sets redacted=true
  - Removes from observations_fts
  - Optionally preserves provenance metadata
- **Validate:** `pnpm tsc --noEmit`

### 3. Implement FTS cleanup

- **Why:** Redacted content must not appear in search results
- **What:** FTS delete synchronized with redaction
- **Checkpoint:** FTS deletion:
  - Trigger-based: automatic on redact
  - Or explicit: `removeFromFts(observationId)`
  - Verified: search does not return redacted content
- **Validate:** `pnpm tsc --noEmit`

### 4. Implement tombstone marker (optional)

- **Why:** Some use cases need to track that something existed
- **What:** Tombstone flag for complete removal intent
- **Checkpoint:** `tombstoneObservation(id)`:
  - Marks observation as tombstoned
  - Preserves ID for referential integrity
  - Excludes from all queries except audit
- **Validate:** `pnpm tsc --noEmit`

### 5. Add redaction tests

- **Why:** Privacy features must work correctly
- **What:** Tests verifying redaction behaviour
- **Checkpoint:** `test/storage.redaction.spec.ts` covers:
  - Redacted observation not in FTS results
  - Redacted observation still retrievable by ID
  - Capsule-observation relationship preserved
  - Provenance optionally preserved
  - Cannot redact non-existent observation
- **Validate:** `pnpm test -- redaction`

### 6. Add integration tests with retrieval

- **Why:** Redaction must work end-to-end
- **What:** Tests that verify retrieval respects redaction
- **Checkpoint:** `test/storage.redaction.integration.spec.ts`:
  - Search excludes redacted content
  - Evidence snippets show '[redacted]' placeholder
  - Capsule still lists redacted observation ID
- **Validate:** `pnpm test -- redaction.integration`

## Completion

- [ ] All checkpoints validated
- [ ] Task marked complete in source module

**Completed by:** ___
