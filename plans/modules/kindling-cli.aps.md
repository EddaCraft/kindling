# Kindling CLI

Scope: CLI
Owner: @aneki
Priority: medium

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

Depends on:

* kindling-core — primary API

Exposes:

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
**Status:** Draft
**Dependencies:** [STORAGE-001]

**Inputs:**
* DB path configuration from kindling-core

**Deliverables:**
* CLI entry point with argument parsing
* `kindling status` command
* Tests for CLI invocation

### CLI-002: Implement search and list commands

**Intent:** Enable developers to query and browse their local memory.
**Expected Outcome:** Search returns formatted results; list shows entities.
**Confidence:** medium
**Status:** Draft
**Dependencies:** [RETRIEVAL-001, STORAGE-004]

**Deliverables:**
* `kindling search <query>` with formatted output
* `kindling list capsules|pins|observations` with pagination
* Tests for output formatting

### CLI-003: Implement pin management commands

**Intent:** Allow direct pin creation and removal from command line.
**Expected Outcome:** Users can pin/unpin content without an adapter.
**Confidence:** high
**Status:** Draft
**Dependencies:** [STORAGE-002]

**Deliverables:**
* `kindling pin <id>` with optional TTL flag
* `kindling unpin <id>`
* `kindling list pins` with TTL display
* Tests for pin lifecycle

### CLI-004: Implement export/import commands

**Intent:** Support backup, portability, and data migration.
**Expected Outcome:** Export produces portable files; import restores cleanly.
**Confidence:** medium
**Status:** Draft
**Dependencies:** [STORAGE-005]

**Deliverables:**
* `kindling export` with scope filtering
* `kindling import <file>` with validation
* Round-trip tests

## Decisions

* **D-001:** CLI is minimal and focused on inspection/debugging; not a replacement for adapters
* **D-002:** Output is human-readable by default; machine-readable formats (JSON) available via flags

## Notes

* Keep the CLI simple and predictable. It's a debugging and power-user tool, not a primary interface.
