# Steps: RETRIEVAL-005

| Field | Value |
|-------|-------|
| Source | [../modules/kindling-provider-local.aps.md](../modules/kindling-provider-local.aps.md) |
| Task(s) | RETRIEVAL-005 — Provider performance & regression harness |
| Created by | @aneki / AI |
| Status | Draft |

## Why This Matters

Retrieval performance directly impacts user experience. Slow retrieval breaks the flow of AI-assisted development. A benchmark harness catches regressions before they reach users and provides confidence during optimisation.

## What We're Building

A simple performance testing setup that:
- Measures retrieval latency on synthetic data
- Establishes baseline expectations
- Detects performance regressions
- Documents acceptable thresholds

## Prerequisites

- [ ] RETRIEVAL-002 complete (FTS search available)
- [ ] RETRIEVAL-003 complete (ranking available)

## Steps

### 1. Create synthetic test data generator

- **Why:** Consistent test data enables reproducible benchmarks
- **What:** Generator for realistic observation data
- **Checkpoint:** `bench/fixtures/generate.ts` exports:
  - `generateObservations(count, opts)` — creates observations
  - `generateCapsules(count, opts)` — creates capsules
  - Configurable: kinds, content length, time distribution
- **Validate:** `pnpm tsc --noEmit`

### 2. Create fixture files

- **Why:** Pre-generated fixtures ensure benchmark consistency
- **What:** NDJSON files with test data
- **Checkpoint:** `bench/fixtures/` contains:
  - `small.ndjson` (1k observations)
  - `medium.ndjson` (10k observations)
  - Reproducible generation (seeded random)
- **Validate:** Files parse without error

### 3. Implement benchmark runner

- **Why:** Automated benchmarks catch regressions
- **What:** CLI tool for running benchmarks
- **Checkpoint:** `bench/retrieval.local.ts`:
  - Loads fixture into fresh DB
  - Runs set of standard queries
  - Measures p50, p95, p99 latency
  - Outputs results in consistent format
- **Validate:** `pnpm bench` runs without error

### 4. Define standard query set

- **Why:** Consistent queries enable comparison over time
- **What:** Representative query patterns
- **Checkpoint:** `bench/queries.ts` defines:
  - Empty query (recency fallback)
  - Short keyword query ("error")
  - Multi-word query ("test failed assertion")
  - Scoped query (specific session)
- **Validate:** Queries documented

### 5. Establish baseline thresholds

- **Why:** Clear expectations catch regressions
- **What:** Documented performance targets
- **Checkpoint:** `bench/thresholds.ts` defines:
  - Small dataset: p95 < 50ms
  - Medium dataset: p95 < 200ms
  - Documents machine specs for baseline
- **Validate:** Thresholds achievable on dev machine

### 6. Implement regression detection

- **Why:** CI should fail on significant regression
- **What:** Comparison logic for benchmark results
- **Checkpoint:** `bench/compare.ts`:
  - Compares current run to baseline
  - Flags > 20% regression as warning
  - Flags > 50% regression as failure
- **Validate:** `pnpm bench:check` exits non-zero on regression

### 7. Add benchmark documentation

- **Why:** Others need to run and interpret benchmarks
- **What:** README for benchmark suite
- **Checkpoint:** `bench/README.md` documents:
  - How to run benchmarks
  - How to interpret results
  - How to update baselines
  - Hardware considerations
- **Validate:** README exists and is clear

### 8. Add memory baseline

- **Why:** Memory usage affects scalability
- **What:** Simple memory measurement
- **Checkpoint:** Benchmark includes:
  - Peak memory during search
  - Memory after search (leak detection)
  - Documented in results
- **Validate:** Memory stats in output

## Completion

- [ ] All checkpoints validated
- [ ] Task marked complete in source module

**Completed by:** ___
