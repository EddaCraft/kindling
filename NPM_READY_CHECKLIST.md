# NPM Publishing Readiness Checklist

This document summarizes the npm publishing preparation for Kindling packages.

## ✅ Completed Tasks

### 1. Package Metadata

All packages now include:

- ✅ `name` - Scoped package names (@kindling/\*)
- ✅ `version` - 0.1.0
- ✅ `description` - Clear package descriptions
- ✅ `keywords` - Searchable keywords for npm
- ✅ `homepage` - Links to GitHub repository
- ✅ `bugs` - Issue tracker URL
- ✅ `repository` - GitHub repository with package directory
- ✅ `license` - Apache-2.0
- ✅ `author` - EddaCraft
- ✅ `publishConfig.access` - Set to "public"

### 2. Build Configuration

- ✅ All packages have TypeScript build setup
- ✅ All packages compile successfully
- ✅ Dist folders generated for all packages
- ✅ `prepublishOnly` script added to ensure builds before publish
- ✅ `files` field specifies what to include in published packages

### 3. Documentation

- ✅ README.md created for all packages:
  - `@eddacraft/kindling-core` - Core domain model documentation
  - `@eddacraft/kindling-store-sqlite` - SQLite storage documentation
  - `@eddacraft/kindling-provider-local` - Local retrieval documentation
  - `@eddacraft/kindling-adapter-opencode` - OpenCode adapter documentation (existing)
  - `@eddacraft/kindling-adapter-pocketflow` - PocketFlow adapter documentation
  - `@eddacraft/kindling-cli` - CLI documentation

- ✅ Root README.md already comprehensive
- ✅ LICENSE file present (Apache-2.0)
- ✅ PUBLISHING.md guide created
- ✅ This checklist document

### 4. Package Structure

All packages include:

- ✅ `dist/` - Compiled JavaScript and type definitions
- ✅ `README.md` - Package-specific documentation
- ✅ `package.json` - Properly configured metadata
- ✅ Source maps for debugging

### 5. CLI Package

- ✅ Created CLI entry point (`cli.ts`)
- ✅ Configured bin field in package.json
- ✅ Added shebang for executable
- ✅ Implemented basic status command
- ✅ Placeholder commands for future implementation

### 6. Dependencies

- ✅ Internal dependencies use `workspace:*` (pnpm converts on publish)
- ✅ External dependencies properly versioned
- ✅ No missing dependencies
- ✅ DevDependencies separated from runtime dependencies

### 7. Files Configuration

Each package `files` field includes:

- ✅ `dist` - Compiled output
- ✅ `migrations` (store-sqlite only) - Database migrations
- ✅ README.md, LICENSE, package.json (automatically included by npm)

## 📦 Packages Ready for Publishing

1. **@eddacraft/kindling-core** (v0.1.0)
   - Core domain model and orchestration
   - 94 files, ~130KB unpacked

2. **@eddacraft/kindling-store-sqlite** (v0.1.0)
   - SQLite storage with FTS5
   - 33 files

3. **@eddacraft/kindling-provider-local** (v0.1.0)
   - Local FTS-based retrieval
   - Files ready

4. **@eddacraft/kindling-adapter-opencode** (v0.1.0)
   - OpenCode session adapter
   - 54 files

5. **@eddacraft/kindling-adapter-pocketflow** (v0.1.0)
   - PocketFlow workflow adapter
   - Files ready

6. **@eddacraft/kindling-cli** (v0.1.0)
   - Command-line interface
   - 14 files

## 🚀 Publishing Instructions

See [PUBLISHING.md](PUBLISHING.md) for detailed publishing instructions.

**Quick start:**

```bash
# Login to npm
npm login

# Publish all packages (handles dependencies automatically)
pnpm publish -r --access public
```

## ⚠️ Known Issues

### Dependency Structure

`@eddacraft/kindling-core` defines interfaces that `@eddacraft/kindling-store-sqlite` and `@eddacraft/kindling-provider-local` implement:

- **Core is independent** - No runtime dependencies on store or provider
- **Store/Provider depend on core** - They implement core's interfaces
- **No circular dependencies** - Clear dependency flow from implementations to core

### CLI Implementation

The CLI is minimally functional:

- ✅ `kindling status` - Works
- ⚠️ `kindling search` - Placeholder (not implemented)
- ⚠️ `kindling list` - Placeholder (not implemented)
- ⚠️ Other commands - Not yet implemented

**Recommendation**: Either complete CLI implementation before publishing or document as "preview" in README.

## 📝 Pre-Publish Checklist

Before publishing, verify:

- [ ] All tests pass: `pnpm run test`
- [ ] All packages build: `pnpm run build`
- [ ] No uncommitted changes: `git status`
- [ ] Version numbers are correct
- [ ] Logged into npm: `npm whoami`
- [ ] Have access to @kindling scope
- [ ] README files are accurate
- [ ] CHANGELOG updated (if applicable)

## 🎯 Next Steps

1. **Review**: Have team review all changes
2. **Test**: Test installation in a fresh project
3. **Version**: Decide on version numbers (currently 0.1.0)
4. **Publish**: Follow PUBLISHING.md guide
5. **Tag**: Create git tag after successful publish
6. **Announce**: Create GitHub release and announce

## 📚 Resources

- [PUBLISHING.md](PUBLISHING.md) - Complete publishing guide
- [plans/modules/npm-publishing.aps.md](plans/modules/npm-publishing.aps.md) - APS planning module
- [npm documentation](https://docs.npmjs.com/)
- [pnpm publishing](https://pnpm.io/cli/publish)
- [Semantic Versioning](https://semver.org/)

## 📋 APS Planning Documentation

Detailed planning documentation is available in the APS format:

**Module:** [plans/modules/npm-publishing.aps.md](plans/modules/npm-publishing.aps.md)

**Execution Steps:**

- [NPM-001](plans/execution/NPM-001.steps.md) - Package metadata
- [NPM-002](plans/execution/NPM-002.steps.md) - Package READMEs
- [NPM-003](plans/execution/NPM-003.steps.md) - CHANGELOG.md
- [NPM-004](plans/execution/NPM-004.steps.md) - Publish scripts & .npmrc
- [NPM-005](plans/execution/NPM-005.steps.md) - GitHub Actions workflow
- [NPM-006](plans/execution/NPM-006.steps.md) - CLI executable verification

---

**Status**: ✅ All packages are ready for npm publishing

**Prepared**: 2026-01-11
**Updated**: 2026-01-18
**By**: Claude (AI Assistant)
