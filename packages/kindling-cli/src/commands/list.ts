/**
 * List command
 *
 * Lists capsules, pins, or observations.
 */

import type { KindlingStore } from '@kindling/store-sqlite';
import type { Capsule, Pin, Observation } from '@kindling/core';

export type ListTarget = 'capsules' | 'pins' | 'observations';

export interface ListOptions {
  limit?: number;
  sessionId?: string;
  status?: string;
}

export function listCommand(
  store: KindlingStore,
  target: ListTarget,
  options: ListOptions = {}
): Capsule[] | Pin[] | Observation[] {
  const limit = options.limit ?? 50;

  switch (target) {
    case 'capsules':
      return store.listCapsules({
        sessionId: options.sessionId,
        status: options.status,
        limit,
      });

    case 'pins':
      return store.listPins({
        includeExpired: false,
      });

    case 'observations':
      return store.listObservations({
        sessionId: options.sessionId,
        limit,
      });

    default:
      throw new Error(`Unknown list target: ${target}`);
  }
}

export function formatList(target: ListTarget, items: any[]): string {
  const lines = [`${target.charAt(0).toUpperCase() + target.slice(1)}`, '='.repeat(target.length), ''];

  if (items.length === 0) {
    return lines.concat('No items found.').join('\n');
  }

  items.forEach(item => {
    if (target === 'capsules') {
      const capsule = item as Capsule;
      const duration = capsule.closedAtMs
        ? `${Math.round((capsule.closedAtMs - capsule.openedAtMs) / 1000)}s`
        : 'ongoing';
      lines.push(`[${capsule.id}] ${capsule.type} - ${capsule.intent}`);
      lines.push(`  Status: ${capsule.status} | Duration: ${duration}`);
      if (capsule.scope.sessionId) {
        lines.push(`  Session: ${capsule.scope.sessionId}`);
      }
    } else if (target === 'pins') {
      const pin = item as Pin;
      lines.push(`[${pin.id}] ${pin.targetType}: ${pin.targetId}`);
      if (pin.note) {
        lines.push(`  Note: ${pin.note}`);
      }
      if (pin.ttlMs) {
        const expiresAt = new Date(pin.pinnedAtMs + pin.ttlMs);
        lines.push(`  Expires: ${expiresAt.toISOString()}`);
      }
    } else if (target === 'observations') {
      const obs = item as Observation;
      const preview = obs.content?.substring(0, 80) || '[no content]';
      lines.push(`[${obs.id}] ${obs.kind}`);
      lines.push(`  ${preview}${obs.content && obs.content.length > 80 ? '...' : ''}`);
    }

    lines.push('');
  });

  return lines.join('\n');
}
