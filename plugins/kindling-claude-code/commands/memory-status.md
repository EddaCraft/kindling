---
name: memory status
description: Show your session memory statistics
---

# Memory Status

Show statistics about your Kindling memory database.

## Instructions

When the user runs `/memory status`:

1. Read the kindling data files from `~/.kindling/`
2. Count observations, capsules, and pins
3. Show recent session activity
4. Display the database location

## Implementation

```bash
node -e "
const fs = require('fs');
const path = require('path');
const os = require('os');

const dir = path.join(os.homedir(), '.kindling');
const obsFile = path.join(dir, 'observations.jsonl');
const capsFile = path.join(dir, 'capsules.json');
const pinsFile = path.join(dir, 'pins.json');

if (!fs.existsSync(dir)) {
  console.log('Kindling not initialized yet.');
  console.log('Memory will be captured automatically as you use Claude Code.');
  process.exit(0);
}

// Count observations
let obsCount = 0;
if (fs.existsSync(obsFile)) {
  const content = fs.readFileSync(obsFile, 'utf-8');
  obsCount = content.split('\n').filter(Boolean).length;
}

// Load capsules
let capsules = [];
if (fs.existsSync(capsFile)) {
  capsules = Object.values(JSON.parse(fs.readFileSync(capsFile, 'utf-8')));
}

// Load pins
let pins = [];
if (fs.existsSync(pinsFile)) {
  pins = JSON.parse(fs.readFileSync(pinsFile, 'utf-8'));
}

// Calculate stats
const openCapsules = capsules.filter(c => c.status === 'open').length;
const closedCapsules = capsules.filter(c => c.status === 'closed').length;

// Get recent sessions
const recentSessions = capsules
  .sort((a, b) => (b.closedAt || b.openedAt) - (a.closedAt || a.openedAt))
  .slice(0, 5);

console.log('=== Kindling Memory Status ===\n');
console.log('Observations: ' + obsCount);
console.log('Sessions:     ' + capsules.length + ' (' + openCapsules + ' open, ' + closedCapsules + ' closed)');
console.log('Pins:         ' + pins.length);
console.log('Location:     ' + dir);
console.log('');

if (recentSessions.length > 0) {
  console.log('Recent Sessions:');
  recentSessions.forEach((c, i) => {
    const date = new Date(c.openedAt).toLocaleDateString();
    const status = c.status === 'open' ? '(active)' : '';
    console.log('  ' + (i+1) + '. ' + date + ' - ' + (c.observationCount || 0) + ' observations ' + status);
  });
}
"
```

## Example Output

```
=== Kindling Memory Status ===

Observations: 247
Sessions:     12 (1 open, 11 closed)
Pins:         3
Location:     /home/user/.kindling

Recent Sessions:
  1. 1/27/2025 - 45 observations (active)
  2. 1/26/2025 - 32 observations
  3. 1/25/2025 - 28 observations
  4. 1/24/2025 - 51 observations
  5. 1/23/2025 - 19 observations
```
