#!/usr/bin/env node
const { init, cleanup, getProjectRoot } = require('../hooks/lib/init.js');
const cwd = process.cwd();
const repoRoot = getProjectRoot(cwd);
const { db, store } = init(cwd);

try {
  const pins = store.listActivePins({ repoId: repoRoot }, Date.now());

  if (!pins || pins.length === 0) {
    console.log('No pins yet. Use /memory pin to pin important observations.');
    process.exit(0);
  }

  console.log('=== Pinned Observations ===');
  console.log('');

  pins.forEach((pin, i) => {
    const date = new Date(pin.createdAt).toLocaleDateString();
    console.log(i + 1 + '. [' + date + '] ' + (pin.note || 'Pin'));
    console.log('   ID: ' + pin.id.substring(0, 8));

    let obs = null;
    if (typeof store.getObservationById === 'function') {
      obs = store.getObservationById(pin.targetId);
    }
    if (obs) {
      const preview = (obs.content || '').substring(0, 150).replace(/\n/g, ' ');
      console.log('   ' + obs.kind + ': ' + preview + '...');
    } else {
      console.log('   Target: ' + pin.targetId.substring(0, 8));
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
