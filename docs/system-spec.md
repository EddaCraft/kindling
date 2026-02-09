# System Specification

## System Summary

PocketFlow orchestrates execution. Kindling captures observations. Ember proposes meaning. Edda preserves knowledge. Anvil defines policy.

Each component has hard limits:

- PocketFlow cannot plan, interpret, or remember
- Kindling cannot judge
- Ember cannot decide
- Edda cannot speculate
- Anvil cannot remember

Those constraints prevent logs becoming "truth", AI inference becoming policy, memory inflation, silent drift of institutional knowledge, and agents reinforcing their own errors.

---

## Component Topology

```
Agents / Tools / Humans
          |
     PocketFlow
     (orchestration, capsule lifecycle, memory mediation, policy enforcement)
          |
    +-----+------+------+------+
    |            |         |        |
Kindling     Ember      Edda     Anvil
(capture)  (interpret) (knowledge) (policy)
```

PocketFlow is the single gateway. Agents do not access Kindling, Ember, Edda, or Anvil directly.

When PocketFlow is not present (standalone usage), Kindling manages its own capsule lifecycle and exposes its mechanical retrieval layer directly.

---

## PocketFlow — Runtime Orchestration & Enforcement

### Purpose

PocketFlow is a runtime orchestration and enforcement layer for agent-driven workflows. It coordinates execution, enforces scope and policy mechanically, and provides a single, consistent interface between agents, tools, and memory systems.

PocketFlow does not plan, interpret, or remember.

### Core Responsibilities

#### 1. Execution Orchestration

- Accept a task or workflow invocation
- Initialise execution context
- Route actions to tools, agents, or subprocesses
- Enforce ordered execution
- Handle success, failure, and abort states

#### 2. Capsule Lifecycle Management

- Open a new capsule at task start
- Bind all actions, tool calls, diffs, logs, and errors to the active capsule
- Close the capsule on completion, failure, or cancellation
- Guarantee that all observable activity occurs within a capsule

#### 3. Memory I/O Mediation

- Provide a unified API for memory interactions
- Route capture operations to Kindling
- Route retrieval operations to configured memory backends
- Route promotion requests to the appropriate downstream system
- Prevent direct agent access to memory stores

#### 4. Scope & Attribution Enforcement

- Enforce execution scope (repo, workspace, project, task)
- Attribute all actions to an agent, user, or process
- Prevent cross-scope access without explicit escalation
- Reject unauthenticated or unscoped actions

#### 5. Policy Enforcement (Mechanical)

- Enforce preconditions defined by external policy systems
- Enforce runtime invariants (e.g. active task required)
- Enforce postconditions (e.g. validation steps must run)
- Block or abort execution on violation
- Record violations as observations

#### 6. Validation & Check Execution

- Run deterministic validation steps (linters, scanners, invariants)
- Capture results as observations
- Do not interpret results or assign meaning

### Non-Responsibilities (Explicitly Out of Scope)

PocketFlow does not:

- Infer intent
- Rank or prioritise information
- Summarise content
- Detect patterns
- Store durable memory
- Curate knowledge
- Decide importance or relevance
- Perform semantic reasoning

### Interfaces

**Task Interface**

- `task.start(metadata)`
- `task.complete(result)`
- `task.fail(error)`
- `task.abort(reason)`

**Capsule Interface**

- `capsule.open(context)`
- `capsule.close(status)`

**Action Interface**

- `action.execute(tool, input)`
- `action.validate(output)`
- `action.abort(reason)`

**Memory Interface (Abstracted)**

- `memory.capture(observation)`
- `memory.retrieve(query)`
- `memory.propose(candidate)`
- `memory.promote(reference)`

**Policy Interface**

- `policy.check_preconditions(context)`
- `policy.check_postconditions(result)`
- `policy.check_runtime(action)`

### Execution Context

Each PocketFlow execution maintains a context containing:

- Task identifier
- Capsule identifier
- Agent/user identity
- Repo/workspace scope
- Timestamps
- Policy bindings
- Environment metadata

Context is immutable once execution begins, except for status transitions.

### Failure Handling

