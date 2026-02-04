#!/usr/bin/env node
/**
 * SessionStart hook handler
 *
 * Opens a new capsule when a Claude Code session begins.
 * Exit 0 = success (never blocks session startup).
 */

import { openCapsule, getOpenCapsuleForSession } from './lib/db.js';

let input = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', () => {
  try {
    const context = JSON.parse(input);

    const sessionId = context.session_id || `session-${Date.now()}`;
    const cwd = context.cwd || process.cwd();

    // Check if session already has an open capsule
    const existing = getOpenCapsuleForSession(sessionId);
    if (existing) {
      process.exit(0);
    }

    // Open new capsule
    const capsule = openCapsule({
      type: 'session',
      intent: 'Claude Code session',
      scopeIds: {
        sessionId,
        repoId: cwd,
      },
    });

    console.error(`[kindling] Opened capsule ${capsule.id} for session ${sessionId}`);
  } catch (error) {
    console.error(`[kindling] SessionStart error: ${error.message}`);
  }
  process.exit(0);
});
