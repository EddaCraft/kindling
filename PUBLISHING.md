# Publishing Guide for Kindling Packages

This guide covers how to publish Kindling packages to npm.

## Prerequisites

1. **npm Account**: You need an npm account with publish access to the `@kindling` scope
2. **npm Login**: Run `npm login` to authenticate
3. **Build**: Ensure all packages are built with `pnpm run build`

## Package Publishing Order

Due to dependencies between packages, publish in this order:

### 1. Core Foundation (No internal dependencies)
```bash
cd packages/kindling-core
npm publish --access public
```

### 2. Storage Layer (Depends on core)
```bash
cd packages/kindling-store-sqlite
npm publish --access public
```

### 3. Retrieval Layer (Depends on core + store)
```bash
cd packages/kindling-provider-local
npm publish --access public
```

### 4. Adapters (Depend on core)
```bash
cd packages/kindling-adapter-opencode
npm publish --access public

cd packages/kindling-adapter-pocketflow
npm publish --access public
```

### 5. CLI (Depends on core + store)
```bash
cd packages/kindling-cli
npm publish --access public
```

## Automated Publishing with pnpm

Alternatively, use pnpm's workspace publishing feature:

```bash
# Publish all packages in topological order
pnpm publish -r --access public
```

## Pre-Publish Checklist

Before publishing, verify:

- [ ] All packages build successfully: `pnpm run build`
- [ ] All tests pass: `pnpm run test`
- [ ] Version numbers are updated in package.json files
- [ ] CHANGELOG.md is updated (if applicable)
- [ ] README.md files are accurate
- [ ] No uncommitted changes: `git status`
- [ ] All changes are pushed to GitHub

## Workspace Dependencies

The packages use `workspace:*` for internal dependencies during development. When publishing:

- **pnpm publish** automatically converts `workspace:*` to the actual version (e.g., `^0.1.0`)
- **npm publish** does NOT convert workspace protocols - you must manually update before publishing

**Recommended**: Use `pnpm publish` to automatically handle workspace dependencies.

## Versioning Strategy

Kindling follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features, backwards compatible
- **PATCH** (0.0.1): Bug fixes, backwards compatible

### Updating Versions

Update all packages to the same version:

```bash
# Update version in all packages
pnpm -r exec npm version patch   # 0.1.0 -> 0.1.1
pnpm -r exec npm version minor   # 0.1.0 -> 0.2.0
pnpm -r exec npm version major   # 0.1.0 -> 1.0.0
```

Or use a version management tool like [changesets](https://github.com/changesets/changesets):

```bash
npm install -g @changesets/cli
changeset init
changeset
changeset version
```

## Dry Run

Test the publish without actually publishing:

```bash
# Pack and inspect tarball contents
npm pack --dry-run

# Or create actual tarball
npm pack

# Extract and inspect
tar -xzf kindling-core-0.1.0.tgz
ls package/
```

## Troubleshooting

### Dependency Structure

The packages have a clear dependency hierarchy:

- `@kindling/core` has no internal dependencies (defines interfaces)
- `@kindling/store-sqlite` and `@kindling/provider-local` depend on core
- Adapters depend on core
- CLI depends on core and store

### Workspace Protocol Not Converted

If published packages still have `workspace:*` dependencies:

1. You used `npm publish` instead of `pnpm publish`
2. Manually update package.json dependencies before publishing
3. Or use `pnpm publish` which handles this automatically

### Permission Denied

If you get a 403 error:

1. Verify you're logged in: `npm whoami`
2. Verify you have access to `@kindling` scope: `npm access ls-packages @kindling`
3. Contact the org owner to add you as a maintainer

### Build Not Found

If dist folder is missing:

```bash
# Rebuild all packages
pnpm run build

# Or rebuild specific package
cd packages/kindling-core
pnpm run build
```

## Post-Publish

After publishing:

1. **Tag the release** on GitHub:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

2. **Create GitHub Release**:
   - Go to https://github.com/EddaCraft/kindling/releases
   - Create a new release from the tag
   - Include changelog and notable changes

3. **Verify on npm**:
   - Check packages are listed: https://www.npmjs.com/org/kindling
   - Test installation: `npm install @kindling/core`

4. **Update documentation**:
   - Ensure main README.md has correct installation instructions
   - Update any version-specific documentation

## Rollback

If you need to rollback a published version:

```bash
# Deprecate a version (shows warning to users)
npm deprecate @kindling/core@0.1.0 "This version has a critical bug, please upgrade to 0.1.1"

# Unpublish (only within 72 hours, use sparingly)
npm unpublish @kindling/core@0.1.0
```

**Note**: Unpublishing is discouraged. Use deprecate instead.

## Continuous Integration

For automated publishing via CI/CD:

1. **Store npm token** as a secret in GitHub Actions
2. **Add workflow** (`.github/workflows/publish.yml`):

```yaml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install
      - run: pnpm run build
      - run: pnpm run test
      - run: pnpm publish -r --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Resources

- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [pnpm Publishing](https://pnpm.io/cli/publish)
- [Semantic Versioning](https://semver.org/)
- [Changesets](https://github.com/changesets/changesets)
