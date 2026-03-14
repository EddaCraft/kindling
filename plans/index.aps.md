# Kindling — Plan Index

| Field   | Value       |
| ------- | ----------- |
| Status  | In Progress |
| Owner   | @aneki      |
| Created | 2026-03-14  |
| Updated | 2026-03-14  |

## Problem

Kindling is functional (596 tests passing, 9 packages building) but not yet published or optimized for production use. The remaining work falls into two phases: getting the TypeScript packages published to npm, then building a Rust core binary to solve hook latency and distribution pain.

## Success Criteria

- [ ] All packages published to npm under `@eddacraft` scope
- [ ] Claude Code plugin installable without Node.js/C++ toolchain
- [ ] Hook invocations complete in <10ms (currently ~50-90ms)
- [ ] Single-binary distribution for Linux, macOS, Windows

## Constraints

- Small team — work must be sequenced, not parallelized across milestones
- TypeScript adapters and browser store must remain (npm ecosystem consumers)
- Claude Code hook interface (stdin JSON, stdout JSON) must not change
- Existing 596 tests must continue to pass throughout

## Modules

| Module                                                      | Purpose                                        | Status | Dependencies |
| ----------------------------------------------------------- | ---------------------------------------------- | ------ | ------------ |
| [01-npm-publish](./modules/01-npm-publish.aps.md)           | Package metadata, READMEs, publish scripts, CI | Ready  | —            |
| [02-rust-hook-binary](./modules/02-rust-hook-binary.aps.md) | Rust binary for Claude Code hook invocations   | Ready  | 01           |
| [03-rust-cli](./modules/03-rust-cli.aps.md)                 | Full Rust CLI replacing Commander.js           | Draft  | 02           |

## Schedule

| Phase | Modules             | Target                         |
| ----- | ------------------- | ------------------------------ |
| Next  | 01-npm-publish      | Merge open PRs, publish to npm |
| Then  | 02-rust-hook-binary | Rust hook binary (highest ROI) |
| Later | 03-rust-cli         | Full Rust CLI + HTTP server    |

## Risks

| Risk                                        | Impact | Mitigation                                                 |
| ------------------------------------------- | ------ | ---------------------------------------------------------- |
| `@eddacraft/kindling` npm scope unavailable | High   | Check availability early, have fallback scope              |
| Rust cross-compilation edge cases           | Medium | Use `cross` or `cargo-zigbuild`, CI matrix for all targets |
| Two build systems (cargo + pnpm)            | Medium | Keep Rust binary self-contained, no circular deps          |
| TypeScript/Rust JSON schema drift           | Medium | Generate TS types from Rust structs via `ts-rs` crate      |

## Open Questions

- [ ] Is `@eddacraft/kindling` npm scope claimable?
- [ ] Should the Rust binary replace or coexist with the Node.js hook scripts?
- [ ] Does the HTTP API server move to Rust in phase 2 or phase 3?

## Decisions

- **D-001:** Hybrid Rust approach (not full rewrite) — _decided: yes_ — Domain types and adapters stay TypeScript, data plane moves to Rust
- **D-002:** Phase the Rust work — _decided: hooks first, CLI second_ — Hook binary has highest ROI (startup latency + distribution)
