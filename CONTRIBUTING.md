# Contributing to Kindling

Thank you for your interest in contributing to Kindling!

## Development Setup

```bash
git clone https://github.com/eddacraft/kindling.git
cd kindling
pnpm install
pnpm build
```

## Local Development

```bash
# Run all tests
pnpm test

# Run tests for a specific package
cd packages/kindling-core
pnpm test
```

```bash
# Build all packages
pnpm build

# Build a specific package
cd packages/kindling-cli
pnpm build
```

## Code Style

- TypeScript for all source code
- Explicit types for public APIs
- Descriptive names — clarity over brevity
- Small, focused functions
- Tests alongside implementation

## Planning (APS)

We track roadmap and module design in APS docs under `plans/`. If your change impacts scope or architecture, please review the relevant plan and consider updating it in the same PR.

## Pull Request Process

1. **Open an issue first** for significant changes to discuss approach
2. **Create a feature branch** from `main`
3. **Write tests** for new (non documentation) functionality
4. **Update documentation** if behaviour changes
5. **Keep PRs focused** on one logical change per PR
6. **Ensure CI passes** before requesting review

### Commit Messages

Use clear, descriptive commit messages:

```
Feat: Add capsule auto-close on session timeout

Capsules now auto-close when the source provides a natural end signal
or after a configurable inactivity timeout. This prevents orphaned
capsules from accumulating.

Closes Issue #42
```

## Scope Guardrails

Kindling is infrastructure for local memory and continuity. Contributions should align with this scope.

### In Scope

- Observation capture and storage
- Capsule lifecycle management
- Retrieval (FTS, recency, deterministic ranking)
- Export/import and portability
- Adapter integrations
- CLI tooling for inspection and debugging
- Performance and reliability improvements
- Documentation and examples

### Out of Scope

These belong to downstream systems and will not be accepted:

- Governance workflows (review, approval, promotion)
- MemoryObject lifecycle management
- Multi-user access control and permissions
- Cloud/server deployment modes
- Semantic/embedding-based retrieval (Phase 2+)
- UI components

If you're unsure whether something is in scope, open an issue to discuss before investing time.

### Feature Requests
For net-new functionality, start with a design conversation. Open an issue describing the problem, your proposed approach (optional), and why it belongs in Kindling. The core team will help decide whether it should move forward; please wait for that approval instead of opening a feature PR directly.

## Questions?

Open an issue for questions about contributing or the codebase.

## License

By contributing, you agree that your contributions will be licensed under the Apache-2.0 License.
