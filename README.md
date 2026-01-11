# Kindling

**Local memory and continuity engine for AI-assisted development**

Kindling captures observations (tool calls, diffs, commands, errors) from AI-assisted workflows, organizes them into capsules (bounded units of meaning), and makes context retrievable with deterministic, explainable results—all running locally with no external services.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

## Problem

AI-assisted development produces large volumes of transient activity (tool calls, diffs, agent runs) but loses context between sessions. Developers and local agents repeatedly re-discover the same information, leading to wasted time, architectural drift, and brittle workflows.

## Solution

Kindling provides **continuity without judgement**. It captures what happened, preserves provenance, and makes context retrievable in a deterministic, explainable way—without asserting organizational truth or governance.

### Key Features

- **📦 Observation Capture**: Records tool calls, commands, file diffs, errors, and messages with full provenance
- **🎯 Capsule-Based Organization**: Groups observations into bounded units (sessions, workflow nodes)
- **🔍 Deterministic Retrieval**: FTS-based search with explainable, stable ranking
- **📌 Pin Management**: User-controlled high-priority content with optional TTL
- **💾 Local-First**: Embedded SQLite with WAL mode, no external dependencies
- **🔒 Privacy-Aware**: Redaction support, bounded output capture
- **🎨 Adapter Architecture**: OpenCode and PocketFlow integrations included

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Adapters                         │
│  ┌──────────────┐        ┌──────────────────────┐  │
│  │  OpenCode    │        │  PocketFlow Nodes    │  │
│  │  Sessions    │        │  (Workflows)         │  │
│  └──────┬───────┘        └──────────┬───────────┘  │
└─────────┼──────────────────────────┼───────────────┘
          │                          │
          └─────────┬────────────────┘
                    ▼
         ┌──────────────────────┐
         │  KindlingService     │ ← Orchestration
         │  (kindling-core)     │
         └──────────┬───────────┘
                    │
       ┌────────────┴──────────────┐
       ▼                           ▼
┌──────────────┐          ┌─────────────────────┐
│ SqliteStore  │          │ LocalRetrieval      │
│ (persistence)│          │ Provider (search)   │
└──────┬───────┘          └──────────┬──────────┘
       │                             │
       └──────────┬──────────────────┘
                  ▼
       ┌─────────────────────┐
       │  SQLite Database    │
       │  (WAL + FTS5)       │
       └─────────────────────┘
```

## Package Structure

Kindling is organized as a TypeScript monorepo with clear boundaries:

- **[@kindling/core](packages/kindling-core)** - Domain types, capsule lifecycle, retrieval orchestration
- **[@kindling/store-sqlite](packages/kindling-store-sqlite)** - SQLite persistence with FTS indexing
- **[@kindling/provider-local](packages/kindling-provider-local)** - FTS-based retrieval with ranking
- **[@kindling/adapter-opencode](packages/kindling-adapter-opencode)** - OpenCode session integration
- **[@kindling/adapter-pocketflow](packages/kindling-adapter-pocketflow)** - Workflow node integration
- **[@kindling/cli](packages/kindling-cli)** - Command-line tools for inspection and management

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/EddaCraft/kindling.git
cd kindling

# Install dependencies
pnpm install

# Build all packages
pnpm run build
```

### Basic Usage

```typescript
import { openDatabase, SqliteKindlingStore } from '@kindling/store-sqlite';
import { LocalFtsProvider } from '@kindling/provider-local';
import { KindlingService } from '@kindling/core';

// Initialize Kindling
const db = openDatabase({ path: './my-memory.db' });
const store = new SqliteKindlingStore(db);
const provider = new LocalFtsProvider(db);
const service = new KindlingService({ store, provider });

// Open a session capsule
const capsule = service.openCapsule({
  type: 'session',
  intent: 'debug',
  scopeIds: { sessionId: 'session-1', repoId: 'my-project' },
});

// Capture observations
service.appendObservation({
  id: 'obs-1',
  kind: 'command',
  content: 'npm test failed',
  provenance: { command: 'npm test', exitCode: 1 },
  ts: Date.now(),
  scopeIds: { sessionId: 'session-1' },
  redacted: false,
}, { capsuleId: capsule.id });

service.appendObservation({
  id: 'obs-2',
  kind: 'error',
  content: 'Authentication failed',
  provenance: { stack: 'Error: Auth failed\n  at login.ts:42' },
  ts: Date.now(),
  scopeIds: { sessionId: 'session-1' },
  redacted: false,
}, { capsuleId: capsule.id });

// Retrieve relevant context
const results = await service.retrieve({
  query: 'authentication',
  scopeIds: { sessionId: 'session-1' },
});

console.log('Found:', results.candidates.length, 'relevant observations');

// Close session with summary
service.closeCapsule(capsule.id, {
  generateSummary: true,
  summaryContent: 'Fixed authentication bug in token validation',
});

db.close();
```

