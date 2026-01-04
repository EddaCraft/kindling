# Kindling OpenCode Adapter

| Scope | Owner | Priority | Status |
|-------|-------|----------|--------|
| ADAPTER-OC | @aneki | high | Draft |

## Purpose

Ingests OpenCode sessions and tool activity into Kindling. This adapter translates OpenCode's observable actions into:

- Observations (tool calls, command runs, file diffs, errors, messages)
- Session capsules (open on session start, close on session end)
- `/memory` command surface for user control

The adapter must remain thin: mapping and plumbing only. The rules for capsules, retrieval, and provenance live in Kindling Core.

## In Scope

- Event mapping: OpenCode → Kindling observations
- Session capsule lifecycle management
- Provenance extraction (paths, command args, exit codes, diff summaries)
- `/memory` commands: status, search, pin, forget, export

## Out of Scope

- Storage and retrieval logic (Kindling Core)
- Re-implementing OpenCode session management
- Governance (promotion, lifecycle)

## Interfaces

**Depends on:**

- kindling-core — primary API

**Exposes:**

- Adapter initialiser for OpenCode server/client hooks
- `/memory` command handlers

## Boundary Rules

- ADAPTER-OC must not access storage directly; use kindling-core API
- ADAPTER-OC must not implement retrieval logic
- Mapping table is the contract; no ad-hoc event handling

## Acceptance Criteria

- [ ] All OpenCode event types mapped to observation kinds
- [ ] Session start opens capsule; session end closes it
- [ ] `/memory` commands work and produce stable output
- [ ] Basic filtering prevents obvious secret capture
- [ ] Adapter handles missing repoId gracefully

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| OpenCode event API changes | Mapping table isolates changes |
| Secret leakage in observations | Allowlist fields; truncate large outputs |
| Capsule orphans on crash | Timeout-based auto-close |

## Tasks

### ADAPTER-OC-001: Discover OpenCode event surfaces and define mapping table

- **Intent:** Identify concrete OpenCode hooks/events and map them to observation kinds with provenance fields
- **Expected Outcome:** Single mapping table used by all ingestion code; no ad-hoc event handling
- **Scope:** `src/opencode/`
- **Non-scope:** Capsule lifecycle, commands
- **Files:** `src/opencode/mapping.ts`, `test/opencode.mapping.spec.ts`
- **Dependencies:** (none)
- **Validation:** `pnpm test -- opencode.mapping`
- **Confidence:** medium
- **Risks:** OpenCode API discovery may require iteration

**Deliverables:**

- `src/opencode/mapping.ts` mapping:
  - tool_call → Observation(kind=tool_call, provenance=toolName, args)
  - command → Observation(kind=command, provenance=cmd, exitCode)
  - file_diff → Observation(kind=file_diff, provenance=paths)
  - error → Observation(kind=error, provenance=stack)
  - message → Observation(kind=message)
- Unit tests for mapping output shapes

### ADAPTER-OC-002: Implement session capsule lifecycle

- **Intent:** Ensure each OpenCode session becomes a bounded capsule by default
- **Expected Outcome:** Session start opens capsule; events attach; session end closes it
- **Scope:** `src/opencode/`
- **Non-scope:** Capsule implementation (kindling-core)
- **Files:** `src/opencode/session.ts`, `test/opencode.session.spec.ts`
- **Dependencies:** KINDLING-002
- **Validation:** `pnpm test -- opencode.session`
- **Confidence:** high
- **Risks:** Edge cases around session interruption

**Deliverables:**

- `src/opencode/session.ts`:
  - `onSessionStart(sessionId, repoId?) → openCapsule(type=session, intent=general)`
  - `onEvent(...) → appendObservation(capsuleId=current)`
  - `onSessionEnd(...) → closeCapsule(signals)`
- Tests: events attach to correct capsule; missing repoId handled

### ADAPTER-OC-003: Implement `/memory` command handlers

- **Intent:** Provide user control over local memory without leaving OpenCode
- **Expected Outcome:** Commands call Kindling service methods and print deterministic output
- **Scope:** `src/opencode/commands/`
- **Non-scope:** Retrieval logic, storage
- **Files:** `src/opencode/commands/*.ts`, `test/opencode.commands.spec.ts`
- **Dependencies:** KINDLING-004, KINDLING-005
- **Validation:** `pnpm test -- opencode.commands`
- **Confidence:** medium
- **Risks:** Output formatting preferences

**Deliverables:**

- `/memory status` → counts, DB location, last summary time
- `/memory search <q>` → retrieval response formatted as block
- `/memory pin` → pin last message or selected snippet
- `/memory forget <id>` → redact/forget
- `/memory export` → writes export bundle path
- Tests: command outputs are stable

### ADAPTER-OC-004: Dogfood instrumentation + safety defaults

- **Intent:** Prevent accidental capture of secrets and reduce noise early
- **Expected Outcome:** Adapter has basic filtering rules and opt-outs; redaction supported
- **Scope:** `src/opencode/`
- **Non-scope:** Redaction implementation (STORAGE-003)
- **Files:** `src/opencode/filter.ts`, `README.md`
- **Dependencies:** STORAGE-003
- **Validation:** `pnpm test -- opencode.filter`
- **Confidence:** low
- **Risks:** False positives in filtering

**Deliverables:**

- Filtering rules (v1):
  - Allowlist tool result fields when possible
  - Truncate large outputs
  - Optional patterns to mask obvious secrets
- Notes in README on what is captured

## Decisions

- **D-001:** Adapter stays thin; mapping table is the contract
- **D-002:** Default behaviour is session capsule per OpenCode session

## Notes

- Keep output formatting readable; do not make the user parse JSON in their terminal.
