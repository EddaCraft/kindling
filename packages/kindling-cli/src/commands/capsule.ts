/**
 * Capsule commands - Open and close capsules
 */

import { isCapsuleType, CAPSULE_TYPES } from '@eddacraft/kindling-core';
import { initializeService, handleError, formatJson, formatTimestamp } from '../utils.js';

interface CapsuleOpenOptions {
  intent: string;
  type?: string;
  session?: string;
  repo?: string;
  db?: string;
  json?: boolean;
}

interface CapsuleCloseOptions {
  summary?: string;
  db?: string;
  json?: boolean;
}

export async function capsuleOpenCommand(options: CapsuleOpenOptions): Promise<void> {
  try {
    const type = options.type ?? 'session';

    if (!isCapsuleType(type)) {
      throw new Error(`Invalid capsule type: ${type}. Valid types: ${CAPSULE_TYPES.join(', ')}`);
    }

    const { service, db } = initializeService(options.db);

    const capsule = service.openCapsule({
      type,
      intent: options.intent,
      scopeIds: {
        sessionId: options.session,
        repoId: options.repo,
      },
    });

    if (options.json) {
      console.log(formatJson(capsule, true));
    } else {
      console.log('\nCapsule opened successfully');
      console.log(`ID: ${capsule.id}`);
      console.log(`Type: ${capsule.type}`);
      console.log(`Intent: ${capsule.intent}`);
      console.log(`Status: ${capsule.status}`);
      console.log(`Opened at: ${formatTimestamp(capsule.openedAt)}`);
      console.log('');
    }

    db.close();
  } catch (error) {
    handleError(error, options.json);
  }
}

export async function capsuleCloseCommand(id: string, options: CapsuleCloseOptions): Promise<void> {
  try {
    const { service, db } = initializeService(options.db);

    const closeOptions = options.summary
      ? { generateSummary: true, summaryContent: options.summary }
      : undefined;

    const capsule = service.closeCapsule(id, closeOptions);

    if (options.json) {
      console.log(formatJson(capsule, true));
    } else {
      console.log('\nCapsule closed successfully');
      console.log(`ID: ${capsule.id}`);
      console.log(`Status: ${capsule.status}`);
      if (capsule.closedAt) {
        console.log(`Closed at: ${formatTimestamp(capsule.closedAt)}`);
      }
      if (capsule.summaryId) {
        console.log(`Summary: ${capsule.summaryId}`);
      }
      console.log('');
    }

    db.close();
  } catch (error) {
    handleError(error, options.json);
  }
}