### CLI Usage

```bash
# Show database status
kindling status

# Search for context
kindling search "authentication error"
kindling search --session session-123

# List entities
kindling list capsules
kindling list pins
kindling list observations

# Pin important findings
kindling pin observation obs_abc123 --note "Root cause identified"

# Remove a pin
kindling unpin pin_xyz789

# Export memory
kindling export my-backup.json --pretty

# Import memory
kindling import my-backup.json
```

## LLM Integration Guide

**For AI Assistants (Claude, GPT-4, etc.)**: This section explains how to integrate Kindling into your conversation flow to provide continuity across sessions.

### When to Use Kindling

**Use Kindling when:**
- Working on multi-session tasks (debugging, feature implementation across days)
- User explicitly asks to "remember this" or "save this for later"
- Encountering patterns that might recur (error messages, configuration issues)
- User switches between multiple projects/repos
- Completing a significant task that should be searchable later

**Don't use for:**
- Trivial one-line fixes
- User explicitly requests a "fresh start"
- Sensitive data unless explicitly approved by user

### Integration Pattern

#### 1. Session Start (Retrieve Context)

At the beginning of each session, retrieve relevant context:

```typescript
import { openDatabase, SqliteKindlingStore } from '@kindling/store-sqlite';
import { LocalFtsProvider } from '@kindling/provider-local';
import { KindlingService } from '@kindling/core';

// Initialize once per session
const db = openDatabase({ path: '~/.kindling/project.db' });
const store = new SqliteKindlingStore(db);
const provider = new LocalFtsProvider(db);
const service = new KindlingService({ store, provider });

// Retrieve context based on user's query or session scope
const context = await service.retrieve({
  query: 'authentication bug debugging', // User's current focus
  scopeIds: {
    sessionId: 'current-session-id',
    repoId: 'user-project',
    userId: 'user-123'
  },
  maxCandidates: 10,
});

// Use context to inform your responses
if (context.pins.length > 0) {
  console.log('📌 Previously pinned important findings:');
  context.pins.forEach(pin => {
    console.log(`- ${pin.target.content}`);
    console.log(`  Note: ${pin.pin.reason}`);
  });
}

if (context.currentSummary) {
  console.log('\n📝 Recent session summary:');
  console.log(context.currentSummary.content);
}

if (context.candidates.length > 0) {
  console.log('\n🔍 Relevant past work:');
  context.candidates.slice(0, 3).forEach(c => {
    console.log(`- [${c.score.toFixed(2)}] ${c.entity.content.substring(0, 100)}...`);
  });
}
```

#### 2. During Session (Capture Observations)

As you work with the user, capture significant events:

```typescript
// Open a capsule for this work session
const capsule = service.openCapsule({
  type: 'session',
  intent: 'debug', // or 'implement', 'refactor', 'test', 'explore'
  scopeIds: {
    sessionId: 'session-2026-01-10-1400',
    repoId: 'my-app',
    userId: 'alice'
  },
});

// Capture commands you run
service.appendObservation({
  id: `obs-${Date.now()}-1`,
  kind: 'command',
  content: 'npm test -- auth.test.js',
  provenance: {
    command: 'npm test -- auth.test.js',
    exitCode: 1,
    output: 'Test failed: Expected 200, got 401'
  },
  ts: Date.now(),
  scopeIds: { sessionId: 'session-2026-01-10-1400' },
  redacted: false,
}, { capsuleId: capsule.id });

// Capture errors encountered
service.appendObservation({
  id: `obs-${Date.now()}-2`,
  kind: 'error',
  content: 'JWT verification failed: invalid signature',
  provenance: {
    stack: 'Error: invalid signature\n  at verify (jsonwebtoken:234)\n  at validateToken (auth.ts:42)',
    file: 'src/auth.ts',
    line: 42
  },
  ts: Date.now(),
  scopeIds: { sessionId: 'session-2026-01-10-1400' },
  redacted: false,
}, { capsuleId: capsule.id });

// Capture file changes you made
service.appendObservation({
  id: `obs-${Date.now()}-3`,
  kind: 'file_diff',
  content: 'Changed JWT algorithm from RS256 to HS256 in auth.ts',
  provenance: {
    file: 'src/auth.ts',
    linesChanged: 3,
    hunks: ['- algorithm: "RS256"', '+ algorithm: "HS256"']
  },
  ts: Date.now(),
  scopeIds: { sessionId: 'session-2026-01-10-1400' },
  redacted: false,
}, { capsuleId: capsule.id });

// Capture important user messages
service.appendObservation({
  id: `obs-${Date.now()}-4`,
  kind: 'message',
  content: 'User: The issue was that we were using RS256 but our secret was configured for HS256. Need to document this.',
  provenance: {
    role: 'user',
    messageId: 'msg-456'
  },
  ts: Date.now(),
  scopeIds: { sessionId: 'session-2026-01-10-1400' },
  redacted: false,
}, { capsuleId: capsule.id });
```

