---
name: memory pin
description: Pin an important observation for easy retrieval
arguments:
  - name: note
    description: Note describing why this is important
    required: false
---

# Memory Pin

Pin the most recent observation to mark it as important. Pinned items are highlighted in search results.

## Instructions

When the user runs `/memory pin [note]`:

1. Read the most recent observation from `~/.kindling/observations.jsonl`
2. Create a pin record linking to that observation
3. Save the pin to `~/.kindling/pins.json`
4. Confirm to the user what was pinned

## Implementation

```bash
node -e "
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const dir = path.join(os.homedir(), '.kindling');
const obsFile = path.join(dir, 'observations.jsonl');
const pinsFile = path.join(dir, 'pins.json');
const note = process.argv.slice(1).join(' ') || 'Pinned observation';

if (!fs.existsSync(obsFile)) {
  console.log('No observations to pin yet.');
  process.exit(0);
}

// Get the most recent observation
const lines = fs.readFileSync(obsFile, 'utf-8').split('\n').filter(Boolean);
if (lines.length === 0) {
  console.log('No observations to pin yet.');
  process.exit(0);
}

const lastObs = JSON.parse(lines[lines.length - 1]);

// Load existing pins
let pins = [];
if (fs.existsSync(pinsFile)) {
  pins = JSON.parse(fs.readFileSync(pinsFile, 'utf-8'));
}

// Check if already pinned
const alreadyPinned = pins.some(p => p.targetId === lastObs.id);
if (alreadyPinned) {
  console.log('This observation is already pinned.');
  process.exit(0);
}

// Create new pin
const pin = {
  id: crypto.randomUUID(),
  targetType: 'observation',
  targetId: lastObs.id,
  note: note,
  createdAt: Date.now(),
};

pins.push(pin);
fs.writeFileSync(pinsFile, JSON.stringify(pins, null, 2));

console.log('Pinned observation:');
console.log('');
console.log('  Kind: ' + lastObs.kind);
console.log('  Note: ' + note);
console.log('  Content: ' + (lastObs.content?.substring(0, 100) || '').replace(/\n/g, ' ') + '...');
console.log('');
console.log('Use /memory pins to see all pinned items.');
" "$@"
```

## Example Output

```
Pinned observation:

  Kind: file_diff
  Note: Root cause fix for auth bug
  Content: Tool: Edit File: /src/auth/validate.ts Action: Edited file...

Use /memory pins to see all pinned items.
```
