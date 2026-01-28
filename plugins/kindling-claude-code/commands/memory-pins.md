---
name: memory pins
description: Show all pinned observations
---

# Memory Pins

List all pinned observations with their notes.

## Instructions

When the user runs `/memory pins`:

1. Read pins from `~/.kindling/pins.json`
2. For each pin, look up the observation
3. Display pins with their notes and content preview

## Implementation

```bash
node -e "
const fs = require('fs');
const path = require('path');
const os = require('os');

const dir = path.join(os.homedir(), '.kindling');
const obsFile = path.join(dir, 'observations.jsonl');
const pinsFile = path.join(dir, 'pins.json');

if (!fs.existsSync(pinsFile)) {
  console.log('No pins yet. Use /memory pin to pin important observations.');
  process.exit(0);
}

const pins = JSON.parse(fs.readFileSync(pinsFile, 'utf-8'));
if (pins.length === 0) {
  console.log('No pins yet. Use /memory pin to pin important observations.');
  process.exit(0);
}

// Load observations for lookup
const obsMap = new Map();
if (fs.existsSync(obsFile)) {
  const lines = fs.readFileSync(obsFile, 'utf-8').split('\n').filter(Boolean);
  lines.forEach(line => {
    const obs = JSON.parse(line);
    obsMap.set(obs.id, obs);
  });
}

console.log('=== Pinned Observations ===\n');

pins.forEach((pin, i) => {
  const date = new Date(pin.createdAt).toLocaleDateString();
  const obs = obsMap.get(pin.targetId);

  console.log((i + 1) + '. [' + date + '] ' + pin.note);
  console.log('   ID: ' + pin.id.substring(0, 8));

  if (obs) {
    const preview = (obs.content?.substring(0, 150) || '').replace(/\n/g, ' ');
    console.log('   ' + obs.kind + ': ' + preview + '...');
  } else {
    console.log('   (observation not found)');
  }
  console.log('');
});

console.log('Use /memory unpin <id> to remove a pin.');
"
```

## Example Output

```
=== Pinned Observations ===

1. [1/27/2025] Root cause fix for auth bug
   ID: a3f2b1c4
   file_diff: Tool: Edit File: /src/auth/validate.ts Action: Edited file...

2. [1/26/2025] Important architecture decision
   ID: 7e8d9f0a
   message: We decided to use Redis for session storage because...

Use /memory unpin <id> to remove a pin.
```