#### 3. Mark Critical Findings (Use Pins)

When you identify root causes or important patterns:

```typescript
// Pin the root cause so it's always retrieved first in future sessions
service.pin({
  targetType: 'observation',
  targetId: 'obs-1736512800000-2', // The error observation
  note: 'Root cause: JWT algorithm mismatch (RS256 vs HS256). Always verify algorithm matches secret type.',
  scopeIds: {
    repoId: 'my-app', // Make it available across all sessions for this repo
  },
  ttlMs: 30 * 24 * 60 * 60 * 1000, // Keep for 30 days
});
```

**When to pin:**
- Root causes of bugs
- Solutions that worked after many attempts
- Patterns the user explicitly says "remember this"
- Configuration gotchas or non-obvious fixes

#### 4. Session End (Generate Summary)

When the user completes a task or ends the session:

```typescript
// Close capsule with a summary
service.closeCapsule(capsule.id, {
  generateSummary: true,
  summaryContent: 'Fixed JWT authentication by switching from RS256 to HS256 algorithm. Root cause was algorithm mismatch between token generation and verification. Updated auth.ts:42. All tests now passing.',
  confidence: 0.9, // How confident you are in the solution (0.0 - 1.0)
  evidenceRefs: ['obs-1736512800000-2', 'obs-1736512800000-3'], // Reference key observations
});

// Clean up
db.close();
```

**Summary best practices:**
- Include what was accomplished
- Mention the root cause if debugging
- Reference specific files/functions changed
- Note if issue is fully resolved or partially addressed
- Keep it concise (2-3 sentences max)

### Observation Kind Reference

Use the appropriate `kind` for each observation:

| Kind | When to Use | Example |
|------|-------------|---------|
| `command` | Shell commands executed | `npm test`, `docker-compose up`, `git status` |
| `error` | Errors encountered | Stack traces, test failures, compilation errors |
| `file_diff` | File changes made | Edits, new files, deletions |
| `tool_call` | LLM tool invocations | Read file, Grep, Bash commands |
| `message` | Important user/assistant exchanges | Root cause discoveries, decisions made |
| `node_start` | Workflow node begins | CI job starts, automated task begins |
| `node_output` | Workflow produces output | Test results, build artifacts |
| `node_error` | Workflow error | CI failure, timeout |
| `node_end` | Workflow completes | Final status, summary |

### Best Practices for LLMs

#### ✅ **Do:**

1. **Retrieve context early**: Check for relevant past work at session start
2. **Capture failed attempts**: Document what didn't work (saves time later)
3. **Pin root causes**: Use pins for discoveries that should always be found
4. **Use specific queries**: `"JWT HS256 algorithm error"` > `"authentication"`
5. **Scope appropriately**: Use `repoId` for repo-wide patterns, `sessionId` for session-specific
6. **Redact secrets**: Set `redacted: true` for observations containing credentials
7. **Close capsules**: Always generate summaries when work is complete

#### ❌ **Don't:**

