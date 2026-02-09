# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Kindling, please report it privately rather than opening a public issue.

**Email:** security@eddacraft.ai

Please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)

We take all security reports seriously and will respond promptly.

## Response Timeline

| Stage              | Timeline                                      |
| ------------------ | --------------------------------------------- |
| Acknowledgement    | Within 48 hours                               |
| Initial assessment | Within 7 days                                 |
| Resolution         | Depends on severity, typically within 30 days |

## Scope

This policy applies to all packages in the Kindling repository:

| Package                                   | npm                                                                                                                                                       |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@eddacraft/kindling`                     | [![npm](https://img.shields.io/npm/v/@eddacraft/kindling.svg)](https://www.npmjs.com/package/@eddacraft/kindling)                                         |
| `@eddacraft/kindling-core`                | [![npm](https://img.shields.io/npm/v/@eddacraft/kindling-core.svg)](https://www.npmjs.com/package/@eddacraft/kindling-core)                               |
| `@eddacraft/kindling-cli`                 | [![npm](https://img.shields.io/npm/v/@eddacraft/kindling-cli.svg)](https://www.npmjs.com/package/@eddacraft/kindling-cli)                                 |
| `@eddacraft/kindling-store-sqljs`         | [![npm](https://img.shields.io/npm/v/@eddacraft/kindling-store-sqljs.svg)](https://www.npmjs.com/package/@eddacraft/kindling-store-sqljs)                 |
| `@eddacraft/kindling-adapter-opencode`    | [![npm](https://img.shields.io/npm/v/@eddacraft/kindling-adapter-opencode.svg)](https://www.npmjs.com/package/@eddacraft/kindling-adapter-opencode)       |
| `@eddacraft/kindling-adapter-pocketflow`  | [![npm](https://img.shields.io/npm/v/@eddacraft/kindling-adapter-pocketflow.svg)](https://www.npmjs.com/package/@eddacraft/kindling-adapter-pocketflow)   |
| `@eddacraft/kindling-adapter-claude-code` | [![npm](https://img.shields.io/npm/v/@eddacraft/kindling-adapter-claude-code.svg)](https://www.npmjs.com/package/@eddacraft/kindling-adapter-claude-code) |

## Supported Versions

During the v0.x development phase, only the latest version receives security updates.

| Version      | Supported |
| ------------ | --------- |
| 0.x (latest) | Yes       |
| < latest     | No        |

Once we reach v1.0, we will maintain security updates for the current major version and one prior major version.

## Security Considerations

### Local-First Architecture

Kindling is designed as a local-first tool:

- All data is stored locally in SQLite
- No data is sent to external services
- No network connections are made by the core packages

### Data Sensitivity

Kindling captures development activity which may include:

- Tool call arguments and results
- Command output
- File diffs
- Error messages and stack traces

**Automatic protections:**

- The OpenCode adapter includes automatic secret redaction
- Content is truncated to prevent excessive storage
- Certain file paths are excluded by default

**User responsibilities:**

- Review captured observations periodically
- Use redaction for accidentally captured secrets
- Secure the SQLite database file appropriately

### Database Security

The SQLite database file contains all captured observations. Users should:

- Restrict file permissions appropriately
- Consider encryption for sensitive environments
- Include the database in backup strategies
