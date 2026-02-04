#!/usr/bin/env node
/**
 * Stop hook handler
 *
 * Closes the session capsule when Claude Code stops.
 * Exit 0 = success (never blocks shutdown).
 */

import { closeCapsule, getOpenCapsuleForSession } from './lib/db.js';

let input = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', () => {
  try {
    const context = JSON.parse(input);

    const sessionId = context.session_id || 'unknown';
    const reason = context.stop_reason || 'unknown';

    // Find open capsule for this session
    const capsule = getOpenCapsuleForSession(sessionId);

    if (capsule) {
      closeCapsule(capsule.id, null);
      console.error(`[kindling] Closed capsule ${capsule.id} (reason: ${reason})`);
    }
  } catch (error) {
    console.error(`[kindling] Stop error: ${error.message}`);
  }
  process.exit(0);
});