1. **Don't capture every single action**: Only significant events
2. **Don't duplicate context**: If something is already captured, don't re-capture
3. **Don't use vague summaries**: "Fixed bugs" → "Fixed JWT algorithm mismatch (RS256→HS256)"
4. **Don't pin trivial things**: Pins are for important, recurring patterns
5. **Don't forget to close capsules**: Open capsules without summaries are wasted context
6. **Don't capture user's sensitive data**: Check for API keys, passwords, tokens

### Example: Complete Session Flow

```typescript
// 1. SESSION START - Retrieve context
const context = await service.retrieve({
  query: 'database connection errors postgres',
  scopeIds: { repoId: 'my-app' },
});

// Show user what you remember
console.log(`I found ${context.pins.length} pinned notes and ${context.candidates.length} relevant past work on this topic.`);

// 2. DURING WORK - Open capsule and capture
const capsule = service.openCapsule({
  type: 'session',
  intent: 'debug',
  scopeIds: { sessionId: 'sess-123', repoId: 'my-app' },
});

// User reports error
service.appendObservation({
  id: 'obs-1',
  kind: 'error',
  content: 'Error: connect ECONNREFUSED 127.0.0.1:5432',
  provenance: { stack: '...' },
  ts: Date.now(),
  scopeIds: { sessionId: 'sess-123' },
  redacted: false,
}, { capsuleId: capsule.id });

// You run diagnostic command
service.appendObservation({
  id: 'obs-2',
  kind: 'command',
  content: 'docker ps | grep postgres',
  provenance: { exitCode: 0, output: '(no postgres containers)' },
  ts: Date.now(),
  scopeIds: { sessionId: 'sess-123' },
  redacted: false,
}, { capsuleId: capsule.id });

// 3. ROOT CAUSE FOUND - Pin it
service.pin({
  targetType: 'observation',
  targetId: 'obs-2',
  note: 'Postgres not running. Always run `docker-compose up -d` before tests.',
  scopeIds: { repoId: 'my-app' },
  ttlMs: 90 * 24 * 60 * 60 * 1000, // 90 days
});

// 4. SOLUTION APPLIED - Capture
service.appendObservation({
  id: 'obs-3',
  kind: 'command',
  content: 'docker-compose up -d',
  provenance: { exitCode: 0, output: 'Started postgres' },
  ts: Date.now(),
  scopeIds: { sessionId: 'sess-123' },
  redacted: false,
}, { capsuleId: capsule.id });

// 5. SESSION END - Close with summary
service.closeCapsule(capsule.id, {
  generateSummary: true,
  summaryContent: 'Fixed database connection error. Root cause: Postgres Docker container was not running. Started with docker-compose up -d. Tests now passing.',
  confidence: 1.0,
});

db.close();
```

### Handling Multiple Projects

Use `repoId` to keep projects separate:

```typescript
// User switches projects
const context = await service.retrieve({
  query: 'how did I handle authentication',
  scopeIds: {
    repoId: 'new-project', // Different repo
    userId: 'alice'
  },
});

// No results? Try broader search across all projects
if (context.candidates.length === 0) {
  const crossProjectContext = await service.retrieve({
    query: 'authentication JWT implementation',
    scopeIds: { userId: 'alice' }, // Search all user's repos
  });
}
```

### Privacy & Redaction

Always redact sensitive data:

```typescript
service.appendObservation({
  id: 'obs-sensitive',
  kind: 'error',
  content: 'API call failed: 401 Unauthorized',
  provenance: {
    endpoint: 'https://api.example.com/users',
    // API key is NOT included
  },
  ts: Date.now(),
  scopeIds: { sessionId: 'sess-123' },
  redacted: true, // Mark as redacted
}, { capsuleId: capsule.id });
```

**Redact:**
- API keys, tokens, passwords
- User PII (emails, names in logs)
- Database connection strings with credentials
- Private repository content (if uncertain about sharing)

### Multi-Agent Concurrency

**For 5+ concurrent agents**, use the API server approach:

#### Option 1: Direct SDK (2-4 agents, occasional writes)

Each agent opens its own connection. SQLite WAL mode handles coordination:

```typescript
// Agent 1
const db1 = openDatabase({ path: '~/.kindling/shared.db' });
const store1 = new SqliteKindlingStore(db1);

// Agent 2 (different process)
const db2 = openDatabase({ path: '~/.kindling/shared.db' });
const store2 = new SqliteKindlingStore(db2);

// Add retry logic for concurrent writes
async function withRetry<T>(fn: () => T, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return fn();
    } catch (err: any) {
      if (err.code === 'SQLITE_BUSY' && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

// Use it
await withRetry(() => store1.insertObservation(obs));
```

