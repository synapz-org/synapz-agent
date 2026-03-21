# Agent Economy Phase 1: Discord Bot Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Discord bot that monitors Covenant's #comms-chat, extracts actionable tasks via Claude API, creates GitHub issues on covenant-narrative, and posts digests to Derek's synapz_org Discord server.

**Architecture:** Single Node.js process using discord.js for Discord connectivity, @anthropic-ai/sdk for task extraction, and octokit for GitHub operations. The bot runs two guild connections (Covenant server as listener, synapz_org as command center). Messages are batched in 5-minute windows, sent to Claude for extraction, and high-confidence tasks become GitHub issues automatically.

**Tech Stack:** Node.js 22, TypeScript, discord.js v14, @anthropic-ai/sdk, @octokit/rest, croner (ESM-native cron), vitest

**Spec:** `docs/superpowers/specs/2026-03-21-personal-agent-economy-design.md`

---

## File Structure

```
synapz-agent/
  package.json                    # Project manifest, scripts, dependencies
  tsconfig.json                   # TypeScript config
  .env.example                    # Template for required env vars
  src/
    index.ts                      # Entry point: wire up bot + scheduler, start
    bot/
      client.ts                   # Discord client setup, guild connection, event routing
      monitor.ts                  # Channel message batching (5-min windows)
      commands.ts                 # synapz_org command handling (status, task, etc.)
      digest.ts                   # Digest formatting and posting to #agent-feed
    extraction/
      extractor.ts                # Claude API call: chat messages -> structured tasks
      prompt.ts                   # Extraction system prompt and schema definition
    github/
      issues.ts                   # Create issues, manage labels, query state
      registry.ts                 # Project registry: repo routes, owners, keywords
    config/
      workers.ts                  # Worker config loader (YAML parsing) — stub for Phase 2
      settings.ts                 # App-wide settings (thresholds, intervals, channels)
    types.ts                      # Shared TypeScript types
  workers/
    covenant-content.yaml         # Worker config for covenant-narrative
  data/
    extraction-feedback.ndjson     # False positive feedback log (appended to)
  test/
    extraction/
      extractor.test.ts           # Extraction unit tests with mocked Claude API
      prompt.test.ts              # Prompt construction tests
    github/
      issues.test.ts              # GitHub issue creation tests with mocked octokit
      registry.test.ts            # Registry routing tests
    bot/
      monitor.test.ts             # Message batching tests
      commands.test.ts            # Command parsing tests
      digest.test.ts              # Digest formatting tests
    fixtures/
      discord-messages.json       # Sample Discord messages (from real #comms-chat)
      extraction-results.json     # Expected extraction outputs
```

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.env.example`
- Create: `src/index.ts`
- Create: `src/types.ts`

- [ ] **Step 1: Initialize package.json**

```bash
cd ~/Projects/synapz-agent
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
npm install discord.js @anthropic-ai/sdk @octokit/rest croner yaml dotenv
npm install -D typescript vitest @types/node tsx
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

- [ ] **Step 4: Create .env.example**

```
# Discord
DISCORD_BOT_TOKEN=
COVENANT_GUILD_ID=
COVENANT_CHANNEL_IDS=           # comma-separated channel IDs to monitor
SYNAPZ_GUILD_ID=
SYNAPZ_FEED_CHANNEL_ID=        # #agent-feed channel ID
SYNAPZ_APPROVALS_CHANNEL_ID=   # #approvals channel ID
SYNAPZ_COMMANDS_CHANNEL_ID=    # #commands channel ID

# Claude API
ANTHROPIC_API_KEY=

# GitHub
GITHUB_TOKEN=                   # PAT with repo scope
```

- [ ] **Step 5: Create src/types.ts**

```typescript
export interface ExtractedTask {
  title: string;
  body: string;
  repo: string;
  confidence: number;
  urgency: 'now' | 'today' | 'this-week' | 'someday';
  source: {
    author: string;
    channel: string;
    timestamp: string;
  };
  source_message: string;
}

export interface ExtractionResult {
  tasks: ExtractedTask[];
  ignored: string[];
}

export interface RepoRoute {
  repo: string;
  owner: string;
  keywords: string[];
  description: string;
}

export interface WorkerConfig {
  name: string;
  repo: string;
  schedule: string;
  agent: {
    type: 'claude-cli' | 'codex-cli' | 'claude-api' | 'openclaw';
    prompt_file: string;
    max_turns?: number;
    allowed_tools?: string[];
  };
  triggers?: { github_issue_labeled?: string }[];
  notifications?: { channel: string };
  auto_merge_eligible?: boolean;
  max_duration?: number;
}

export interface WorkerResult {
  success: boolean;
  prs_opened: string[];
  issues_updated: string[];
  branches_created: string[];
  exit_reason: string;
  summary?: string;
}

export interface AppSettings {
  extraction: {
    confidence_threshold: number;
    batch_window_ms: number;
    max_issues_per_batch: number;
  };
  concurrency: {
    max_concurrent_workers: number;
  };
  digest: {
    interval_ms: number;
  };
}
```

- [ ] **Step 6: Create src/index.ts (minimal entry point)**

```typescript
import 'dotenv/config';

async function main() {
  console.log('synapz-agent orchestrator starting...');

  // Modules will be wired up in subsequent tasks
  const requiredEnv = [
    'DISCORD_BOT_TOKEN',
    'ANTHROPIC_API_KEY',
    'GITHUB_TOKEN',
  ];

  for (const key of requiredEnv) {
    if (!process.env[key]) {
      console.error(`Missing required env var: ${key}`);
      process.exit(1);
    }
  }

  console.log('Environment validated. Modules will be connected in subsequent tasks.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

- [ ] **Step 7: Add scripts to package.json**

Add to `package.json` scripts:
```json
{
  "scripts": {
    "start": "tsx src/index.ts",
    "dev": "tsx watch src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "build": "tsc"
  }
}
```

Also set `"type": "module"` in package.json.

- [ ] **Step 8: Update .gitignore**

Append to existing `.gitignore`:
```
node_modules/
dist/
.env
logs/
```

- [ ] **Step 9: Verify scaffold**

Run: `npm run build`
Expected: Compiles with no errors.

Run: `npm start`
Expected: Prints "synapz-agent orchestrator starting..." then exits (no env vars set).

- [ ] **Step 10: Commit**

```bash
git add package.json tsconfig.json .env.example src/index.ts src/types.ts .gitignore
git commit -m "feat: scaffold Node.js project for agent economy orchestrator"
```

---

### Task 2: Project Registry and Config

**Files:**
- Create: `src/config/settings.ts`
- Create: `src/github/registry.ts`
- Create: `workers/covenant-content.yaml`
- Create: `test/github/registry.test.ts`

- [ ] **Step 1: Write failing registry tests**

Create `test/github/registry.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { loadRegistry, routeTask } from '../../src/github/registry.js';

