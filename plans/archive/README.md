# Archive

This directory contains completed and superseded APS modules that are no longer actively being worked on.

## Purpose

Modules are archived when all their work items reach "Complete" status. Archiving keeps the active planning space clean while preserving historical context and decisions.

## What Gets Archived

- **Completed modules**: All work items finished, no active development
- **Superseded modules**: Replaced by a different approach or module
- **Associated action plans**: Execution plans linked to archived modules

## What Stays Active

- `aps-rules.md` - Never archived
- `index.aps.md` - Updated but never archived
- `decisions/` - ADRs are preserved indefinitely in their original location

## Archiving Process

When archiving a module:

1. Move the module file from `modules/` to `archive/`
2. Move associated action plans from `execution/` to `archive/execution/` (if applicable)
3. Update `index.aps.md` to mark the module status as "Complete (archived)" and update the path
4. Add an archive note to the top of the file with date and reason

## Format

Archived files include a header comment:

```markdown
<!-- Archived: YYYY-MM-DD | Reason: All work items complete -->
```

This preserves the audit trail and makes it clear why the module was archived.