- All failures are captured as observations
- Execution halts on policy violation unless explicitly configured otherwise
- Partial execution state is preserved
- Capsule is closed with failure status
- No automatic retries without explicit instruction

### Extensibility

- Tool adapters are pluggable
- Policy providers are pluggable
- Memory backends are swappable
- Validation steps are composable

### Determinism Requirements

- Execution order must be deterministic given the same inputs
- Side effects must be attributed and observable
- Policy checks must be reproducible
- No probabilistic behaviour in core flow control

### Security & Isolation

- Enforce least-privilege access
- Prevent cross-capsule contamination
- Require explicit scope escalation
- Ensure all external calls are mediated

### Vendoring & Compatibility

PocketFlow is vendored within the system. Other implementations of the PocketFlow spec may connect, provided they satisfy the interface contracts and determinism requirements.

The existing `@eddacraft/kindling-adapter-pocketflow` package is a separate concern: an adapter for users who use the PocketFlow library in their own workflows and want Kindling capture. It is not the orchestration layer described here.

---

## Kindling — Observability & Provenance Layer

### Purpose

Kindling is a low-level observability system for human and agent activity. It captures structured observations about what happens during execution: tool usage, agent actions, communications, errors, diffs, retries, and session boundaries. Kindling records events as they occur, preserving ordering, attribution, and provenance.

Kindling's output is raw signal. It is intentionally naive and does not attempt to infer meaning or importance. Its primary value is trustworthiness: it records what happened, not what should be remembered.

### Key Technical Properties

- Append-only, high-volume event capture
- No interpretation or judgement
- Strong attribution (who / what / when / where)
- Session- and agent-scoped
- Loss-tolerant but traceable

### Core Responsibilities

#### 1. Observation Capture

- Record structured observations from any source
- Preserve ordering, attribution, timestamps, and provenance
- Support multiple ingest paths: hooks, CLI, stdin/pipe, SDK, HTTP, PocketFlow mediation

#### 2. Capsule Storage

- Store capsule records (opened/closed by PocketFlow or self-managed in standalone mode)
- Bind observations to capsules
- Track capsule status transitions

#### 3. Mechanical Retrieval

Kindling ships with a minimal, mechanical retrieval layer that asserts no meaning, performs no semantic interpretation, and exists solely to prevent data capture without visibility. All higher-order reasoning is explicitly deferred to Ember.

This layer provides:

