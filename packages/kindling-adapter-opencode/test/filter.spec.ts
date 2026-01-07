/**
 * Tests for content filtering and safety utilities
 */

import { describe, it, expect } from 'vitest';
import {
  truncateContent,
  containsSecrets,
  maskSecrets,
  filterContent,
  isExcludedPath,
  filterToolResult,
  createRedactionReason,
  MAX_CONTENT_LENGTH,
} from '../src/opencode/filter.js';

describe('Content Filtering', () => {
  describe('truncateContent', () => {
    it('should not truncate short content', () => {
      const content = 'Short content';
      const result = truncateContent(content);
      expect(result).toBe(content);
    });

    it('should truncate long content with default max length', () => {
      const content = 'x'.repeat(MAX_CONTENT_LENGTH + 1000);
      const result = truncateContent(content);

      expect(result.length).toBeLessThan(content.length);
      expect(result).toContain('[Truncated');
      expect(result).toContain('1000 characters]');
    });

    it('should truncate with custom max length', () => {
      const content = 'x'.repeat(1000);
      const result = truncateContent(content, { maxLength: 500 });

      expect(result.length).toBeLessThan(content.length);
      expect(result).toContain('[Truncated 500 characters]');
    });

    it('should truncate without notice when disabled', () => {
      const content = 'x'.repeat(1000);
      const result = truncateContent(content, {
        maxLength: 500,
        showTruncationNotice: false,
      });

      expect(result.length).toBe(500);
      expect(result).not.toContain('[Truncated');
    });
  });

  describe('containsSecrets', () => {
    it('should detect API key patterns', () => {
      expect(containsSecrets('api_key: sk-abc123xyz')).toBe(true);
      expect(containsSecrets('apiKey="my-secret-key"')).toBe(true);
      expect(containsSecrets('API_KEY=abc123')).toBe(true);
    });

    it('should detect token patterns', () => {
      expect(containsSecrets('token: ghp_abc123xyz')).toBe(true);
      expect(containsSecrets('"token":"abc123"')).toBe(true);
    });

    it('should detect password patterns', () => {
      expect(containsSecrets('password=mypassword123')).toBe(true);
      expect(containsSecrets('pwd: secret123')).toBe(true);
    });

    it('should detect Bearer tokens', () => {
      expect(containsSecrets('Authorization: Bearer abc123xyz')).toBe(true);
      expect(containsSecrets('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')).toBe(true);
    });

    it('should detect Basic auth', () => {
      expect(containsSecrets('Authorization: Basic dXNlcjpwYXNz')).toBe(true);
    });

    it('should detect long alphanumeric strings', () => {
      // 32+ character alphanumeric strings likely to be tokens
      expect(containsSecrets('abc123xyz789def456ghi012jkl345mno')).toBe(true);
    });

    it('should not flag normal content', () => {
      expect(containsSecrets('This is normal text')).toBe(false);
      expect(containsSecrets('function getName() { return "test"; }')).toBe(false);
      // Note: Variable assignments like "API_KEY = value" will be flagged
      // This is acceptable for safety - better false positive than false negative
    });
  });

  describe('maskSecrets', () => {
    it('should mask API keys', () => {
      const content = 'api_key: sk-abc123xyz';
      const masked = maskSecrets(content);

      expect(masked).toContain('[REDACTED]');
      expect(masked).not.toContain('sk-abc123xyz');
    });

    it('should mask multiple secrets', () => {
      const content = 'api_key: sk-123\npassword=secret123\ntoken: ghp-xyz';
      const masked = maskSecrets(content);

      expect(masked.match(/\[REDACTED\]/g)?.length).toBeGreaterThan(0);
      expect(masked).not.toContain('sk-123');
      expect(masked).not.toContain('secret123');
      expect(masked).not.toContain('ghp-xyz');
    });

    it('should preserve key names when masking', () => {
      const content = 'api_key: secret';
      const masked = maskSecrets(content);

      expect(masked).toContain('api_key');
      expect(masked).toContain('[REDACTED]');
    });

    it('should mask Bearer tokens', () => {
      const content = 'Authorization: Bearer abc123xyz';
      const masked = maskSecrets(content);

      expect(masked).toContain('[REDACTED]');
      expect(masked).not.toContain('abc123xyz');
    });

    it('should not modify content without secrets', () => {
      const content = 'This is normal content';
      const masked = maskSecrets(content);

      expect(masked).toBe(content);
    });
  });

  describe('filterContent', () => {
    it('should apply truncation only by default', () => {
      const content = 'x'.repeat(MAX_CONTENT_LENGTH + 100);
      const filtered = filterContent(content);

      expect(filtered.length).toBeLessThan(content.length);
      expect(filtered).toContain('[Truncated');
    });

    it('should apply secret masking when enabled', () => {
      const content = 'api_key: sk-secret123';
      const filtered = filterContent(content, { maskSecrets: true });

      expect(filtered).toContain('[REDACTED]');
      expect(filtered).not.toContain('sk-secret123');
    });

    it('should apply both truncation and masking', () => {
      const content = 'api_key: secret\n' + 'x'.repeat(MAX_CONTENT_LENGTH + 1000);
      const filtered = filterContent(content, { maskSecrets: true });

      expect(filtered).toContain('[REDACTED]');
      expect(filtered).toContain('[Truncated');
    });

    it('should not mask when disabled', () => {
      const content = 'api_key: sk-secret123';
      const filtered = filterContent(content, { maskSecrets: false });

      expect(filtered).toBe(content);
    });
  });

  describe('isExcludedPath', () => {
    it('should exclude node_modules', () => {
      expect(isExcludedPath('/project/node_modules/package/index.js')).toBe(true);
      expect(isExcludedPath('node_modules/lib/file.js')).toBe(true);
    });

    it('should exclude .git directory', () => {
      expect(isExcludedPath('/project/.git/config')).toBe(true);
      expect(isExcludedPath('.git/HEAD')).toBe(true);
    });

    it('should exclude .env files', () => {
      expect(isExcludedPath('.env')).toBe(true);
      expect(isExcludedPath('/project/.env')).toBe(true);
    });

    it('should exclude key files', () => {
      expect(isExcludedPath('private.key')).toBe(true);
      expect(isExcludedPath('cert.pem')).toBe(true);
    });

    it('should exclude credential files', () => {
      expect(isExcludedPath('credentials.json')).toBe(true);
      expect(isExcludedPath('aws-credentials')).toBe(true);
      expect(isExcludedPath('secrets.yaml')).toBe(true);
    });

    it('should not exclude normal files', () => {
      expect(isExcludedPath('src/index.ts')).toBe(false);
      expect(isExcludedPath('README.md')).toBe(false);
      expect(isExcludedPath('package.json')).toBe(false);
    });
  });

  describe('filterToolResult', () => {
    it('should return result as-is (future allowlist implementation)', () => {
      const result = { output: 'test', metadata: { count: 10 } };
      const filtered = filterToolResult('read_file', result);

      expect(filtered).toEqual(result);
    });
  });

  describe('createRedactionReason', () => {
    it('should format redaction message', () => {
      const reason = createRedactionReason('contains secrets');
      expect(reason).toBe('[Content redacted: contains secrets]');
    });
  });
});
