/**
 * Pin/unpin commands - Manage pins
 */

import { initializeService, handleError, formatJson } from '../utils.js';

interface PinOptions {
  db?: string;
  note?: string;
  ttl?: string;
  json?: boolean;
}

interface UnpinOptions {
  db?: string;
  json?: boolean;
}

export async function pinCommand(type: string, id: string, options: PinOptions): Promise<void> {
  try {
    if (type !== 'observation' && type !== 'summary') {
      throw new Error(`Invalid type: ${type}. Must be 'observation' or 'summary'`);
    }

    const { service, db } = initializeService(options.db);

    const pin = service.pin({
      targetType: type as 'observation' | 'summary',
      targetId: id,
      note: options.note,
      ttlMs: options.ttl ? parseInt(options.ttl, 10) : undefined,
    });

    if (options.json) {
      console.log(formatJson(pin, true));
    } else {
      console.log('\nPin created successfully');
      console.log(`ID: ${pin.id}`);
      console.log(`Target: ${pin.targetType} ${pin.targetId}`);
      if (pin.reason) {
        console.log(`Note: ${pin.reason}`);
      }
      if (pin.expiresAt) {
        console.log(`Expires: ${new Date(pin.expiresAt).toISOString()}`);
      }
      console.log('');
    }

    db.close();
  } catch (error) {
    handleError(error, options.json);
  }
}

export async function unpinCommand(id: string, options: UnpinOptions): Promise<void> {
  try {
    const { service, db } = initializeService(options.db);

    service.unpin(id);

    if (options.json) {
      console.log(formatJson({ success: true, pinId: id }));
    } else {
      console.log(`\nPin ${id} removed successfully\n`);
    }

    db.close();
  } catch (error) {
    handleError(error, options.json);
  }
}
