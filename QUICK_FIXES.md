# Quick Fixes for CLI Build

## 1. Add dependencies to CLI package.json

```bash
cd packages/kindling-cli
# Add to dependencies in package.json:
# "@kindling/provider-local": "workspace:*",
# "better-sqlite3": "^12.0.0"
```

## 2. Fix Pin property references

In `src/commands/pin.ts` and `src/commands/search.ts`:
- Change all `pin.note` → `pin.reason`

## 3. Fix openDatabase call in utils.ts

```typescript
// Change:
const db = openDatabase({ dbPath: path });
// To:
const db = openDatabase({ path });
```

## 4. Add missing methods to SqliteKindlingStore

Ensure these methods exist:
- `createPin(pin: Pin)` - probably already exists, just needs export
- `removePin(pinId: ID)` - needs implementation
- `getCapsule(id: ID)` - might need renaming from getCapsuleById