#### Option 2: API Server (5+ agents, high concurrency)

Start the API server to coordinate all writes:

```bash
# Terminal 1: Start API server (holds single DB connection)
kindling serve --port 8080 --db ~/.kindling/shared.db

# Terminal 2+: Agents make HTTP requests
curl -X POST http://localhost:8080/api/observations \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "error",
    "content": "JWT verification failed",
    "scopeIds": {"sessionId": "sess-123"},
    "capsuleId": "capsule-abc"
  }'
```

**TypeScript client:**

```typescript
import { KindlingApiClient } from '@kindling/api-server/client';

// All agents connect to same server
const client = new KindlingApiClient('http://localhost:8080');

// Writes are naturally serialized through server
await client.appendObservation({
  kind: 'command',
  content: 'npm test',
  scopeIds: { sessionId: 'agent-1-session' },
  capsuleId: 'capsule-123'
});

// Reads work as expected
const results = await client.retrieve({
  query: 'authentication error',
  scopeIds: { repoId: 'my-app' }
});
```

**Benefits:**
- No lock contention (server holds single connection)
- Language-agnostic (HTTP)
- Built-in request queuing
- Still local-first (server on localhost, data never leaves machine)

### Web Agents (Claude Code Web)

**Challenge:** Claude Code Web runs in **remote sandboxes** on Anthropic's infrastructure, not in your browser. It cannot:
- Access your local filesystem
- Connect to local MCP servers
- Make requests to `localhost`

**Why?** Security and isolation - Claude Code Web executes in Google Gvisor containers on Anthropic's servers, with only GitHub OAuth access.

#### ✅ Solution: GitHub Submodule Bridge

Since Claude Code Web has native GitHub integration, use a **git submodule** to include your Kindling memory repo.

**⚠️ Important:** Even for a single project, you need a submodule if you want Kindling in a separate repo. Claude Code Web connects to ONE repo at a time, so the submodule brings memory into that repo's filesystem.

**Complete Setup:**

```bash
# STEP 1: Create shared Kindling memory repository (ONCE, globally)
kindling sync init --repo username/kindling-memory --private

# This creates on GitHub:
# username/kindling-memory (private repo)
#   └── .kindling/
#       ├── index.json
#       ├── capsules/
#       └── pins/

# STEP 2: Add submodule to EVERY project (even if you only have one)
cd ~/projects/my-app
kindling sync add-submodule

# This runs:
#   git submodule add https://github.com/username/kindling-memory.git .kindling
#   git commit -m "Add Kindling memory submodule"

# Your project structure now:
# my-app/
#   ├── src/              ← Your code
#   ├── .kindling/        ← Submodule (points to kindling-memory repo)
#   │   ├── index.json
#   │   └── ...
#   ├── .gitmodules       ← Git submodule config (auto-created)
#   └── package.json

# STEP 3: Sync memory as you work
kindling sync push  # Pushes to kindling-memory repo

# STEP 4: Other projects pull latest memory
cd ~/projects/other-app
git submodule update --remote --merge  # Gets latest from kindling-memory
```

**Architecture:**

```
┌─────────────────────────────────────────────────────────┐
│  Your Project: my-app (GitHub)                          │
│                                                          │
│  src/                    ← Claude Code Web works here   │
│  .kindling/              ← Git submodule                 │
│    ├── index.json        ← Claude reads this!           │
│    ├── capsules/                                         │
│    └── pins/                                             │
│  .gitmodules             ← Submodule config             │
└────────────┬────────────────────────────────────────────┘
             │ .kindling/ points to ↓
             │
┌────────────▼────────────────────────────────────────────┐
│  Separate Repo: kindling-memory (private)               │
│                                                          │
│  .kindling/                                              │
│    ├── index.json        ← Synced from local Kindling   │
│    ├── capsules/                                         │
│    └── pins/                                             │
└─────────────────────────────────────────────────────────┘
      ↑
      │ Local agents sync here
      │
┌─────┴───────┐
│ Your Machine│
│ Kindling DB │
└─────────────┘
```

**What Claude Code Web can do:**

