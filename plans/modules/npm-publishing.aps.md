# NPM Publishing Readiness

| Scope | Owner  | Priority | Status |
| ----- | ------ | -------- | ------ |
| NPM   | @aneki | high     | Ready  |

## Purpose

Prepare all Kindling packages for public npm publishing with proper metadata, documentation, and CI/CD automation. This enables the OSS v0.1 release.

## In Scope

- Package.json metadata completeness (author, repository, keywords, homepage, bugs)
- Package README documentation
- Root CHANGELOG.md
- Publishing scripts and configuration
- GitHub Actions publish workflow
- CLI executable verification
- Native dependency documentation

## Out of Scope

- Version bumping strategy (manual for v0.1)
- Semantic release automation (future)
- GitHub Package Registry publishing (future)
- Prebuilt binaries for better-sqlite3 (document requirements instead)

## Interfaces

**Depends on:**

- All package builds must succeed
- All tests must pass

**Exposes:**

- Published packages on npmjs.com under `@kindling/*` scope
- `kindling` CLI binary via `@kindling/cli`

## Boundary Rules

- All packages must have consistent metadata structure
- Package READMEs must link back to main repository
- CHANGELOG follows Keep a Changelog format
- Publish workflow requires passing tests

## Acceptance Criteria

- [x] All 6 packages have complete metadata (author, repository, keywords, homepage, bugs)
- [x] All 6 packages have README.md files
- [x] Root CHANGELOG.md documents v0.1.0 release
- [x] `pnpm pack --dry-run` succeeds for all packages
- [x] GitHub Actions publish workflow exists and is valid
- [x] CLI binary is executable after installation

## Risks & Mitigations

| Risk                                           | Mitigation                                                |
| ---------------------------------------------- | --------------------------------------------------------- |
| better-sqlite3 build failures on user machines | Document build requirements in README                     |
| Workspace protocol in published packages       | pnpm handles workspace:\* → version conversion on publish |
| Missing npm credentials in CI                  | Document NPM_TOKEN setup in workflow                      |

## Tasks

### NPM-001: Add package metadata to all package.json files

- **Status:** Complete
- **Intent:** Ensure all packages meet npm publishing requirements and are discoverable
- **Expected Outcome:** Each package has author, repository, keywords, homepage, bugs fields
- **Scope:** All 6 package.json files
- **Non-scope:** Version changes, dependency updates
- **Files:**
  - `packages/kindling-core/package.json`
  - `packages/kindling-store-sqlite/package.json`
  - `packages/kindling-provider-local/package.json`
  - `packages/kindling-adapter-opencode/package.json`
  - `packages/kindling-adapter-pocketflow/package.json`
  - `packages/kindling-cli/package.json`
- **Dependencies:** (none)
- **Validation:** `pnpm -r exec -- node -e "const p=require('./package.json'); if(!p.author||!p.repository||!p.keywords) process.exit(1)"`
- **Confidence:** high
- **Risks:** None

### NPM-002: Create package README files

- **Status:** Complete
- **Intent:** Provide documentation for each package on npm
- **Expected Outcome:** Each package has a README with installation, usage, and API overview
- **Scope:** 5 packages (adapter-opencode already has README)
- **Non-scope:** Comprehensive API documentation
- **Files:**
  - `packages/kindling-core/README.md`
  - `packages/kindling-store-sqlite/README.md`
  - `packages/kindling-provider-local/README.md`
  - `packages/kindling-adapter-pocketflow/README.md`
  - `packages/kindling-cli/README.md`
- **Dependencies:** (none)
- **Validation:** All README.md files exist and are non-empty
- **Confidence:** high
- **Risks:** None

### NPM-003: Create CHANGELOG.md

- **Status:** Complete
- **Intent:** Document release history for users and maintainers
- **Expected Outcome:** Root CHANGELOG.md with v0.1.0 initial release notes
- **Scope:** Root repository
- **Non-scope:** Automated changelog generation
- **Files:** `CHANGELOG.md`
- **Dependencies:** (none)
- **Validation:** CHANGELOG.md exists with ## [0.1.0] section
- **Confidence:** high
- **Risks:** None

### NPM-004: Add publish scripts and configuration

- **Status:** Complete
- **Intent:** Streamline the publishing process
- **Expected Outcome:** Root package.json has prepublishOnly and release scripts; .npmrc configured
- **Scope:** Root configuration
- **Non-scope:** Individual package scripts
- **Files:**
  - `package.json`
  - `.npmrc`
- **Dependencies:** (none)
- **Validation:** `pnpm run prepublishOnly` succeeds
- **Confidence:** high
- **Risks:** None

### NPM-005: Create GitHub Actions publish workflow

- **Status:** Complete
- **Intent:** Automate npm publishing on version tags
- **Expected Outcome:** Workflow triggers on v\* tags, runs tests, publishes to npm
- **Scope:** CI/CD configuration
- **Non-scope:** Semantic release, automatic version bumping
- **Files:** `.github/workflows/publish.yml`
- **Dependencies:** NPM-001, NPM-004
- **Validation:** Workflow syntax is valid (actionlint or gh workflow lint)
- **Confidence:** medium
- **Risks:** NPM_TOKEN must be configured as repository secret

### NPM-006: Verify CLI executable

- **Status:** Complete
- **Intent:** Ensure CLI works after npm installation
- **Expected Outcome:** CLI has hashbang, is executable, --help works
- **Scope:** CLI package
- **Non-scope:** CLI feature completeness
- **Files:** `packages/kindling-cli/src/cli.ts`
- **Dependencies:** (none)
- **Validation:** `node packages/kindling-cli/dist/cli.js --help` exits 0
- **Confidence:** high
- **Risks:** None

## Decisions

- **D-001:** Use `access=public` in .npmrc for scoped package publishing
- **D-002:** Document better-sqlite3 build requirements rather than bundling prebuilt binaries
- **D-003:** Manual version bumping for v0.1; automate in future milestones

## Notes

- All packages are currently at v0.1.0
- The @kindling npm scope must be claimed/verified before first publish
- Workspace protocol (workspace:\*) is automatically converted to actual versions by pnpm on publish
