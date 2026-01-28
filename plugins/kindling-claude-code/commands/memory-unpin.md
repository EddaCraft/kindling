---
name: memory unpin
description: Remove a pinned observation
arguments:
  - name: id
    description: The pin ID (first 8 characters are enough)
    required: true
---

# Memory Unpin

Remove a pin by its ID.

## Instructions

When the user runs `/memory unpin <id>`:

1. Read pins from `~/.kindling/pins.json`
2. Find the pin matching the provided ID (partial match supported)
3. Remove it and save
4. Confirm removal to the user

## Implementation

```bash
node -e "
const fs = require('fs');
const path = require('path');
const os = require('os');

const dir = path.join(os.homedir(), '.kindling');
const pinsFile = path.join(dir, 'pins.json');
const pinId = process.argv[1] || '';

if (!pinId) {
  console.log('Usage: /memory unpin <id>');
  console.log('Get pin IDs from /memory pins');
  process.exit(0);
}

if (!fs.existsSync(pinsFile)) {
  console.log('No pins found.');
  process.exit(0);
}

const pins = JSON.parse(fs.readFileSync(pinsFile, 'utf-8'));
const index = pins.findIndex(p => p.id.startsWith(pinId));

if (index === -1) {
  console.log('Pin not found: ' + pinId);
  console.log('Use /memory pins to see all pin IDs.');
  process.exit(0);
}

const removed = pins.splice(index, 1)[0];
fs.writeFileSync(pinsFile, JSON.stringify(pins, null, 2));

console.log('Removed pin:');
console.log('  ID: ' + removed.id.substring(0, 8));
console.log('  Note: ' + removed.note);
console.log('');
console.log('Remaining pins: ' + pins.length);
" "$1"
```

## Example Output

```
Removed pin:
  ID: a3f2b1c4
  Note: Root cause fix for auth bug

Remaining pins: 2
```