```javascript
// Read memory index (automatically available in repo)
const memory = JSON.parse(fs.readFileSync('.kindling/index.json', 'utf8'));

// Find relevant pins
const pins = memory.pins.filter(pin =>
  pin.scopeIds.repoId === currentRepo
);

// Read capsule summaries
const summaries = memory.summaries.filter(s =>
  s.content.includes(searchTerm)
);

console.log(`Found ${pins.length} pinned items for this repo`);
```

**Benefits:**
- ✅ No servers to expose publicly
- ✅ Works with Claude Code Web's existing GitHub OAuth
- ✅ Still "local-first" (you control the private repo)
- ✅ Selective sync (redacted items excluded)
- ✅ Read-only by default (safe)

**Security:**
- Repo MUST be private
- Redacted observations never synced
- Configurable scope (last 7 days, specific repos, etc.)

**FAQ:**

**Q: Do I need a submodule if I only work on one project?**
**A: YES.** If you want Kindling in a separate repo (recommended), you need a submodule. Claude Code Web connects to ONE repo, so the submodule is how it accesses the memory repo.

**Q: Can I skip the submodule and just sync directly to my project repo?**
**A: Yes, but not recommended.** You could run `kindling sync push --target ./.kindling/` to sync into the same repo. But this:
- ❌ Clutters git history with memory syncs
- ❌ Mixes memory data with code
- ❌ Can't share memory across multiple projects

**Q: I have 3 projects. Do I need to set up submodules 3 times?**
**A: YES.** Create the kindling-memory repo once (`sync init`), then add it as a submodule to each project (`sync add-submodule`). All 3 projects share the same memory.

**Q: What if my project is public but I want Kindling private?**
**A: Perfect use case.** The submodule can be private even if the parent repo is public. GitHub respects permissions - only people with access to both repos can see the memory.

#### 🔒 Alternative: Secure Tunnel (Advanced)

If you need full API access from Claude Code Web's remote sandbox:

```bash
# Option A: Cloudflare Tunnel (recommended)
cloudflare tunnel --url http://localhost:8080

# Option B: ngrok
ngrok http 8080
```

Then Claude Code Web can make HTTP requests to the public URL, which tunnels back to your local machine.

