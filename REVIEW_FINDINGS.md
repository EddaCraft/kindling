# Code Review Findings - Kindling Project

**Date**: 2026-01-01
**Reviewer**: Claude Code
**Branch**: claude/code-project-review-t5QPW

---

## Executive Summary

**Project Phase**: Planning (100% complete) → Ready to begin M1 (Scaffolding)

**Planning Quality**: ⭐⭐⭐⭐⭐ Exceptional
- Comprehensive architecture with clear boundaries
- 6 detailed module specifications
- 27 execution step guides with rationale
- Well-defined design decisions and success criteria
- Security and privacy considerations addressed

**Code Quality**: N/A (no implementation code exists yet)

---

## Issues Found & Fixed

### ✅ Fixed (Committed)

1. **File Header Mismatch** (plans/index.aps.md:1)
   - Was: `# PLAN_NEXT.md`
   - Now: `# Kindling OSS v0.1 – Project Plan`
   - Impact: Confusion about file naming

2. **Commit Message Style** (CONTRIBUTING.md:37)
   - Was: `Feat:` (capitalized)
   - Now: `feat:` (conventional commits standard)
   - Impact: Could lead to inconsistent commit history

3. **Spelling Inconsistency**
   - Standardized British → American English
   - "organises" → "organizes"
   - "organisational" → "organizational"
   - Impact: Professional consistency

4. **Missing Critical Documentation** ⚠️
   - Created `docs/architecture.md` (197 lines)
   - Created `docs/data-model.md` (216 lines)
   - Created `docs/retrieval-contract.md` (248 lines)
   - Impact: These were referenced in README/llms.txt but empty, blocking M1

---

## Critical Issues Requiring Decisions

### 🔴 Priority 1: Package Infrastructure Missing (Blocks M1)

**Problem**: M1 milestone requires "repo builds, types compile" but foundational config is missing:

**Missing Files**:
- `package.json` (root)
- `pnpm-workspace.yaml` (monorepo configuration)
- `tsconfig.json` (base TypeScript config)
- `packages/*/package.json` (per-package configs)
- `packages/*/tsconfig.json` (per-package TS configs)

**Required Decisions**:

1. **Package Manager Setup**
   - Confirm pnpm as package manager (indicated in docs)
   - pnpm version constraint? (recommend: `"packageManager": "pnpm@9.0.0"`)
   - Use workspace protocol? (`workspace:*` for inter-package deps)

2. **Monorepo Structure**
   - Confirm 6 packages as documented:
     ```
     packages/
     ├── kindling-core/
     ├── kindling-store-sqlite/
     ├── kindling-provider-local/
     ├── kindling-adapter-opencode/
     ├── kindling-adapter-pocketflow/
     └── kindling-cli/
     ```
   - Use single version for all packages or independent versioning?
   - Shared vs per-package dependencies?

3. **TypeScript Configuration**
   - Strict mode: Confirmed in docs ✓
   - Target: ES2022? ES2023?
   - Module: ESNext + moduleResolution: bundler?
   - Path aliases for imports? (`@kindling/core`, etc.)
   - Composite project references for faster builds?

4. **Build System**
   - Use `tsc` directly or bundler (esbuild, tsup, etc.)?
   - Output: ESM only, or dual ESM/CJS?
   - Build scripts location: root or per-package?

5. **Testing Framework**
   - Confirm Jest vs Vitest (docs mention both)
   - Configuration: Workspace-level or per-package?
   - Coverage thresholds?

6. **Linting & Formatting**
   - ESLint configuration?
   - Prettier (alongside markdownlint)?
   - Husky for pre-commit hooks?

**Recommendation**: I can scaffold the complete package infrastructure based on industry best practices for TypeScript monorepos, but I need your preferences on the above decisions.

---

## Architectural Observations

### ✅ Strengths

1. **Clear Separation of Concerns**
   - Infrastructure vs governance boundary well-defined
   - Provider abstraction enables future extensions
   - Adapter pattern for integrations

2. **Determinism & Explainability First**
   - No stochastic behavior in retrieval
   - Explicit tiebreaker rules
   - Provenance preserved through redaction

3. **Local-First Design**
   - Embedded SQLite (no external deps)
   - Portable, auditable storage
   - Clear DB location conventions

4. **Security Considerations**
   - Secret filtering at adapter level
   - First-class redaction support
   - FTS compliance with privacy

5. **Conservative Approach**
   - Minimal summarization in v0.1
   - Raw observations retained
   - Additive-only schema migrations

### 💡 Design Questions (Not blockers, for discussion)

1. **Schema Migrations Strategy**
   - Plans mention "additive only" but what about breaking changes in future major versions?
   - Backward compatibility policy for older DBs?
   - Migration rollback support?