- BM25 FTS search (statistical index property, not interpretation)
- Recency/temporal filtering (timestamp queries, not relevance ranking)
- Scope-filtered queries (by repo, session, agent, time range)
- Session-start context dump (last session's observations for same repo)
- Bounded result sets ("give me N matching results")

This layer does not provide:

- Relevance ranking beyond BM25
- Token-budgeted context assembly
- Importance or salience decisions
- Summaries or condensation
- Pattern detection

#### 4. Data Hygiene

- Automatic secret stripping on capture (API keys, tokens, passwords, credentials)
- Path exclusion (.env, .pem, .key, credentials files)
- Content truncation (storage bound)
- Redaction (user-initiated content removal, preserving provenance)
- Retention mechanisms (compaction, deletion primitives — policy defined externally)

#### 5. User Annotations

Kindling supports non-semantic annotations explicitly supplied by users:

- Personal tags (user_tags[], starred, notes)
- Optional, attributed to a user, clearly marked as user-supplied
- Never used for system ranking unless Ember consumes them

Canonical/promoted tags belong to Edda.

#### 6. Pluggable Indexing

- FTS5 (default, always available)
- Trigram, vector, or other indices may be added as mechanisms
- Kindling returns matches given a query — does not interpret or decide inclusion
- Ember owns ranking and selection of index results

#### 7. Export & Import

- Portable JSON bundles with deterministic ordering
- Scope-filtered export
- Idempotent import (INSERT OR IGNORE)
- Dry-run import support
- Round-trip guarantee: export -> import -> export produces identical data

### Data Model

#### Observation

```typescript
interface Observation {
  id: string;
  kind: ObservationKind;
  content: string;
  provenance: Record<string, unknown>;
  ts: number;
  scopeIds: ScopeIds;
  redacted: boolean;
}
```

Observations are append-only. Only the `redacted` flag can change.

#### Capsule

```typescript
interface Capsule {
  id: string;
  type: CapsuleType;
  intent: string;
  status: CapsuleStatus; // open -> closed
  openedAt: number;
  closedAt?: number;
  scopeIds: ScopeIds;
  observationIds: string[];
}
```

Capsule lifecycle is driven by PocketFlow when present. In standalone mode, Kindling manages its own capsule lifecycle.

#### ScopeIds

```typescript
interface ScopeIds {
  sessionId?: string;
  repoId?: string;
  agentId?: string;
  userId?: string;
}
```

All queries accept optional scope filters. AND semantics: all specified dimensions must match.

### Storage

- Embedded SQLite with FTS5, WAL mode
- Default location: `~/.kindling/kindling.db`
- Overridable via environment or explicit path
- Migrations are additive only, applied on DB open, idempotent
- Separate from Ember/Edda/Anvil storage (distinct migration pipelines, distinct modules)

### Non-Responsibilities

Kindling does not:

- Generate summaries (Ember)
- Infer intent (Ember)
- Score confidence or importance (Ember)
- Assemble token-budgeted context (Ember)
- Store promoted/canonical knowledge (Edda)
- Define or evaluate retention policy (Anvil)
- Orchestrate execution (PocketFlow)

---

## Ember — Candidate Memory & Pattern Evaluation Layer

### Purpose

Ember is an intermediate analysis system that evaluates observed activity and proposes candidate memories. It consumes Kindling events and aggregates them across time, sessions, tools, and agents to detect patterns that might be meaningful. Ember applies heuristics, rules, and optionally AI-assisted analysis to generate candidate memory proposals, each with explicit rationale and confidence.

### Key Technical Properties

- Read-heavy on Kindling data
- Write-light, proposal-oriented output
- Ephemeral by default (TTL / decay semantics)
- Probabilistic and fallible
- Explainable decision rationale

### Core Responsibilities

- Summaries and condensation of capsule content
- Intent inference from observations
- Confidence scoring and pattern detection
- Token-budgeted context assembly (deciding what to include under a budget)
- Relevance ranking beyond mechanical BM25
- Candidate memory proposals with rationale

### Non-Responsibilities

Ember does not create durable memory. It produces suggestions that can be reviewed, edited, promoted, or discarded. Ember exists to reduce noise while avoiding premature commitment.

---

## Edda — Canonical Memory & Knowledge Store

### Purpose

Edda is a curated, durable knowledge system for institutional memory. It stores explicitly promoted memory objects such as decisions, patterns, constraints, lessons, and doctrines. Edda entries are structured, versioned, and fully traceable back to their originating observations and proposals.

### Key Technical Properties

- Low-volume, high-trust storage
- Strong schema discipline
- Explicit versioning and supersession
- Deterministic retrieval
- Auditability and provenance guarantees

### Core Responsibilities

- Store promoted, curated memory objects
- Version management and supersession tracking
- Stable identifiers and deterministic retrieval
- Canonical tags and categorisation
- Hold enforcement ("promoted items must never be deleted")

### Non-Responsibilities

Edda is deliberately conservative. Memory enters only through explicit promotion, and change is slow, reviewable, and attributable. Edda represents what the system claims to know, not what it has merely observed.

---

## Anvil — Intent, Constraint & Governance Engine

### Purpose

Anvil is a planning, intent, and enforcement system that governs what should happen and whether it is allowed to happen. It defines structured plans, constraints, policies, and expected outcomes, and evaluates execution against those declarations.

### Key Technical Properties

- Deterministic plan and policy definitions
- Pre- and post-execution evaluation
- Real-time interception capability
- Non-probabilistic enforcement
- Human- and machine-readable constraints

### Core Responsibilities

- Define plans, constraints, policies, acceptable outcomes
- Define retention rules
- Provide policy definitions to PocketFlow for mechanical enforcement
- Read Edda for precedent and institutional knowledge
- Request queries from Kindling/Ember

### Non-Responsibilities

Anvil does not observe passively and does not remember historically. It asserts what is supposed to happen. Enforcement of policy at runtime is PocketFlow's responsibility.

---

## System Interaction Model

### 1. Intent & Execution (Anvil + PocketFlow)

Anvil defines plans, constraints, policies, and acceptable outcomes. PocketFlow enforces these mechanically at runtime: allowing, blocking, or flagging actions based on preconditions, postconditions, and runtime invariants.

### 2. Observation (Kindling)

As execution occurs, PocketFlow routes observations to Kindling. Kindling records what actions were taken, by whom or what, using which tools, with what outcomes. Kindling does not care whether actions were correct, permitted, or successful. It records them anyway.

### 3. Interpretation (Ember)

Ember continuously or periodically analyses Kindling data. It correlates events with each other, execution context, and Anvil plans/constraints. Ember identifies candidate meaning: recurring failures, successful resolutions, repeated human intervention, policy friction, emergent patterns across agents.

### 4. Memory Promotion (Ember to Edda)

Ember emits proposals, not facts. Proposals are reviewed or evaluated by humans, governance rules, or Anvil-mediated workflows. Approved proposals are promoted into Edda as durable memory objects. This boundary is explicit and auditable.

### 5. Recall & Feedback (Edda to Anvil / Ember)

Edda provides constraints, lessons, historical decisions, and institutional knowledge. Anvil may reference Edda to refine plans, enforce precedent, and avoid previously rejected approaches. Ember may reference Edda to weight proposals, detect regressions, and recognise known patterns.

---

## Boundary Rules

### Mechanism vs Policy

Throughout the system, mechanisms and policies are separated:

| Mechanism (how)                          | Policy (what/when/why)              |
| ---------------------------------------- | ----------------------------------- |
| Kindling: deletion/compaction primitives | Anvil: retention rules              |
| PocketFlow: runtime enforcement          | Anvil: policy definitions           |
| Kindling: TTL as operational property    | Anvil: TTL duration decisions       |
| PocketFlow: capsule open/close execution | PocketFlow: capsule lifecycle rules |

### Tag Ownership

| Layer    | Tag Type                                                             |
| -------- | -------------------------------------------------------------------- |
| Kindling | Personal indexing of raw signal (optional, attributed, non-semantic) |
| Edda     | Canonical categorisation of durable memory                           |

### Index vs Interpretation

| Layer    | Responsibility                                          |
| -------- | ------------------------------------------------------- |
| Kindling | Pluggable indices (FTS, trigram, vector) as mechanism   |
| Ember    | Ranking, selection, and interpretation of index results |

### Query vs Assembly

| Layer    | Responsibility                                                    |
| -------- | ----------------------------------------------------------------- |
| Kindling | "Give me last 200 events from capsule X", "N FTS results by BM25" |
| Ember    | "Assemble best context for this prompt within N tokens"           |

### Capsule Lifecycle

| Scenario                   | Owner                                                 |
| -------------------------- | ----------------------------------------------------- |
| PocketFlow present         | PocketFlow drives open/close; Kindling stores records |
| Standalone (no PocketFlow) | Kindling manages its own capsule lifecycle            |

---

## Storage Strategy

Each layer owns its own storage with strict boundaries:

- Separate SQLite files (`kindling.sqlite`, `ember.sqlite`, `edda.sqlite`) or one file with attached databases and strict module ownership
- Distinct migration pipelines per layer
- Distinct packages/modules
- Hard "no imports back" rule (downstream layers do not write to upstream stores)

This achieves local simplicity without architectural collapse.

---

## Standalone Kindling (Without Ember, Edda, Anvil, or PocketFlow)

Kindling is useful as a standalone open-source tool when it includes its built-in mechanical retrieval layer. Without this layer, it is infrastructure without visibility.

Standalone Kindling provides:

- Zero-config capture via AI tool plugins (Claude Code, etc.)
- CLI for search, inspection, export/import, redaction
- Session-start context dump (temporal, not ranked)
- BM25 FTS search over all observations
- Scoped queries by repo, session, agent

Standalone Kindling defers to Ember (when available) for:

- Summaries
- Ranked retrieval
- Token-budgeted context assembly
- Pattern detection

The built-in retrieval layer is the "SQLite FTS5" equivalent: good enough for standalone use, replaceable by Ember for real interpretation.
