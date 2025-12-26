/**
 * Pin management commands
 */

import type { KindlingService } from '@kindling/core';
import { PinTargetType } from '@kindling/core';

export interface PinOptions {
  note?: string;
  ttl?: number; // TTL in seconds
}

export function pinCommand(
  service: KindlingService,
  targetType: string,
  targetId: string,
  options: PinOptions = {}
): string {
  // Validate target type
  let type: PinTargetType;
  switch (targetType.toLowerCase()) {
    case 'observation':
      type = PinTargetType.Observation;
      break;
    case 'summary':
      type = PinTargetType.Summary;
      break;
    case 'capsule':
      type = PinTargetType.Capsule;
      break;
    default:
      throw new Error(`Invalid target type: ${targetType}. Must be observation, summary, or capsule.`);
  }

  const pin = service.pin({
    targetType: type,
    targetId,
    note: options.note,
    ttlMs: options.ttl ? options.ttl * 1000 : null,
  });

  return `Pinned ${targetType} ${targetId} (pin ID: ${pin.id})`;
}

export function unpinCommand(service: KindlingService, pinId: string): string {
  service.unpin(pinId);
  return `Unpinned ${pinId}`;
}