**⚠️ Security considerations:**
- Add authentication (API keys, OAuth)
- Use HTTPS only
- Rate limiting
- IP allowlisting (Anthropic's IP ranges)

#### ❌ What Doesn't Work

**MCP Integration:** Claude Code Web's remote sandbox [cannot access local MCP servers](https://github.com/anthropics/claude-code/issues/11146). MCP only works with desktop/CLI Claude Code.

**Browser Extensions:** Extensions run in your local browser, but Claude Code Web runs in remote containers. They can't communicate directly.

**localhost API:** Claude Code Web cannot reach `http://localhost:8080` because it's not running on your machine.

### Testing Your Integration

```bash
# After capturing a session, verify it worked:
kindling status
kindling list capsules --limit 5
kindling search "your test query"

# Check if pins were created:
kindling list pins

# Verify export works:
kindling export test-export.json --pretty
```

## Use Cases

### 1. Session Continuity

Capture entire development sessions and resume work without re-explaining context:

```typescript
import { SessionAdapter } from '@kindling/adapter-opencode';

const adapter = new SessionAdapter({ service });

// Session starts
adapter.onSessionStart('session-1', { repoId: 'my-app' });

// Events flow in
adapter.onEvent({
  type: 'ToolCall',
  sessionId: 'session-1',
  data: { toolName: 'Read', result: '...' },
});

// Session ends
adapter.onSessionEnd('session-1', {
  summaryContent: 'Implemented user authentication',
});

// Later: retrieve session context
const context = await service.retrieve({
  query: 'context',
  scopeIds: { sessionId: 'session-1' },
});
```

### 2. Workflow Memory

Capture high-signal workflow executions with intent and confidence:

```typescript
import { NodeAdapter, NodeStatus } from '@kindling/adapter-pocketflow';

const adapter = new NodeAdapter({ service, repoId: 'my-app' });

// Workflow node executes
adapter.onNodeStart({
  node: { id: 'test-1', name: 'run-integration-tests' },
  status: NodeStatus.Running,
});

adapter.onNodeEnd({
  node: { id: 'test-1', name: 'run-integration-tests' },
  status: NodeStatus.Success,
  output: { passed: 42, failed: 0 },
});
// Creates capsule with intent='test', confidence based on history
```

### 3. Pin Critical Findings

Mark important discoveries for non-evictable retrieval:

```typescript
// Pin a critical error
service.pin({
  targetType: 'observation',
  targetId: errorObs.id,
  note: 'Root cause of production outage',
  ttlMs: 7 * 24 * 60 * 60 * 1000, // 1 week
});

// Pins always appear first in retrieval
const results = await service.retrieve({
  query: 'outage',
  scopeIds: {},
});
console.log(results.pins); // Includes the pinned error
```

## Core Concepts

### Observations

Atomic units of captured context:

- **ToolCall**: AI tool invocations (Read, Edit, Bash, etc.)
- **Command**: Shell commands with exit codes and output
- **FileDiff**: File changes with paths
- **Error**: Errors with stack traces
- **Message**: User/assistant messages
- **NodeStart/NodeOutput/NodeError/NodeEnd**: Workflow events

### Capsules

Bounded units of meaning that group observations:

- **Session**: Interactive development session
- **PocketFlowNode**: Single workflow node execution
- **Custom**: User-defined capsule types

Each capsule has:
- Type and intent (debug, implement, test, etc.)
- Open/close lifecycle
- Automatic summary generation on close
- Scope (sessionId, repoId, agentId, userId)

### Retrieval Tiers

Deterministic, explainable retrieval with 3 tiers:

1. **Pins** - Non-evictable, user-controlled
2. **Current Summary** - Active session/capsule context
3. **Provider Hits** - Ranked FTS results with explainability

Ranking factors:
- Scope match (session > repo > agent/user)
- Recency decay
- Confidence weighting (for summaries)
- Intent matching

## Development

### Project Structure

```
kindling/
├── packages/
│   ├── kindling-core/          # Domain model & orchestration
│   ├── kindling-store-sqlite/  # SQLite persistence
│   ├── kindling-provider-local/# FTS retrieval
│   ├── kindling-adapter-opencode/
│   ├── kindling-adapter-pocketflow/
│   └── kindling-cli/           # CLI tools
├── plans/                      # Detailed planning docs
│   ├── index.aps.md           # Roadmap & milestones
│   └── modules/               # Module specifications
└── docs/                       # Additional documentation
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
cd packages/kindling-core
pnpm test

# Watch mode
pnpm run test:watch
```

### Building

```bash
# Build all packages
pnpm run build

# Build specific package
cd packages/kindling-cli
pnpm run build

# Clean build artifacts
pnpm run clean
```

## Roadmap

✅ **M1: OSS Scaffolding** - Repository structure, planning documentation
✅ **M2: Local Capture + Continuity (OpenCode)** - Core capture, storage, and retrieval
✅ **M3: High-Signal Workflows (PocketFlow)** - Workflow-driven capsules with intent/confidence
✅ **M4: OSS Hardening** - CLI tools, export/import, documentation polish

Future:
- **Semantic retrieval** (embeddings integration)
- **Multi-user support** with conflict resolution
- **Advanced export/import** (partial exports, merge strategies)
- **Edda**: Governance and curation layer

## Design Principles

1. **Capture, Don't Judge**: Kindling preserves what happened without asserting truth
2. **Deterministic & Explainable**: All retrieval results include "why" explanations
3. **Local-First**: No external services, embedded SQLite
4. **Privacy-Aware**: Redaction, bounded output, configurable capture
5. **Provenance Always**: Every piece of context points to concrete evidence

## Non-Goals

Kindling explicitly does **not**:
- Decide what memory is authoritative (that's Edda's job)
- Manage organizational lifecycle or approval workflows
- Provide multi-user collaboration (yet)
- Replace existing knowledge management systems

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

Apache 2.0 - See [LICENSE](LICENSE) for details.

## Documentation

- [Plans & Roadmap](plans/index.aps.md)
- [Architecture Overview](docs/architecture.md) (coming soon)
- [Data Model](docs/data-model.md) (coming soon)
- [Retrieval Contract](docs/retrieval-contract.md) (coming soon)

## Planning (APS)

FYI: Kindling uses APS docs for roadmap and module planning. If you want the longer-form planning context, start at [plans/index.aps.md](plans/index.aps.md).

## Support

- **Issues**: [GitHub Issues](https://github.com/EddaCraft/kindling/issues)
- **Security**: See [SECURITY.md](SECURITY.md)

---

**Built with ❤️ by the EddaCraft team**
