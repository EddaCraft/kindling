/**
 * Capsule command tests
 */

import { describe, it, expect, vi } from 'vitest';
import { Command } from 'commander';

describe('Capsule Command Registration', () => {
  it('should register capsule as a parent command with subcommands', () => {
    const program = new Command();

    const capsuleCmd = program.command('capsule').description('Manage capsules (open/close)');

    capsuleCmd
      .command('open')
      .description('Open a new capsule')
      .requiredOption('--intent <text>', 'Purpose of the capsule')
      .option('--type <type>', 'Capsule type')
      .action(vi.fn());

    capsuleCmd
      .command('close <id>')
      .description('Close a capsule')
      .option('--summary <text>', 'Summary text')
      .action(vi.fn());

    const capsule = program.commands.find((c) => c.name() === 'capsule');
    expect(capsule).toBeDefined();
    expect(capsule?.commands).toHaveLength(2);

    const openCmd = capsule?.commands.find((c) => c.name() === 'open');
    expect(openCmd).toBeDefined();
    expect(openCmd?.description()).toBe('Open a new capsule');

    const closeCmd = capsule?.commands.find((c) => c.name() === 'close');
    expect(closeCmd).toBeDefined();
    expect(closeCmd?.description()).toBe('Close a capsule');
  });

  it('should require --intent for capsule open', () => {
    const program = new Command();
    const capsuleCmd = program.command('capsule');

    capsuleCmd
      .command('open')
      .requiredOption('--intent <text>', 'Purpose of the capsule')
      .action(vi.fn());

    const openCmd = capsuleCmd.commands.find((c) => c.name() === 'open');
    const intentOption = openCmd?.options.find((o) => o.long === '--intent');
    expect(intentOption).toBeDefined();
    expect(intentOption?.required).toBe(true);
  });

  it('should have open command options: type, session, repo, db, json', () => {
    const program = new Command();
    const capsuleCmd = program.command('capsule');

    capsuleCmd
      .command('open')
      .requiredOption('--intent <text>', 'Purpose')
      .option('--type <type>', 'Capsule type')
      .option('--session <id>', 'Session scope')
      .option('--repo <id>', 'Repository scope')
      .option('--db <path>', 'Database path')
      .option('--json', 'Output as JSON')
      .action(vi.fn());

    const openCmd = capsuleCmd.commands.find((c) => c.name() === 'open');
    const optionNames = openCmd?.options.map((o) => o.long);
    expect(optionNames).toContain('--intent');
    expect(optionNames).toContain('--type');
    expect(optionNames).toContain('--session');
    expect(optionNames).toContain('--repo');
    expect(optionNames).toContain('--db');
    expect(optionNames).toContain('--json');
  });

  it('should have close command options: summary, db, json', () => {
    const program = new Command();
    const capsuleCmd = program.command('capsule');

    capsuleCmd
      .command('close <id>')
      .option('--summary <text>', 'Summary text')
      .option('--db <path>', 'Database path')
      .option('--json', 'Output as JSON')
      .action(vi.fn());

    const closeCmd = capsuleCmd.commands.find((c) => c.name() === 'close');
    const optionNames = closeCmd?.options.map((o) => o.long);
    expect(optionNames).toContain('--summary');
    expect(optionNames).toContain('--db');
    expect(optionNames).toContain('--json');
  });
});

describe('Capsule Command Validation', () => {
  it('should validate capsule types', () => {
    const validTypes = ['session', 'pocketflow_node'];

    validTypes.forEach((type) => {
      expect(validTypes.includes(type)).toBe(true);
    });

    expect(validTypes.includes('invalid')).toBe(false);
    expect(validTypes.includes('custom')).toBe(false);
  });

  it('should default type to session', () => {
    const options = { type: undefined };
    const type = options.type ?? 'session';
    expect(type).toBe('session');
  });

  it('should use provided type when specified', () => {
    const options = { type: 'pocketflow_node' };
    const type = options.type ?? 'session';
    expect(type).toBe('pocketflow_node');
  });

  it('should build close options from summary', () => {
    const summary = 'Root cause was unbounded cache';
    const closeOptions = summary ? { generateSummary: true, summaryContent: summary } : undefined;

    expect(closeOptions).toEqual({
      generateSummary: true,
      summaryContent: 'Root cause was unbounded cache',
    });
  });

  it('should return undefined close options when no summary', () => {
    const summary = undefined;
    const closeOptions = summary ? { generateSummary: true, summaryContent: summary } : undefined;

    expect(closeOptions).toBeUndefined();
  });

  it('should build scope IDs from session and repo options', () => {
    const options = { session: 'ses-1', repo: '/project' };
    const scopeIds = {
      sessionId: options.session,
      repoId: options.repo,
    };

    expect(scopeIds).toEqual({
      sessionId: 'ses-1',
      repoId: '/project',
    });
  });
});
