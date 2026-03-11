/**
 * Log command - Capture observations from the command line
 */

import { randomUUID } from 'node:crypto';
import { isObservationKind, OBSERVATION_KINDS } from '@eddacraft/kindling-core';
import { initializeService, handleError, formatJson, formatTimestamp } from '../utils.js';

interface LogOptions {
  kind?: string;
  session?: string;
  repo?: string;
  capsule?: string;
  db?: string;
  json?: boolean;
}

export async function logCommand(content: string, options: LogOptions): Promise<void> {
  try {
    const kind = options.kind ?? 'message';

    if (!isObservationKind(kind)) {
      throw new Error(`Invalid kind: '${kind}'. Must be one of: ${OBSERVATION_KINDS.join(', ')}`);
    }

    const { service, db } = initializeService(options.db);

    const observation = {
      id: randomUUID(),
      kind,
      content,
      provenance: { source: 'cli' },
      ts: Date.now(),
      scopeIds: {
        ...(options.session && { sessionId: options.session }),
        ...(options.repo && { repoId: options.repo }),
      },
      redacted: false,
    };

    service.appendObservation(observation, {
      capsuleId: options.capsule,
    });

    if (options.json) {
      console.log(formatJson(observation, true));
    } else {
      const truncated = content.length > 80 ? content.slice(0, 77) + '...' : content;

      console.log('\nObservation logged');
      console.log(`ID:        ${observation.id}`);
      console.log(`Kind:      ${observation.kind}`);
      console.log(`Timestamp: ${formatTimestamp(observation.ts)}`);
      console.log(`Content:   ${truncated}`);
      console.log('');
    }

    db.close();
  } catch (error) {
    handleError(error, options.json);
  }
}
