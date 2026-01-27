# Kindling Claude Code Adapter

| Scope | Owner | Priority | Status |
|-------|-------|----------|--------|
| ADAPTER-CC | @aneki | high | Draft |

## Purpose

Ingests Claude Code sessions and tool activity into Kindling via the hooks system. This adapter translates Claude Code's observable actions into:

- Observations (tool calls, command runs, file diffs, errors, messages)
- Session capsules (open on SessionStart, close on Stop)
- Context injection for retrieval (populate session context from prior memory)

The adapter enables continuity between Claude Code sessions: "Remember what you built yesterday."

## In Scope

- Hook-based event mapping: Claude Code → Kindling observations
- Session capsule lifecycle via SessionStart/Stop hooks
- Provenance extraction (tool names, args, results, exit codes)
- Context retrieval injection (pre-session context population)
- Basic filtering to prevent secret capture

## Out of Scope

- Storage and retrieval logic (Kindling Core)
- Claude Code hook system implementation
- Governance (promotion, lifecycle)
- `/memory` command surface (potential future work)

## Interfaces

**Depends on:**

- kindling-core — primary API
- Claude Code hooks system — event source

**Exposes:**

- Hook handlers for PreToolUse, PostToolUse, SessionStart, Stop
- Configuration for DB path and filtering rules
- Optional retrieval context injection

## Boundary Rules

- ADAPTER-CC must not access storage directly; use kindling-core API
- ADAPTER-CC must not implement retrieval logic
- Hook handlers are thin wrappers around core service calls
- All observations include provenance pointing to concrete evidence

## Claude Code Hook Events

| Hook | Trigger | Kindling Action |
|------|---------|-----------------|
| SessionStart | Session begins | Open capsule |
| PreToolUse | Before tool call | (optional) Log intent |
| PostToolUse | After tool call | Append observation |
| Stop | Session ends | Close capsule with summary |
| SubagentStop | Subagent completes | Append node_end observation |
| UserPromptSubmit | User sends message | Append message observation |
| PreCompact | Before context compaction | Trigger mid-capsule summary |

## Observation Mapping

| Claude Code Event | Observation Kind | Provenance Fields |
|-------------------|------------------|-------------------|
| PostToolUse (Read) | tool_call | toolName, filePath, result snippet |
| PostToolUse (Write/Edit) | file_diff | toolName, filePath, before/after |
| PostToolUse (Bash) | command | command, exitCode, output snippet |
| PostToolUse (error) | error | toolName, errorMessage, stack |
| UserPromptSubmit | message | role=user, content |
| SubagentStop | node_end | agentType, output summary |

## Ready Checklist

Change status to **Ready** when:

- [ ] Purpose and scope are clear
- [ ] Dependencies identified
- [ ] At least one task defined
- [ ] Claude Code hooks API understood

## Tasks

### ADAPTER-CC-001: Define event mapping and provenance extraction

- **Intent:** Create mapping table from Claude Code hooks to observation kinds with provenance
- **Expected Outcome:** Single mapping module used by all hook handlers; no ad-hoc event handling
- **Scope:** `packages/kindling-adapter-claude-code/src/`
- **Non-scope:** Capsule lifecycle, retrieval injection
- **Files:** `src/mapping.ts`, `src/test/mapping.test.ts`
- **Dependencies:** (none)
- **Validation:** `pnpm --filter @kindling/adapter-claude-code test`
- **Confidence:** high

**Deliverables:**

- `src/mapping.ts` with:
  - `mapToolUse(event) → Observation` for Read, Write, Edit, Bash, Glob, Grep, etc.
  - `mapUserPrompt(event) → Observation` for user messages
  - `mapSubagentStop(event) → Observation` for agent completions
  - Provenance extraction for each tool type
- Unit tests for mapping output shapes

### ADAPTER-CC-002: Implement session capsule lifecycle hooks

- **Intent:** Ensure each Claude Code session becomes a bounded capsule
- **Expected Outcome:** SessionStart opens capsule; Stop closes with summary signal
- **Scope:** `packages/kindling-adapter-claude-code/src/`
- **Non-scope:** Capsule implementation (kindling-core)
- **Files:** `src/hooks/session.ts`, `src/test/session.test.ts`
- **Dependencies:** ADAPTER-CC-001
- **Validation:** `pnpm --filter @kindling/adapter-claude-code test`
- **Confidence:** high

**Deliverables:**

