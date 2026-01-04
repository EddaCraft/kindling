# Steps: ADAPTER-PF-001

| Field | Value |
|-------|-------|
| Source | [../modules/kindling-adapter-pocketflow.aps.md](../modules/kindling-adapter-pocketflow.aps.md) |
| Task(s) | ADAPTER-PF-001 — Confirm PocketFlow license and vendoring approach |
| Created by | @aneki / AI |
| Status | Draft |

## Why This Matters

PocketFlow is an external dependency. Before integrating it, we must ensure legal compliance and establish a sustainable maintenance approach. Vendoring provides stability but requires clear processes for updates.

## What We're Building

Documentation and decision record for:
- License verification
- Integration approach (vendored vs dependency)
- Update procedures
- Attribution requirements

## Prerequisites

- [ ] PocketFlow repository accessible
- [ ] Legal/compliance guidance available (if applicable)

## Steps

### 1. Verify PocketFlow license

- **Why:** Integration requires compatible licensing
- **What:** License review and documentation
- **Checkpoint:** Documented verification:
  - License type (expected: MIT)
  - License text captured
  - Compatible with Apache-2.0 (Kindling's license)
  - Any attribution requirements noted
- **Validate:** Legal review complete

### 2. Evaluate vendoring vs dependency

- **Why:** Each approach has tradeoffs
- **What:** Decision analysis
- **Checkpoint:** Decision documented with rationale:
  - **Vendor**: Stability, no external fetch, larger repo
  - **Dependency**: Smaller repo, easier updates, external risk
  - Recommended approach selected
- **Validate:** Decision recorded

### 3. Document integration approach

- **Why:** Future maintainers need clear guidance
- **What:** Integration documentation
- **Checkpoint:** `docs/third-party/pocketflow.md` contains:
  - Source repository URL
  - Commit hash or version tag
  - License text (full or link)
  - Rationale for chosen approach
- **Validate:** Documentation exists

### 4. Create update procedure

- **Why:** PocketFlow may evolve; we need a safe update path
- **What:** Documented update process
- **Checkpoint:** `docs/third-party/pocketflow.md` includes:
  - How to check for updates
  - How to apply updates (vendor) or bump version (dependency)
  - Testing requirements before update
  - Changelog review process
- **Validate:** Procedure documented

### 5. Set up integration (if vendoring)

- **Why:** Vendored code needs to be properly placed
- **What:** Copy and attribution
- **Checkpoint:** If vendoring:
  - Source copied to `vendor/pocketflow/`
  - LICENSE file preserved
  - README noting origin
  - .gitkeep or similar for empty dirs
- **Validate:** Files in place

### 6. Set up integration (if dependency)

- **Why:** Dependency needs proper package management
- **What:** Package addition
- **Checkpoint:** If dependency:
  - Added to package.json
  - Version pinned (not floating)
  - Lock file updated
  - Import works
- **Validate:** `pnpm install` succeeds

### 7. Add integration verification test

- **Why:** Confirm PocketFlow is accessible
- **What:** Simple import/usage test
- **Checkpoint:** `test/pocketflow.setup.spec.ts`:
  - Imports PocketFlow successfully
  - Basic API accessible
  - Documents minimum viable integration
- **Validate:** `pnpm test -- pocketflow.setup`

## Completion

- [ ] All checkpoints validated
- [ ] Task marked complete in source module

**Completed by:** ___