describe('registry', () => {
  const registry = loadRegistry();

  it('loads all configured routes', () => {
    expect(registry.length).toBeGreaterThanOrEqual(1);
    expect(registry[0]).toHaveProperty('repo');
    expect(registry[0]).toHaveProperty('owner');
    expect(registry[0]).toHaveProperty('description');
  });

  it('finds covenant-narrative route', () => {
    const route = registry.find(r => r.repo === 'covenant-narrative');
    expect(route).toBeDefined();
    expect(route!.owner).toBe('snarktank');
  });
});

describe('routeTask', () => {
  const registry = loadRegistry();

  it('routes covenant content keywords to covenant-narrative', () => {
    const result = routeTask('Draft a tweet about Templar subnet launch', registry);
    expect(result?.repo).toBe('covenant-narrative');
  });

  it('routes barry keywords to barry-music-site', () => {
    const result = routeTask("Update Barry's tour dates page", registry);
    expect(result?.repo).toBe('barry-music-site');
  });

  it('returns null for unrouteable messages', () => {
    const result = routeTask('nice weather today', registry);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/github/registry.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create settings**

Create `src/config/settings.ts`:

```typescript
import type { AppSettings } from '../types.js';

export const settings: AppSettings = {
  extraction: {
    confidence_threshold: 0.7,
    batch_window_ms: 5 * 60 * 1000, // 5 minutes
    max_issues_per_batch: 5,
  },
  concurrency: {
    max_concurrent_workers: 3,
  },
  digest: {
    interval_ms: 2 * 60 * 60 * 1000, // 2 hours
  },
};
```

- [ ] **Step 4: Create registry**

Create `src/github/registry.ts`:

```typescript
import type { RepoRoute } from '../types.js';

const routes: RepoRoute[] = [
  {
    repo: 'covenant-narrative',
    owner: 'snarktank',
    keywords: [
      'content', 'article', 'tweet', 'thread', 'post',
      'templar', 'basilica', 'grail', 'covenant',
      'reddit', 'linkedin', 'campaign',
    ],
    description: 'Covenant AI marketing content and campaigns',
  },
  {
    repo: 'barry-music-site',
    owner: 'dwbarnes',
    keywords: ['barry', 'music', 'website', 'site', 'tour'],
    description: "Barry's music website",
  },
  {
    repo: 'crunchdao-synth',
    owner: 'dwbarnes',
    keywords: ['crunchdao', 'model', 'score', 'competition', 'synth'],
    description: 'CrunchDAO competition model optimization',
  },
];

export function loadRegistry(): RepoRoute[] {
  return routes;
}

export function routeTask(text: string, registry: RepoRoute[]): RepoRoute | null {
  const lower = text.toLowerCase();
  let bestMatch: RepoRoute | null = null;
  let bestScore = 0;

  for (const route of registry) {
    let score = 0;
    for (const keyword of route.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = route;
    }
  }

  return bestMatch;
}
```

- [ ] **Step 5: Create worker config**

Create `workers/covenant-content.yaml`:

```yaml
name: covenant-content
repo: ~/Projects/covenant-narrative
schedule: "0 */4 * * *"
agent:
  type: claude-cli
  prompt_file: .claude/prompts/work-cycle.md
  max_turns: 50
  allowed_tools:
    - Edit
    - Write
    - Bash
    - Grep
    - Glob
    - Read
triggers:
  - github_issue_labeled: ready
notifications:
  channel: synapz_org#agent-feed
auto_merge_eligible: false
max_duration: 1800  # 30 minutes
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run test/github/registry.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/config/ src/github/registry.ts workers/ test/github/
git commit -m "feat: add project registry with keyword routing and worker config"
```

---

### Task 3: Claude API Extraction

**Files:**
- Create: `src/extraction/prompt.ts`
- Create: `src/extraction/extractor.ts`
- Create: `test/extraction/prompt.test.ts`
- Create: `test/extraction/extractor.test.ts`
- Create: `test/fixtures/discord-messages.json`
- Create: `test/fixtures/extraction-results.json`

- [ ] **Step 1: Create test fixtures from real chat**

Create `test/fixtures/discord-messages.json`:

```json
[
  {
    "id": "batch-1",
    "messages": [
      { "author": "synapz", "content": "LinkedIn post scheduled for tomorrow morning. Reddit post made in /bittensor subreddit: https://www.reddit.com/r/bittensor_/comments/1ryd3nx/", "timestamp": "2026-03-19T17:45:00Z" },
      { "author": "synapz", "content": "Give it an upvote!", "timestamp": "2026-03-19T17:48:00Z" },
      { "author": "kurtwagner0937", "content": "can you at everyone in general and the bittensor channels to upvote it", "timestamp": "2026-03-19T17:52:00Z" }
    ],
    "expected_task_count": 1,
    "expected_title_contains": "upvote"
  },
  {
    "id": "batch-2",
    "messages": [
      { "author": "AdamW", "content": "The key is emojis. Put as many as possibly in", "timestamp": "2026-03-20T03:16:00Z" },
      { "author": "kurtwagner0937", "content": "@synapz please remove him from this discord", "timestamp": "2026-03-20T03:17:00Z" },
      { "author": "AdamW", "content": "Okay sorry. Done memeing. Please return to the serious CMO discussions", "timestamp": "2026-03-20T03:19:00Z" }
    ],
    "expected_task_count": 0
  },
  {
    "id": "batch-3",
    "messages": [
      { "author": "Evan  | covenant.ai", "content": "hey guys, here's how it looks like, about the autoresearch-rl that runs natively over basilica. I can start an article and hand it over. How would you like it? https://github.com/epappas/autoresearch-rl/blob/main/docs/research/GRPO-Showcase-Report.md", "timestamp": "2026-03-20T03:06:00Z" },
      { "author": "kurtwagner0937", "content": "i think we should wait for peak time lol. the jensen tweet didnt perform as well. wdyt @synapz / @Oriea ?", "timestamp": "2026-03-20T03:14:00Z" }
    ],
    "expected_task_count": 1,
    "expected_title_contains": "article"
  }
]
```

- [ ] **Step 2: Write prompt construction tests**

Create `test/extraction/prompt.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildExtractionPrompt } from '../../src/extraction/prompt.js';
import { loadRegistry } from '../../src/github/registry.js';

describe('buildExtractionPrompt', () => {
  it('includes the message batch in the prompt', () => {
    const messages = [
      { author: 'kurt', content: 'draft a tweet about templar', timestamp: '2026-03-19T12:00:00Z' },
    ];
    const prompt = buildExtractionPrompt(messages, loadRegistry());
    expect(prompt).toContain('draft a tweet about templar');
    expect(prompt).toContain('kurt');
  });

  it('includes available repos in the prompt', () => {
    const messages = [{ author: 'test', content: 'test', timestamp: '2026-03-19T12:00:00Z' }];
    const prompt = buildExtractionPrompt(messages, loadRegistry());
    expect(prompt).toContain('covenant-narrative');
    expect(prompt).toContain('barry-music-site');
  });

  it('requests JSON output matching ExtractionResult schema', () => {
    const messages = [{ author: 'test', content: 'test', timestamp: '2026-03-19T12:00:00Z' }];
    const prompt = buildExtractionPrompt(messages, loadRegistry());
    expect(prompt).toContain('"tasks"');
    expect(prompt).toContain('"confidence"');
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run test/extraction/prompt.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement prompt builder**

Create `src/extraction/prompt.ts`:

```typescript
import type { RepoRoute } from '../types.js';

interface ChatMessage {
  author: string;
  content: string;
  timestamp: string;
}

export function buildExtractionPrompt(messages: ChatMessage[], registry: RepoRoute[]): string {
  const repoDescriptions = registry
    .map(r => `- ${r.owner}/${r.repo}: ${r.description} (keywords: ${r.keywords.join(', ')})`)
    .join('\n');

  const messageBlock = messages
    .map(m => `[${m.timestamp}] ${m.author}: ${m.content}`)
    .join('\n');

  return `You are a task extraction agent. Read the following Discord chat messages and extract actionable work tasks. Ignore banter, jokes, memes, and casual conversation.

## Available repositories
${repoDescriptions}

## Chat messages
${messageBlock}

## Instructions
For each actionable task you find, output a JSON object with these fields:
- "title": concise task title
- "body": description of what needs to be done, including any URLs or context from the messages
- "repo": which repository this task belongs to (from the list above, use the repo name only)
- "confidence": 0.0 to 1.0 — how confident you are this is a real actionable task (not banter)
- "urgency": "now" | "today" | "this-week" | "someday"
- "source": { "author": who requested it, "channel": "#comms-chat", "timestamp": when }
- "source_message": the original message text that triggered this task

Return a JSON object with:
- "tasks": array of extracted tasks
- "ignored": brief list of why non-task messages were ignored (e.g., "banter", "memes")

If there are no actionable tasks, return { "tasks": [], "ignored": ["no actionable items"] }.

Return ONLY valid JSON, no markdown fences or other text.`;
}
```

- [ ] **Step 5: Run prompt tests**

Run: `npx vitest run test/extraction/prompt.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 6: Write extractor tests**

Create `test/extraction/extractor.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { extractTasks } from '../../src/extraction/extractor.js';
import type { ExtractionResult } from '../../src/types.js';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: vi.fn(),
      };
    },
  };
});

describe('extractTasks', () => {
  it('parses a valid extraction result', async () => {
    const mockResult: ExtractionResult = {
      tasks: [
        {
          title: 'Amplify Reddit post',
          body: 'Post in general and bittensor channels requesting upvotes',
          repo: 'covenant-narrative',
          confidence: 0.9,
          urgency: 'today',
          source: { author: 'kurtwagner0937', channel: '#comms-chat', timestamp: '2026-03-19T17:52:00Z' },
          source_message: 'can you at everyone in general and the bittensor channels to upvote it',
        },
      ],
      ignored: ['banter'],
    };

    // We test the parsing logic, not the API call
    const { parseExtractionResponse } = await import('../../src/extraction/extractor.js');
    const result = parseExtractionResponse(JSON.stringify(mockResult));
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toBe('Amplify Reddit post');
    expect(result.tasks[0].confidence).toBe(0.9);
  });

  it('handles malformed JSON gracefully', async () => {
    const { parseExtractionResponse } = await import('../../src/extraction/extractor.js');
    const result = parseExtractionResponse('not json at all');
    expect(result.tasks).toHaveLength(0);
    expect(result.ignored).toContain('parse_error');
  });

  it('filters out tasks with missing required fields', async () => {
    const { parseExtractionResponse } = await import('../../src/extraction/extractor.js');
    const result = parseExtractionResponse(JSON.stringify({
      tasks: [
        { title: 'Missing repo', body: 'test', confidence: 0.8 },
        { title: 'Valid', body: 'test', repo: 'covenant-narrative', confidence: 0.8, urgency: 'today', source: { author: 'a', channel: 'b', timestamp: 'c' }, source_message: 'd' },
      ],
      ignored: [],
    }));
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toBe('Valid');
  });
});
```

- [ ] **Step 7: Run to verify failure**

Run: `npx vitest run test/extraction/extractor.test.ts`
Expected: FAIL — module not found

- [ ] **Step 8: Implement extractor**

Create `src/extraction/extractor.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { buildExtractionPrompt } from './prompt.js';
import { loadRegistry } from '../github/registry.js';
import type { ExtractionResult, ExtractedTask } from '../types.js';

const REQUIRED_TASK_FIELDS: (keyof ExtractedTask)[] = [
  'title', 'body', 'repo', 'confidence', 'source_message',
];

export function parseExtractionResponse(text: string): ExtractionResult {
  try {
    // Strip markdown fences if present
    const cleaned = text.replace(/^```json?\n?/m, '').replace(/\n?```$/m, '').trim();
    const parsed = JSON.parse(cleaned);

    const tasks: ExtractedTask[] = (parsed.tasks || []).filter((task: any) =>
      REQUIRED_TASK_FIELDS.every(field => task[field] !== undefined && task[field] !== null)
    );

    return {
      tasks,
      ignored: parsed.ignored || [],
    };
  } catch {
    return { tasks: [], ignored: ['parse_error'] };
  }
}

export async function extractTasks(
  messages: { author: string; content: string; timestamp: string }[],
  apiKey: string,
): Promise<ExtractionResult> {
  const client = new Anthropic({ apiKey });
  const registry = loadRegistry();
  const prompt = buildExtractionPrompt(messages, registry);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('');

  return parseExtractionResponse(text);
}
```

- [ ] **Step 9: Run extractor tests**

Run: `npx vitest run test/extraction/`
Expected: All tests PASS

- [ ] **Step 10: Commit**

```bash
git add src/extraction/ test/extraction/ test/fixtures/
git commit -m "feat: add Claude API task extraction with prompt builder and parser"
```

---

### Task 4: GitHub Issue Creation

**Files:**
- Create: `src/github/issues.ts`
- Create: `test/github/issues.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/github/issues.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { formatIssueBody, buildIssueLabels } from '../../src/github/issues.js';
import type { ExtractedTask } from '../../src/types.js';

const sampleTask: ExtractedTask = {
  title: 'Amplify Reddit post — Chamath/Bittensor/Templar',
  body: 'Post in general and bittensor channels requesting upvotes on reddit link',
  repo: 'covenant-narrative',
  confidence: 0.9,
  urgency: 'today',
  source: {
    author: 'kurtwagner0937',
    channel: '#comms-chat',
    timestamp: '2026-03-19T17:52:00Z',
  },
  source_message: 'can you at everyone in general and the bittensor channels to upvote it',
};

describe('formatIssueBody', () => {
  it('includes source attribution', () => {
    const body = formatIssueBody(sampleTask);
    expect(body).toContain('kurtwagner0937');
    expect(body).toContain('#comms-chat');
  });

  it('includes the action description', () => {
    const body = formatIssueBody(sampleTask);
    expect(body).toContain('Post in general and bittensor channels');
  });

  it('includes original message as quote', () => {
    const body = formatIssueBody(sampleTask);
    expect(body).toContain('> can you at everyone');
  });

  it('includes extraction metadata', () => {
    const body = formatIssueBody(sampleTask);
    expect(body).toContain('0.9');
    expect(body).toContain('Extracted by synapz-agent');
  });
});

describe('buildIssueLabels', () => {
  it('includes ready label for high confidence', () => {
    const labels = buildIssueLabels(sampleTask, 0.7);
    expect(labels).toContain('ready');
  });

  it('includes triage label for low confidence', () => {
    const lowConfTask = { ...sampleTask, confidence: 0.5 };
    const labels = buildIssueLabels(lowConfTask, 0.7);
    expect(labels).toContain('triage');
    expect(labels).not.toContain('ready');
  });

  it('includes urgency label', () => {
    const labels = buildIssueLabels(sampleTask, 0.7);
    expect(labels).toContain('today');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/github/issues.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement issues module**

Create `src/github/issues.ts`:

```typescript
import { Octokit } from '@octokit/rest';
import type { ExtractedTask } from '../types.js';

export function formatIssueBody(task: ExtractedTask): string {
  return `## Action
${task.body}

## Source
- **Requested by:** ${task.source.author}
- **Channel:** ${task.source.channel}
- **Time:** ${task.source.timestamp}

> ${task.source_message}

---
*Extracted by synapz-agent | Confidence: ${task.confidence} | Urgency: ${task.urgency}*`;
}

export function buildIssueLabels(task: ExtractedTask, confidenceThreshold: number): string[] {
  const labels: string[] = [];

  if (task.confidence >= confidenceThreshold) {
    labels.push('ready');
  } else {
    labels.push('triage');
  }

  if (task.urgency && task.urgency !== 'someday') {
    labels.push(task.urgency);
  }

  return labels;
}

export async function createIssue(
  task: ExtractedTask,
  owner: string,
  repo: string,
  labels: string[],
  token: string,
): Promise<{ number: number; url: string }> {
  const octokit = new Octokit({ auth: token });

  const body = formatIssueBody(task);

  const response = await octokit.rest.issues.create({
    owner,
    repo,
    title: task.title,
    body,
    labels,
  });

  return {
    number: response.data.number,
    url: response.data.html_url,
  };
}

export async function ensureLabelsExist(
  owner: string,
  repo: string,
  labelNames: string[],
  token: string,
): Promise<void> {
  const octokit = new Octokit({ auth: token });

  const labelColors: Record<string, string> = {
    'triage': 'fbca04',
    'ready': '0e8a16',
    'in-progress': '1d76db',
    'in-review': 'd93f0b',
    'blocked': 'b60205',
    'false-positive': 'e4e669',
    'now': 'b60205',
    'today': 'd93f0b',
    'this-week': 'fbca04',
  };

  for (const name of labelNames) {
    try {
      await octokit.rest.issues.getLabel({ owner, repo, name });
    } catch {
      await octokit.rest.issues.createLabel({
        owner,
        repo,
        name,
        color: labelColors[name] || 'ededed',
      });
    }
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run test/github/issues.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/github/issues.ts test/github/issues.test.ts
git commit -m "feat: add GitHub issue creation with label management"
```

---

### Task 5: Discord Bot — Client Setup and Channel Monitoring

**Files:**
- Create: `src/bot/client.ts`
- Create: `src/bot/monitor.ts`
- Create: `test/bot/monitor.test.ts`

- [ ] **Step 1: Write failing monitor tests**

Create `test/bot/monitor.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageBatcher } from '../../src/bot/monitor.js';

describe('MessageBatcher', () => {
  let batcher: MessageBatcher;
  let onFlush: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    onFlush = vi.fn();
    batcher = new MessageBatcher(5000, onFlush); // 5 second window for testing
  });

  it('batches messages within the window', () => {
    batcher.add({ author: 'kurt', content: 'do the thing', timestamp: '2026-03-19T12:00:00Z', channelName: '#comms-chat' });
    batcher.add({ author: 'evan', content: 'sure', timestamp: '2026-03-19T12:00:01Z', channelName: '#comms-chat' });

    expect(onFlush).not.toHaveBeenCalled();
  });

  it('flushes after window expires', () => {
    batcher.add({ author: 'kurt', content: 'do the thing', timestamp: '2026-03-19T12:00:00Z', channelName: '#comms-chat' });

    vi.advanceTimersByTime(5001);

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith([
      expect.objectContaining({ author: 'kurt', content: 'do the thing' }),
    ]);
  });

  it('resets timer when new message arrives within window', () => {
    batcher.add({ author: 'kurt', content: 'msg 1', timestamp: '2026-03-19T12:00:00Z', channelName: '#comms-chat' });

    vi.advanceTimersByTime(3000);
    batcher.add({ author: 'kurt', content: 'msg 2', timestamp: '2026-03-19T12:00:03Z', channelName: '#comms-chat' });

    vi.advanceTimersByTime(3000);
    // Should not have flushed yet (timer reset)
    expect(onFlush).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2001);
    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush.mock.calls[0][0]).toHaveLength(2);
  });

  it('does not flush empty batches', () => {
    vi.advanceTimersByTime(10000);
    expect(onFlush).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/bot/monitor.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement message batcher**

Create `src/bot/monitor.ts`:

```typescript
export interface BatchedMessage {
  author: string;
  content: string;
  timestamp: string;
  channelName: string;
}

type FlushCallback = (messages: BatchedMessage[]) => void;

export class MessageBatcher {
  private batch: BatchedMessage[] = [];
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private maxAgeTimer: ReturnType<typeof setTimeout> | null = null;
  private windowMs: number;
  private maxAgeMs: number;
  private onFlush: FlushCallback;

  constructor(windowMs: number, onFlush: FlushCallback, maxAgeMs?: number) {
    this.windowMs = windowMs;
    this.maxAgeMs = maxAgeMs ?? windowMs * 2; // default: 2x idle window
    this.onFlush = onFlush;
  }

  add(message: BatchedMessage): void {
    this.batch.push(message);

    // Reset idle timer on each message
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    this.idleTimer = setTimeout(() => this.flush(), this.windowMs);

    // Start max-age timer on first message in batch
    if (!this.maxAgeTimer) {
      this.maxAgeTimer = setTimeout(() => this.flush(), this.maxAgeMs);
    }
  }

  private flush(): void {
    if (this.batch.length === 0) return;

    const messages = [...this.batch];
    this.batch = [];

    if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; }
    if (this.maxAgeTimer) { clearTimeout(this.maxAgeTimer); this.maxAgeTimer = null; }

    this.onFlush(messages);
  }

  destroy(): void {
    if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; }
    if (this.maxAgeTimer) { clearTimeout(this.maxAgeTimer); this.maxAgeTimer = null; }
  }
}
```

- [ ] **Step 4: Run monitor tests**

Run: `npx vitest run test/bot/monitor.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 5: Implement Discord client**

Create `src/bot/client.ts`:

```typescript
import { Client, GatewayIntentBits, Events, type Message } from 'discord.js';
import { MessageBatcher } from './monitor.js';
import { settings } from '../config/settings.js';

interface BotConfig {
  token: string;
  covenantGuildId: string;
  covenantChannelIds: string[];
  synapzGuildId: string;
  synapzFeedChannelId: string;
  synapzApprovalsChannelId: string;
  synapzCommandsChannelId: string;
}

export function createBot(config: BotConfig, onBatch: (messages: any[]) => void) {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  const batcher = new MessageBatcher(settings.extraction.batch_window_ms, onBatch);

  client.once(Events.ClientReady, (c) => {
    console.log(`Bot logged in as ${c.user.tag}`);
    console.log(`Monitoring channels: ${config.covenantChannelIds.join(', ')}`);
  });

  client.on(Events.MessageCreate, (message: Message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // Covenant server: monitor specified channels
    if (
      message.guildId === config.covenantGuildId &&
      config.covenantChannelIds.includes(message.channelId)
    ) {
      batcher.add({
        author: message.member?.displayName || message.author.username,
        content: message.content,
        timestamp: message.createdAt.toISOString(),
        channelName: `#${(message.channel as any).name || 'unknown'}`,
      });
    }
  });

  async function start() {
    await client.login(config.token);
  }

  async function stop() {
    batcher.destroy();
    await client.destroy();
  }

  function getClient() {
    return client;
  }

  return { start, stop, getClient };
}
```

- [ ] **Step 6: Commit**

```bash
git add src/bot/client.ts src/bot/monitor.ts test/bot/monitor.test.ts
git commit -m "feat: add Discord bot client with message batching"
```

---

### Task 6: Digest and Notification Posting

**Files:**
- Create: `src/bot/digest.ts`
- Create: `test/bot/digest.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/bot/digest.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { formatDigest, type DigestEntry } from '../../src/bot/digest.js';

describe('formatDigest', () => {
  it('formats entries with status indicators', () => {
    const entries: DigestEntry[] = [
      { type: 'pr_opened', repo: 'covenant-narrative', detail: 'PR #12 — "Thread: Chamath on All-In"' },
      { type: 'issue_created', repo: 'covenant-narrative', detail: 'Issue #34 needs triage — "Evan\'s autoresearch article"' },
    ];

    const digest = formatDigest(entries, new Date('2026-03-21T14:00:00Z'));
    expect(digest).toContain('Agent Digest');
    expect(digest).toContain('2026-03-21');
    expect(digest).toContain('[v] covenant-narrative');
    expect(digest).toContain('[?] covenant-narrative');
  });

  it('returns empty message when no entries', () => {
    const digest = formatDigest([], new Date('2026-03-21T14:00:00Z'));
    expect(digest).toContain('No activity');
  });

  it('includes worker status summary', () => {
    const entries: DigestEntry[] = [
      { type: 'worker_status', repo: 'crunchdao-synth', detail: 'running' },
    ];

    const digest = formatDigest(entries, new Date('2026-03-21T14:00:00Z'), { active: 1, max: 3 });
    expect(digest).toContain('Workers: 1/3');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/bot/digest.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement digest formatter**

Create `src/bot/digest.ts`:

```typescript
import type { TextChannel } from 'discord.js';

export interface DigestEntry {
  type: 'pr_opened' | 'pr_merged' | 'issue_created' | 'issue_closed' | 'worker_status' | 'error';
  repo: string;
  detail: string;
}

interface WorkerSummary {
  active: number;
  max: number;
}

const TYPE_INDICATORS: Record<DigestEntry['type'], string> = {
  pr_opened: '[v]',
  pr_merged: '[v]',
  issue_created: '[?]',
  issue_closed: '[v]',
  worker_status: '  ',
  error: '[!]',
};

export function formatDigest(
  entries: DigestEntry[],
  timestamp: Date,
  workers?: WorkerSummary,
): string {
  const dateStr = timestamp.toISOString().split('T')[0];
  const timeStr = timestamp.toISOString().split('T')[1].slice(0, 5);

  if (entries.length === 0) {
    return `Agent Digest -- ${dateStr} ${timeStr}\n----\nNo activity since last digest.`;
  }

  const lines = entries
    .filter(e => e.type !== 'worker_status')
    .map(e => `${TYPE_INDICATORS[e.type]} ${e.repo}: ${e.detail}`);

  let result = `Agent Digest -- ${dateStr} ${timeStr}\n----\n${lines.join('\n')}`;

  if (workers) {
    result += `\nWorkers: ${workers.active}/${workers.max} slots active`;
  }

  return result;
}

export class DigestCollector {
  private entries: DigestEntry[] = [];

  add(entry: DigestEntry): void {
    this.entries.push(entry);
  }

  flush(timestamp: Date, workers?: WorkerSummary): string {
    const digest = formatDigest(this.entries, timestamp, workers);
    this.entries = [];
    return digest;
  }

  get pending(): number {
    return this.entries.length;
  }
}

export async function postToChannel(channel: TextChannel, content: string): Promise<void> {
  // Discord has a 2000 character limit per message
  if (content.length <= 2000) {
    await channel.send(content);
  } else {
    // Split at line boundaries
    const lines = content.split('\n');
    let chunk = '';
    for (const line of lines) {
      if (chunk.length + line.length + 1 > 1990) {
        await channel.send(chunk);
        chunk = line;
      } else {
        chunk += (chunk ? '\n' : '') + line;
      }
    }
    if (chunk) {
      await channel.send(chunk);
    }
  }
}
```

- [ ] **Step 4: Run digest tests**

Run: `npx vitest run test/bot/digest.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/bot/digest.ts test/bot/digest.test.ts
git commit -m "feat: add digest formatting and notification posting"
```

---

### Task 7: Command Handling (synapz_org)

**Files:**
- Create: `src/bot/commands.ts`
- Create: `test/bot/commands.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/bot/commands.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseCommand } from '../../src/bot/commands.js';

describe('parseCommand', () => {
  it('parses status command', () => {
    const cmd = parseCommand('status');
    expect(cmd).toEqual({ type: 'status', repo: undefined });
  });

  it('parses status with repo', () => {
    const cmd = parseCommand('status covenant-narrative');
    expect(cmd).toEqual({ type: 'status', repo: 'covenant-narrative' });
  });

  it('parses task creation', () => {
    const cmd = parseCommand('task covenant-narrative: Draft a thread about the Chamath mention');
    expect(cmd).toEqual({
      type: 'task',
      repo: 'covenant-narrative',
      description: 'Draft a thread about the Chamath mention',
    });
  });

  it('parses approve command', () => {
    const cmd = parseCommand('approve PR covenant-narrative#47');
    expect(cmd).toEqual({ type: 'approve', repo: 'covenant-narrative', number: 47 });
  });

  it('parses reject command', () => {
    const cmd = parseCommand('reject PR covenant-narrative#47 needs more context');
    expect(cmd).toEqual({ type: 'reject', repo: 'covenant-narrative', number: 47, reason: 'needs more context' });
  });

  it('parses pause command', () => {
    const cmd = parseCommand('pause covenant-content');
    expect(cmd).toEqual({ type: 'pause', worker: 'covenant-content' });
  });

  it('parses resume command', () => {
    const cmd = parseCommand('resume covenant-content');
    expect(cmd).toEqual({ type: 'resume', worker: 'covenant-content' });
  });

  it('returns null for unknown commands', () => {
    const cmd = parseCommand('hello there');
    expect(cmd).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/bot/commands.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement command parser**

Create `src/bot/commands.ts`:

```typescript
export type Command =
  | { type: 'status'; repo?: string }
  | { type: 'task'; repo: string; description: string }
  | { type: 'approve'; repo: string; number: number }
  | { type: 'reject'; repo: string; number: number; reason: string }
  | { type: 'pause'; worker: string }
  | { type: 'resume'; worker: string };

export function parseCommand(text: string): Command | null {
  const trimmed = text.trim();

  // status [repo]
  if (trimmed === 'status') {
    return { type: 'status', repo: undefined };
  }
  const statusMatch = trimmed.match(/^status\s+(\S+)$/);
  if (statusMatch) {
    return { type: 'status', repo: statusMatch[1] };
  }

  // task repo: description
  const taskMatch = trimmed.match(/^task\s+(\S+):\s*(.+)$/);
  if (taskMatch) {
    return { type: 'task', repo: taskMatch[1], description: taskMatch[2] };
  }

  // approve PR repo#number
  const approveMatch = trimmed.match(/^approve\s+PR\s+(\S+)#(\d+)$/);
  if (approveMatch) {
    return { type: 'approve', repo: approveMatch[1], number: parseInt(approveMatch[2], 10) };
  }

  // reject PR repo#number reason
  const rejectMatch = trimmed.match(/^reject\s+PR\s+(\S+)#(\d+)\s+(.+)$/);
  if (rejectMatch) {
    return { type: 'reject', repo: rejectMatch[1], number: parseInt(rejectMatch[2], 10), reason: rejectMatch[3] };
  }

  // pause worker
  const pauseMatch = trimmed.match(/^pause\s+(\S+)$/);
  if (pauseMatch) {
    return { type: 'pause', worker: pauseMatch[1] };
  }

  // resume worker
  const resumeMatch = trimmed.match(/^resume\s+(\S+)$/);
  if (resumeMatch) {
    return { type: 'resume', worker: resumeMatch[1] };
  }

  return null;
}
```

- [ ] **Step 4: Run command tests**

Run: `npx vitest run test/bot/commands.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/bot/commands.ts test/bot/commands.test.ts
git commit -m "feat: add command parser for synapz_org Discord"
```

---

### Task 8: Feedback Logger

**Files:**
- Create: `src/github/feedback.ts`
- Create: `data/.gitkeep`
- Create: `test/github/feedback.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/github/feedback.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { logFalsePositive, readFeedbackLog } from '../../src/github/feedback.js';
import { mkdtempSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('feedback logger', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'feedback-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true });
  });

  it('appends a JSONL entry', () => {
    const logPath = join(tempDir, 'feedback.jsonl');
    logFalsePositive(logPath, {
      source_message: 'please remove him from this discord',
      issue_url: 'https://github.com/snarktank/covenant-narrative/issues/5',
      timestamp: '2026-03-21T12:00:00Z',
    });

    const content = readFileSync(logPath, 'utf-8');
    const entry = JSON.parse(content.trim());
    expect(entry.source_message).toBe('please remove him from this discord');
    expect(entry.issue_url).toContain('issues/5');
  });

  it('appends multiple entries', () => {
    const logPath = join(tempDir, 'feedback.jsonl');
    logFalsePositive(logPath, { source_message: 'a', issue_url: 'u1', timestamp: 't1' });
    logFalsePositive(logPath, { source_message: 'b', issue_url: 'u2', timestamp: 't2' });

    const entries = readFeedbackLog(logPath);
    expect(entries).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/github/feedback.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement feedback logger**

Create `src/github/feedback.ts`:

```typescript
import { appendFileSync, readFileSync, existsSync } from 'fs';

export interface FeedbackEntry {
  source_message: string;
  issue_url: string;
  timestamp: string;
}

export function logFalsePositive(logPath: string, entry: FeedbackEntry): void {
  const line = JSON.stringify(entry) + '\n';
  appendFileSync(logPath, line, 'utf-8');
}

export function readFeedbackLog(logPath: string): FeedbackEntry[] {
  if (!existsSync(logPath)) return [];

  return readFileSync(logPath, 'utf-8')
    .trim()
    .split('\n')
    .filter(line => line.length > 0)
    .map(line => JSON.parse(line));
}
```

- [ ] **Step 4: Create data directory**

```bash
mkdir -p data
touch data/.gitkeep
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run test/github/feedback.test.ts`
Expected: All 2 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/github/feedback.ts test/github/feedback.test.ts data/.gitkeep
git commit -m "feat: add false-positive feedback logger (JSONL)"
```

---

### Task 9: Wire Everything Together in index.ts

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Update index.ts to wire all modules**

Replace `src/index.ts` with:

```typescript
import 'dotenv/config';
import { createBot } from './bot/client.js';
import { extractTasks } from './extraction/extractor.js';
import { loadRegistry } from './github/registry.js';
import { createIssue, buildIssueLabels, ensureLabelsExist } from './github/issues.js';
import { DigestCollector, postToChannel } from './bot/digest.js';
import { parseCommand } from './bot/commands.js';
import { settings } from './config/settings.js';
import type { TextChannel, Message } from 'discord.js';
import { Cron } from 'croner';

async function main() {
  console.log('synapz-agent orchestrator starting...');

  const requiredEnv = [
    'DISCORD_BOT_TOKEN',
    'ANTHROPIC_API_KEY',
    'GITHUB_TOKEN',
    'COVENANT_GUILD_ID',
    'COVENANT_CHANNEL_IDS',
    'SYNAPZ_GUILD_ID',
    'SYNAPZ_FEED_CHANNEL_ID',
  ];

  for (const key of requiredEnv) {
    if (!process.env[key]) {
      console.error(`Missing required env var: ${key}`);
      process.exit(1);
    }
  }

  const registry = loadRegistry();
  const digest = new DigestCollector();

  // Ensure labels exist on all repos
  for (const route of registry) {
    try {
      await ensureLabelsExist(
        route.owner,
        route.repo,
        ['triage', 'ready', 'in-progress', 'in-review', 'false-positive', 'now', 'today', 'this-week'],
        process.env.GITHUB_TOKEN!,
      );
      console.log(`Labels verified on ${route.owner}/${route.repo}`);
    } catch (err) {
      console.warn(`Could not verify labels on ${route.owner}/${route.repo}:`, err);
    }
  }

  // Handle extracted batches
  async function handleBatch(messages: { author: string; content: string; timestamp: string; channelName: string }[]) {
    console.log(`Processing batch of ${messages.length} messages...`);

    try {
      const result = await extractTasks(messages, process.env.ANTHROPIC_API_KEY!);

      console.log(`Extracted ${result.tasks.length} tasks, ignored: ${result.ignored.join(', ')}`);

      const tasksToProcess = result.tasks.slice(0, settings.extraction.max_issues_per_batch);
      if (result.tasks.length > settings.extraction.max_issues_per_batch) {
        console.warn(`Capped issue creation: ${result.tasks.length} extracted, processing ${settings.extraction.max_issues_per_batch}`);
      }

      for (const task of tasksToProcess) {
        const route = registry.find(r => r.repo === task.repo);
        if (!route) {
          console.warn(`No route found for repo: ${task.repo}`);
          continue;
        }

        const labels = buildIssueLabels(task, settings.extraction.confidence_threshold);

        try {
          const issue = await createIssue(task, route.owner, route.repo, labels, process.env.GITHUB_TOKEN!);
          console.log(`Created issue #${issue.number} on ${route.owner}/${route.repo}: ${task.title}`);

          digest.add({
            type: 'issue_created',
            repo: route.repo,
            detail: `Issue #${issue.number} — "${task.title}"`,
          });
        } catch (err) {
          console.error(`Failed to create issue on ${route.owner}/${route.repo}:`, err);
          digest.add({
            type: 'error',
            repo: route.repo,
            detail: `Failed to create issue: ${task.title}`,
          });
        }
      }
    } catch (err) {
      console.error('Extraction failed:', err);
    }
  }

  // Create and start bot
  const bot = createBot(
    {
      token: process.env.DISCORD_BOT_TOKEN!,
      covenantGuildId: process.env.COVENANT_GUILD_ID!,
      covenantChannelIds: process.env.COVENANT_CHANNEL_IDS!.split(',').map(s => s.trim()),
      synapzGuildId: process.env.SYNAPZ_GUILD_ID!,
      synapzFeedChannelId: process.env.SYNAPZ_FEED_CHANNEL_ID!,
      synapzApprovalsChannelId: process.env.SYNAPZ_APPROVALS_CHANNEL_ID || '',
      synapzCommandsChannelId: process.env.SYNAPZ_COMMANDS_CHANNEL_ID || '',
    },
    handleBatch,
  );

  // Handle commands on synapz_org
  const client = bot.getClient();
  client.on('messageCreate', async (message: Message) => {
    if (message.author.bot) return;
    if (message.guildId !== process.env.SYNAPZ_GUILD_ID) return;

    // Only respond in commands channel if configured
    if (process.env.SYNAPZ_COMMANDS_CHANNEL_ID && message.channelId !== process.env.SYNAPZ_COMMANDS_CHANNEL_ID) return;

    const command = parseCommand(message.content);
    if (!command) return;

    switch (command.type) {
      case 'status':
        await message.reply('Status check: orchestrator running. (Full status coming in Phase 2)');
        break;
      case 'task': {
        const route = registry.find(r => r.repo === command.repo);
        if (!route) {
          await message.reply(`Unknown repo: ${command.repo}`);
          break;
        }
        try {
          const issue = await createIssue(
            {
              title: command.description,
              body: command.description,
              repo: command.repo,
              confidence: 1.0,
              urgency: 'today',
              source: { author: message.author.username, channel: '#commands', timestamp: new Date().toISOString() },
              source_message: message.content,
            },
            route.owner,
            route.repo,
            ['ready'],
            process.env.GITHUB_TOKEN!,
          );
          await message.reply(`Created issue #${issue.number} on ${route.owner}/${route.repo}: ${issue.url}`);
        } catch (err) {
          await message.reply(`Failed to create issue: ${err}`);
        }
        break;
      }
      default:
        await message.reply(`Command "${command.type}" will be available in Phase 2.`);
    }
  });

  // Digest posting schedule (every 2 hours)
  new Cron('0 */2 * * *', async () => {
    if (digest.pending === 0) return;

    const feedChannel = client.channels.cache.get(process.env.SYNAPZ_FEED_CHANNEL_ID!) as TextChannel | undefined;
    if (!feedChannel) {
      console.warn('Feed channel not found');
      return;
    }

    const content = digest.flush(new Date(), { active: 0, max: settings.concurrency.max_concurrent_workers });
    await postToChannel(feedChannel, content);
    console.log('Digest posted.');
  });

  await bot.start();
  console.log('Orchestrator running.');

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await bot.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    await bot.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Compiles with no errors.

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: All tests pass (registry, extraction, issues, monitor, digest, commands, feedback).

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: wire all modules into orchestrator entry point"
```

---

### Task 10: Discord Bot Setup and Live Test

**Files:**
- Create: `.env` (local only, gitignored)
- Create: `com.synapz.orchestrator.plist` (launchd config)

- [ ] **Step 1: Create Discord Application and Bot**

Go to https://discord.com/developers/applications
1. Create application "synapz-agent"
2. Go to Bot tab, create bot
3. Enable MESSAGE CONTENT INTENT (required for reading message content)
4. Enable SERVER MEMBERS INTENT
5. Copy the bot token

- [ ] **Step 2: Generate OAuth2 invite URL**

In the application's OAuth2 tab:
- Scopes: `bot`
- Permissions: `Read Messages/View Channels`, `Send Messages`, `Read Message History`
- Use the generated URL to add bot to both servers:
  1. Covenant server
  2. synapz_org server

- [ ] **Step 3: Get Discord IDs**

In Discord, enable Developer Mode (Settings > Advanced > Developer Mode).
Right-click to copy IDs for:
- Covenant server (guild ID)
- Each channel to monitor (channel IDs)
- synapz_org server (guild ID)
- `#agent-feed` channel ID
- `#approvals` channel ID (create if needed)
- `#commands` channel ID (create if needed)

- [ ] **Step 4: Create .env file**

```bash
cp .env.example .env
```

Fill in all values from steps 1-3, plus ANTHROPIC_API_KEY and GITHUB_TOKEN.

- [ ] **Step 5: Create synapz_org channels**

In your synapz_org Discord server, create:
- `#agent-feed` — for digest notifications
- `#approvals` — for PR review notifications
- `#commands` — for sending commands to the bot

- [ ] **Step 6: Test bot startup**

Run: `npm start`

Expected:
```
synapz-agent orchestrator starting...
Labels verified on snarktank/covenant-narrative
Labels verified on dwbarnes/barry-music-site
Labels verified on dwbarnes/crunchdao-synth
Bot logged in as synapz-agent#XXXX
Monitoring channels: <channel-ids>
Orchestrator running.
```

- [ ] **Step 7: Test extraction with a real message**

Post a test message in a monitored Covenant channel (or have someone post one).
Wait 5 minutes for the batch window.

Expected: Console shows extraction results and issue creation.
Check GitHub to confirm the issue was created with correct labels and body.

- [ ] **Step 8: Test command interface**

In synapz_org `#commands`, type: `status`
Expected: Bot replies with status message.

Type: `task covenant-narrative: Test issue from Discord bot`
Expected: Bot creates issue and replies with link.

- [ ] **Step 9: Create launchd plist**

Create `com.synapz.orchestrator.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.synapz.orchestrator</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/dwbarnes/.nvm/versions/node/v22.22.1/bin/npx</string>
        <string>tsx</string>
        <string>/Users/dwbarnes/Projects/synapz-agent/src/index.ts</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/dwbarnes/Projects/synapz-agent</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/Users/dwbarnes/.nvm/versions/node/v22.22.1/bin:/usr/local/bin:/usr/bin:/bin</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/dwbarnes/Projects/synapz-agent/logs/orchestrator.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/dwbarnes/Projects/synapz-agent/logs/orchestrator-error.log</string>
</dict>
</plist>
```

- [ ] **Step 10: Install and start launchd service**

**Important:** The `.env` file must exist at `/Users/dwbarnes/Projects/synapz-agent/.env` before starting the service. The `dotenv/config` import in `index.ts` reads it at startup. Launchd does not inherit shell environment variables.

```bash
mkdir -p ~/Projects/synapz-agent/logs
touch ~/Projects/synapz-agent/logs/.gitkeep
cp com.synapz.orchestrator.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.synapz.orchestrator.plist
```

Verify: `launchctl list | grep synapz`
Expected: Shows the service running.

Check logs: `tail -f ~/Projects/synapz-agent/logs/orchestrator.log`
Expected: Orchestrator startup messages.

- [ ] **Step 11: Commit**

```bash
git add com.synapz.orchestrator.plist
git commit -m "feat: add launchd plist for persistent orchestrator service"
```

---

### Task 11: Cleanup and Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 2: Verify end-to-end flow**

1. Post a message with an actionable task in monitored Covenant channel
2. Wait for batch window (5 min)
3. Verify issue appears on covenant-narrative
4. Check synapz_org `#agent-feed` for next digest
5. Try `status` command in `#commands`
6. Try `task covenant-narrative: Manual test task` in `#commands`

- [ ] **Step 3: Delete AGENT.md from covenant-narrative**

```bash
cd ~/Projects/covenant-narrative
git rm AGENT.md
git commit -m "chore: remove superseded AGENT.md (AGENTS.md is the entry point)"
```

- [ ] **Step 4: Final commit on synapz-agent**

```bash
cd ~/Projects/synapz-agent
git status  # review carefully before adding
git add src/ test/ workers/ data/ package.json tsconfig.json .env.example com.synapz.orchestrator.plist logs/.gitkeep
git commit -m "feat: complete Phase 1 — Discord bot foundation for agent economy

Discord bot monitors Covenant server channels, extracts actionable
tasks via Claude API, creates GitHub issues on project repos, and
posts digests to synapz_org. Commands available for status and
manual task creation."
```

---

## Post-Phase 1 Notes

Phase 1 is complete when:
- Bot is running via launchd
- Covenant channel messages are being monitored
- Tasks are extracted and routed to covenant-narrative as issues
- Digests appear in synapz_org #agent-feed
- Derek can create tasks and check status from Discord

**Next:** Phase 2 (First Worker) — add the `claude-cli` adapter and cron-triggered CC sessions that pick up `ready` issues and open PRs. See spec rollout plan for details.