- `src/hooks/session.ts`:
  - `onSessionStart(context) → openCapsule(type=session)`
  - `onStop(context) → closeCapsule(generateSummary=true)`
- Session context extraction (working directory, project name)
- Tests: capsule opens on start, closes on stop

### ADAPTER-CC-003: Implement PostToolUse observation capture

- **Intent:** Capture all tool activity as observations with full provenance
- **Expected Outcome:** Every tool call becomes a retrievable observation
- **Scope:** `packages/kindling-adapter-claude-code/src/`
- **Non-scope:** PreToolUse (optional logging only)
- **Files:** `src/hooks/tool-use.ts`, `src/test/tool-use.test.ts`
- **Dependencies:** ADAPTER-CC-001, ADAPTER-CC-002
- **Validation:** `pnpm --filter @kindling/adapter-claude-code test`
- **Confidence:** high

**Deliverables:**

- `src/hooks/tool-use.ts`:
  - `onPostToolUse(event) → appendObservation(mapped)`
  - Handle all core tools: Read, Write, Edit, Bash, Glob, Grep, WebFetch, Task
  - Extract relevant provenance per tool type
- Tests: each tool type maps correctly

### ADAPTER-CC-004: Implement context retrieval injection

- **Intent:** Populate session context with relevant prior memory on session start
- **Expected Outcome:** New sessions automatically have access to relevant prior context
- **Scope:** `packages/kindling-adapter-claude-code/src/`
- **Non-scope:** Retrieval implementation (kindling-core)
- **Files:** `src/hooks/context.ts`, `src/test/context.test.ts`
- **Dependencies:** ADAPTER-CC-002
- **Validation:** `pnpm --filter @kindling/adapter-claude-code test`
- **Confidence:** medium
- **Risks:** Context injection point in Claude Code hooks unclear

**Deliverables:**

- `src/hooks/context.ts`:
  - `getSessionContext(scopeIds) → retrieve(query, scopeIds)`
  - Format retrieved context for Claude Code consumption
- Tests: context retrieval returns formatted results

### ADAPTER-CC-005: Safety defaults and filtering

- **Intent:** Prevent accidental capture of secrets and reduce noise
- **Expected Outcome:** Adapter has basic filtering; sensitive content masked
- **Scope:** `packages/kindling-adapter-claude-code/src/`
- **Non-scope:** Redaction implementation (STORAGE-003)
- **Files:** `src/filter.ts`, `src/test/filter.test.ts`, `README.md`
- **Dependencies:** ADAPTER-CC-003
- **Validation:** `pnpm --filter @kindling/adapter-claude-code test`
- **Confidence:** medium

**Deliverables:**

- `src/filter.ts`:
  - Truncate large outputs (configurable limit)
  - Mask common secret patterns (API keys, tokens)
  - Skip capturing certain tool results (e.g., WebSearch full content)
- README documentation on what is captured
- Tests: filtering rules work correctly

### ADAPTER-CC-006: Package setup and integration

- **Intent:** Create publishable npm package with proper configuration
- **Expected Outcome:** Package builds, tests pass, ready for npm publish
- **Scope:** `packages/kindling-adapter-claude-code/`
- **Non-scope:** Actual npm publishing
- **Files:** `package.json`, `tsconfig.json`, `README.md`, `CHANGELOG.md`
- **Dependencies:** ADAPTER-CC-001 through ADAPTER-CC-005
- **Validation:** `pnpm --filter @kindling/adapter-claude-code build && pnpm --filter @kindling/adapter-claude-code test`
- **Confidence:** high

**Deliverables:**

- Complete package structure matching other adapters
- README with installation, configuration, and usage examples
- CHANGELOG entry for v0.1.0
- Export map for hooks and configuration

## Decisions

- **D-001:** Adapter uses hooks system exclusively; no modification to Claude Code internals
- **D-002:** Default behaviour is session capsule per Claude Code session
- **D-003:** Context injection is opt-in to avoid performance impact
- **D-004:** Filtering is conservative; better to miss some data than capture secrets

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Claude Code hooks API changes | Mapping table isolates changes |
| Secret leakage in observations | Conservative filtering, truncation |
| Performance impact from observation capture | Async writes, batching if needed |
| Context injection latency | Make injection optional, cache recent results |

## Notes

- Claude Code hooks documentation: https://docs.anthropic.com/en/docs/claude-code/hooks
- This adapter enables the "Kindling + Claude Code" dogfooding story
- Consider future `/memory` command integration via Claude Code custom commands
