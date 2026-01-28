#!/usr/bin/env node
/**
 * SessionStart hook handler
 *
 * Opens a new capsule when a Claude Code session begins.
 */

import { openCapsule, getOpenCapsuleForSession } from './lib/db.js';

// Read hook context from stdin
let input = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', () => {
  try {
    const context = JSON.parse(input);

    const sessionId = context.session_id || context.sessionId || `session-${Date.now()}`;
    const cwd = context.cwd || process.cwd();

    // Check if session already has an open capsule
    const existing = getOpenCapsuleForSession(sessionId);
    if (existing) {
      // Already have a capsule, continue
      console.log(JSON.stringify({ continue: true }));
      return;
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

    // Log for debugging (goes to stderr so doesn't affect hook response)
    console.error(`[kindling] Opened capsule ${capsule.id} for session ${sessionId}`);

    // Return continue signal
    console.log(JSON.stringify({ continue: true }));
  } catch (error) {
    console.error(`[kindling] SessionStart error: ${error.message}`);
    // Always continue even on error
    console.log(JSON.stringify({ continue: true }));
  }
});
