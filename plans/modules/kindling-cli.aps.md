# Kindling CLI

| Scope | Owner  | Priority | Status |
|-------|--------|----------|--------|
| CLI   | @aneki | medium   | Draft  |

## Purpose

Provides a minimal command-line interface for Kindling, enabling inspection, debugging, export/import, and standalone use without requiring adapters. The CLI ships in v0.1 to support developers who want direct access to their local memory store.

## In Scope

* Memory inspection and search
* Pin management
* Export/import operations
* Database status and diagnostics
* Capsule listing and inspection

## Out of Scope

* Adapter functionality (handled by dedicated adapters)
* Workflow orchestration
* Governance and promotion (Edda concerns)

## Interfaces

**Depends on:**
* kindling-core — primary API

**Exposes:**
* `kindling status` — DB location, counts, health
* `kindling search <query>` — retrieve matching context
* `kindling pin <id>` / `kindling unpin <id>` — manage pins
* `kindling list [capsules|pins|observations]` — list entities
* `kindling export [--scope <scope>]` — export to file
* `kindling import <file>` — import from file

## Tasks

### CLI-001: Implement core CLI scaffold and status command

**Intent:** Establish CLI structure and provide basic diagnostics.

**Expected Outcome:** CLI runs, displays DB location and basic counts.

**Confidence:** high

**Scopes:** [CLI]

**Tags:** [cli, scaffold]

**Dependencies:** [STORAGE-001]

---

### CLI-002: Implement search and list commands

**Intent:** Enable developers to query and browse their local memory.

**Expected Outcome:** Search returns formatted results; list shows entities.

**Confidence:** medium

**Scopes:** [CLI]

**Tags:** [cli, search]

**Dependencies:** [RETRIEVAL-001, STORAGE-004]

---

### CLI-003: Implement pin management commands

**Intent:** Allow direct pin creation and removal from command line.

**Expected Outcome:** Users can pin/unpin content without an adapter.

**Confidence:** high

**Scopes:** [CLI]

**Tags:** [cli, pins]

**Dependencies:** [STORAGE-002]

---

### CLI-004: Implement export/import commands

**Intent:** Support backup, portability, and data migration.

**Expected Outcome:** Export produces portable files; import restores cleanly.

**Confidence:** medium

**Scopes:** [CLI]

**Tags:** [cli, export, import]

**Dependencies:** [STORAGE-005]

---

## Decisions

* **D-001:** CLI is minimal and focused on inspection/debugging; not a replacement for adapters
* **D-002:** Output is human-readable by default; machine-readable formats (JSON) available via flags

## Notes

* Keep the CLI simple and predictable. It's a debugging and power-user tool, not a primary interface.
