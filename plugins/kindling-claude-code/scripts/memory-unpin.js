#!/usr/bin/env node
const { init, cleanup, getProjectRoot } = require('../hooks/lib/init.js');
const cwd = process.cwd();
const repoRoot = getProjectRoot(cwd);
const pinId = process.argv[2] || '';

if (!pinId) {
  console.log('Usage: /memory unpin <id>');
  console.log('Get pin IDs from /memory pins');
  process.exit(0);
}

const { db, store } = init(cwd);
try {
  const pins = store.listActivePins({ repoId: repoRoot }, Date.now());
  const pin = pins.find((p) => p.id.startsWith(pinId));

  if (!pin) {
    console.log('Pin not found: ' + pinId);
    console.log('Use /memory pins to see all pin IDs.');
    process.exit(0);
  }

  store.deletePin(pin.id);

  console.log('Removed pin:');
  console.log('  ID: ' + pin.id.substring(0, 8));
  console.log('  Note: ' + (pin.note || 'Pin'));
  console.log('');
  console.log('Remaining pins: ' + (pins.length - 1));
} finally {
  cleanup(db);
}
