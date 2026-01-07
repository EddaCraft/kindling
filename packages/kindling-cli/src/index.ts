/**
 * @kindling/cli
 *
 * Command-line interface for Kindling.
 */

export { statusCommand, formatStatus } from './commands/status.js';
export type { StatusResult } from './commands/status.js';

export { searchCommand, formatSearchResults } from './commands/search.js';
export type { SearchOptions } from './commands/search.js';

export { listCommand, formatList } from './commands/list.js';
export type { ListTarget, ListOptions } from './commands/list.js';

export { pinCommand, unpinCommand } from './commands/pin.js';
export type { PinOptions } from './commands/pin.js';
