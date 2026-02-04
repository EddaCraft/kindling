/**
 * Simple file-based storage for Kindling plugin
 *
 * Uses JSON files for maximum portability (no native dependencies).
 * Data is stored in ~/.kindling/
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

// Database directory
const KINDLING_DIR = join(homedir(), '.kindling');
const OBSERVATIONS_FILE = join(KINDLING_DIR, 'observations.jsonl');
const CAPSULES_FILE = join(KINDLING_DIR, 'capsules.json');
const PINS_FILE = join(KINDLING_DIR, 'pins.json');

/**
 * Ensure the kindling directory exists
 */
export function ensureDir() {
  if (!existsSync(KINDLING_DIR)) {
    mkdirSync(KINDLING_DIR, { recursive: true });
  }
}

/**
 * Append an observation to the log
 */
export function appendObservation(observation) {
  ensureDir();
  const record = {
    id: observation.id || randomUUID(),
    ts: observation.ts || Date.now(),
    kind: observation.kind,
    content: observation.content,
    provenance: observation.provenance || {},
    scopeIds: observation.scopeIds || {},
    capsuleId: observation.capsuleId,
  };
  appendFileSync(OBSERVATIONS_FILE, JSON.stringify(record) + '\n');
  return record;
}

/**
 * Read all observations
 */
export function readObservations() {
  ensureDir();
  if (!existsSync(OBSERVATIONS_FILE)) {
    return [];
  }
  const content = readFileSync(OBSERVATIONS_FILE, 'utf-8');
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

/**
 * Search observations by content
 */
export function searchObservations(query, limit = 20) {
  const observations = readObservations();
  const lowerQuery = query.toLowerCase();

  return observations
    .filter(obs => obs.content.toLowerCase().includes(lowerQuery))
    .slice(-limit)
    .reverse();
}

/**
 * Get observations by session
 */
export function getObservationsBySession(sessionId, limit = 50) {
  const observations = readObservations();
  return observations
    .filter(obs => obs.scopeIds?.sessionId === sessionId)
    .slice(-limit);
}

/**
 * Load capsules
 */
function loadCapsules() {
  ensureDir();
  if (!existsSync(CAPSULES_FILE)) {
    return {};
  }
  return JSON.parse(readFileSync(CAPSULES_FILE, 'utf-8'));
}

/**
 * Save capsules
 */
function saveCapsules(capsules) {
  ensureDir();
  writeFileSync(CAPSULES_FILE, JSON.stringify(capsules, null, 2));
}

/**
 * Open a new capsule
 */
export function openCapsule(options) {
  const capsules = loadCapsules();
  const id = options.id || randomUUID();

  capsules[id] = {
    id,
    type: options.type || 'session',
    intent: options.intent || 'Claude Code session',
    status: 'open',
    openedAt: Date.now(),
    scopeIds: options.scopeIds || {},
    observationCount: 0,
  };

  saveCapsules(capsules);
  return capsules[id];
}

/**
 * Close a capsule
 */
export function closeCapsule(capsuleId, summary) {
  const capsules = loadCapsules();
  if (capsules[capsuleId]) {
    capsules[capsuleId].status = 'closed';
    capsules[capsuleId].closedAt = Date.now();
    if (summary) {
      capsules[capsuleId].summary = summary;
    }
    saveCapsules(capsules);
  }
  return capsules[capsuleId];
}

/**
 * Get open capsule for session
 */
export function getOpenCapsuleForSession(sessionId) {
  const capsules = loadCapsules();
  return Object.values(capsules).find(
    c => c.status === 'open' && c.scopeIds?.sessionId === sessionId
  );
}

/**
 * Get capsule by ID
 */
export function getCapsule(capsuleId) {
  const capsules = loadCapsules();
  return capsules[capsuleId];
}

/**
 * Get all capsules
 */
export function getAllCapsules() {
  return Object.values(loadCapsules());
}

/**
 * Increment observation count for capsule
 */
export function incrementCapsuleObservationCount(capsuleId) {
  const capsules = loadCapsules();
  if (capsules[capsuleId]) {
    capsules[capsuleId].observationCount = (capsules[capsuleId].observationCount || 0) + 1;
    saveCapsules(capsules);
  }
}

/**
 * Load pins
 */
function loadPins() {
  ensureDir();
  if (!existsSync(PINS_FILE)) {
    return [];
  }
  return JSON.parse(readFileSync(PINS_FILE, 'utf-8'));
}

/**
 * Save pins
 */
function savePins(pins) {
  ensureDir();
  writeFileSync(PINS_FILE, JSON.stringify(pins, null, 2));
}

/**
 * Add a pin
 */
export function addPin(pin) {
  const pins = loadPins();
  const newPin = {
    id: pin.id || randomUUID(),
    targetType: pin.targetType,
    targetId: pin.targetId,
    note: pin.note,
    createdAt: Date.now(),
  };
  pins.push(newPin);
  savePins(pins);
  return newPin;
}

/**
 * Get all pins
 */
export function getPins() {
  return loadPins();
}

/**
 * Remove a pin
 */
export function removePin(pinId) {
  const pins = loadPins();
  const filtered = pins.filter(p => p.id !== pinId);
  savePins(filtered);
  return filtered.length < pins.length;
}

/**
 * Get database stats
 */
export function getStats() {
  const observations = readObservations();
  const capsules = getAllCapsules();
  const pins = getPins();

  return {
    observationCount: observations.length,
    capsuleCount: capsules.length,
    openCapsules: capsules.filter(c => c.status === 'open').length,
    pinCount: pins.length,
    dbPath: KINDLING_DIR,
  };
}
