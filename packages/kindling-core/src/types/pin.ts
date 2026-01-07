/**
 * Domain types for Pins
 *
 * Pins are user-pinned content for high-priority retrieval.
 */

/**
 * Pin target types
 */
export enum PinTargetType {
  Observation = 'observation',
  Summary = 'summary',
  Capsule = 'capsule',
}

/**
 * Pin entity
 */
export interface Pin {
  id: string;
  targetType: PinTargetType;
  targetId: string;
  note: string | null;
  ttlMs: number | null;
  pinnedAtMs: number;
  createdAt: number;
}

/**
 * Input for creating a new pin
 */
export interface CreatePinInput {
  id?: string;
  targetType: PinTargetType;
  targetId: string;
  note?: string | null;
  ttlMs?: number | null;
  pinnedAtMs?: number;
}

/**
 * Validates a pin target type
 */
export function validatePinTargetType(type: string): type is PinTargetType {
  return Object.values(PinTargetType).includes(type as PinTargetType);
}

/**
 * Checks if a pin has expired based on its TTL
 */
export function isPinExpired(pin: Pin, nowMs: number = Date.now()): boolean {
  if (pin.ttlMs === null) return false;
  return nowMs > pin.pinnedAtMs + pin.ttlMs;
}

/**
 * Generates a unique pin ID
 */
export function generatePinId(): string {
  return `pin_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
