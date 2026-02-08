---
description: List all pinned observations with their notes.
---

List all pinned observations with their notes and content preview.

Run this command:

```bash
node -e "
const { init, cleanup } = require('${CLAUDE_PLUGIN_ROOT}/hooks/lib/init.js');
const cwd = process.cwd();
const { db, store } = init(cwd);

try {
  const pins = store.listActivePins({ repoId: cwd }, Date.now());

  if (!pins || pins.length === 0) {
    console.log('No pins yet. Use /memory pin to pin important observations.');
    process.exit(0);
  }

  console.log('=== Pinned Observations ===');
  console.log('');

  pins.forEach((pin, i) => {
    const date = new Date(pin.createdAt).toLocaleDateString();
    console.log((i + 1) + '. [' + date + '] ' + (pin.note || 'Pin'));
    console.log('   ID: ' + pin.id.substring(0, 8));

    const obs = store.getObservationById ? store.getObservationById(pin.targetId) : null;
    if (obs) {
      const preview = (obs.content || '').substring(0, 150).replace(/\n/g, ' ');
      console.log('   ' + obs.kind + ': ' + preview + '...');
    }

    if (pin.expiresAt) {
      console.log('   Expires: ' + new Date(pin.expiresAt).toLocaleString());
    }
    console.log('');
  });

  console.log('Use /memory unpin <id> to remove a pin.');
} finally {
  cleanup(db);
}
"
```

Show the results to the user.