2. **Capsule Auto-Close Timeout**
   - What's the default inactivity timeout value?
   - Should it be configurable per-capsule-type?
   - What happens to orphaned observations if capsule close fails?

3. **Token Counting Implementation**
   - KINDLING-004 mentions token counting but no library specified
   - Use `tiktoken` (OpenAI), `gpt-tokenizer`, or custom?
   - Different tokenizers for different LLM providers?

4. **Provider Interface Versioning**
   - How will you handle provider interface changes?
   - Semantic versioning for provider contract?
   - Deprecation policy?

5. **SQLite Concurrency**
   - WAL mode handles concurrent reads well, but write contention?
   - Expected write volume per session?
   - Busy timeout value (5000ms default reasonable)?

6. **FTS5 Configuration**
   - Which tokenizer for FTS? (unicode61, porter, trigram?)
   - Ranking function customization?
   - Index rebuild strategy if FTS config changes?

7. **Export/Import Format**
   - Binary SQLite dump or JSON/NDJSON?
   - Compression support?
   - Partial export by scope?

---

## Security & Privacy Assessment ✅

**Overall**: Well-considered for v0.1

**Positive Findings**:
- Secret detection patterns documented (ADAPTER-OC-004, ADAPTER-PF-004)
- Redaction as first-class feature
- Local-only data (no external services)
- FTS compliance with redacted content

**Recommendations**:
1. Consider adding `.env` to secret detection patterns
2. Document what happens if secrets are detected in pinned observations
3. Add section on responsible disclosure in SECURITY.md (✅ already present)
4. Consider logging policy for secrets detected but not redacted

---

## Testing Strategy Assessment

**Documented Approach**: ✅ Good
- Tests alongside implementation
- Acceptance criteria for each module
- Validation points in execution steps

**Gaps to Address During Implementation**:
1. Integration test strategy (cross-package tests)
2. Performance benchmarks (RETRIEVAL-005 covers this)
3. Migration testing strategy (mentioned but needs detail)
4. Contract testing between packages

---

## Documentation Quality ✅

**Planning Documentation**: Excellent
- Clear problem statements
- Explicit non-goals
- Decision rationale
- Execution steps with "Why this matters"

**User-Facing Documentation**: Now complete (after my fixes)
- README: Clear, concise
- Architecture: Comprehensive system design
- Data Model: Detailed types and validation
- Retrieval Contract: Explicit guarantees and interfaces

**Missing (For Later)**:
- User guides (expected post-M2)
- API reference (expected post-implementation)
- Migration guide for future versions
- Contribution examples

---

## Next Steps Recommendation

### Immediate (M1 - Scaffolding)

1. **Decide on package infrastructure** (see questions above)
2. **Create package structure**:
   ```bash
   mkdir -p packages/{kindling-core,kindling-store-sqlite,kindling-provider-local,kindling-adapter-opencode,kindling-adapter-pocketflow,kindling-cli}/src
   ```
3. **Scaffold configuration files**:
   - Root package.json with workspaces
   - pnpm-workspace.yaml
   - Root tsconfig.json + per-package tsconfigs
   - Test configuration
   - ESLint/Prettier (optional but recommended)

4. **Implement KINDLING-001** (Define domain types)
   - Start with types that compile
   - No runtime behavior needed for M1

### After M1

- M2: Implement core functionality (KINDLING-002 through ADAPTER-OC-004)
- M3: PocketFlow adapter
- M4: Hardening & OSS release

---

## Blocking Questions for You

I can proceed with implementation if you provide direction on:

1. **Should I scaffold the complete package infrastructure now?**
   - If yes, I'll use modern TypeScript monorepo best practices (pnpm workspaces, tsup, vitest)
   - If you have specific preferences, let me know

2. **Testing framework preference?**
   - Vitest (recommended: faster, modern, ESM-native)
   - Jest (more mature, larger ecosystem)

3. **Build output format?**
   - ESM only (recommended for modern Node)
   - Dual ESM/CJS (wider compatibility, more complex)

4. **Should I start implementing KINDLING-001 (domain types)?**
   - This would be the first actual code in the project
   - Would follow the execution steps exactly

5. **Any customization to my package.json template?**
   - Specific Node version requirement?
   - Additional scripts or tooling?
   - Private vs public npm packages?

---

## Final Assessment

**Strengths**:
- 🌟 World-class planning and architecture
- 🌟 Clear scope and boundaries
- 🌟 Security and privacy considered
- 🌟 Deterministic, explainable design

**Needs Attention**:
- 🔴 Package infrastructure (blocking M1)
- 🟡 Some architectural details (timeouts, token counting)
- 🟢 Everything else is excellent

**Ready for**: M1 implementation once package structure decisions are made

---

**Commit**: 014a090 - docs: fix documentation issues and create missing docs
**Branch**: claude/code-project-review-t5QPW
**Status**: Pushed to remote, ready for PR
