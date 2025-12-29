/**
 * Barrel export for capsule module
 */

export type {
  ICapsuleManager,
  OpenCapsuleOptions,
  CloseCapsuleSignals,
} from './types.js';
export {
  openCapsule,
  closeCapsule,
  getCapsule,
  getOpenCapsule,
} from './lifecycle.js';
export { CapsuleManager } from './manager.js';
export { CapsuleTimeoutWatcher, type TimeoutWatcherOptions } from './timeout.js';
