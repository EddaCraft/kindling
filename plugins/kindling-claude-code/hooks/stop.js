#!/usr/bin/env node
/**
 * Stop hook handler
 *
 * Closes the session capsule when Claude Code stops.
 */

import { closeCapsule, getOpenCapsuleForSession } from './lib/db.js';

// Read hook context from stdin
let input = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', () => {
  try {
    const context = JSON.parse(input);

    const sessionId = context.session_id || context.sessionId || 'unknown';
    const reason = context.stop_reason || context.reason || 'unknown';

    // Find open capsule for this session
    const capsule = getOpenCapsuleForSession(sessionId);

    if (capsule) {
      // Close the capsule
      closeCapsule(capsule.id, null);
      console.error(`[kindling] Closed capsule ${capsule.id} (reason: ${reason})`);
    } else {
      console.error(`[kindling] No open capsule found for session ${sessionId}`);
    }

    // Return continue signal
    console.log(JSON.stringify({ continue: true }));
  } catch (error) {
    console.error(`[kindling] Stop error: ${error.message}`);
    console.log(JSON.stringify({ continue: true }));
  }
});
