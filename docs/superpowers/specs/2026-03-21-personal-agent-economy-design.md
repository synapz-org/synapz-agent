# Personal Agent Economy — Design Spec

> Date: 2026-03-21
> Status: Draft
> Author: Derek Barnes + Claude

## Problem

Derek works across multiple projects (Covenant marketing, Bittensor mining, client work, agent infrastructure, personal goals). Work arrives through noisy Discord channels as implicit tasks buried in casual conversation. The current agent setup (Synapz on OpenClaw/Telegram) is slow and not delivering useful output. Claude Code on the laptop is where real work happens, but nothing runs autonomously when Derek steps away.

The goal: a system where multiple agents advance multiple projects as autonomously as possible, with Derek providing macro-actions and reviewing output rather than doing the work directly.

## Inspiration

Andrej Karpathy's model: remove yourself as the bottleneck, maximize token throughput, arrange things so agents run without you. Peter Steinberg's model: multiple agent sessions across multiple repos, 20-minute macro-actions, review and redirect. Dobby: one chat interface to a persistent autonomous agent.

## Principles

1. **Work lives where it belongs.** Tasks go to the repo they affect. No centralized task database.
2. **GitHub is the source of truth.** Issues are tasks. PRs are deliverables. Labels are status.
3. **Agent-agnostic.** The orchestrator dispatches to whatever agent is best for the job. Swapping agents is a config change.
4. **Claude Code for creation, Discord for consumption.** CC sessions do the heavy lifting. Discord is the lightweight review and notification layer.
5. **Each repo has its own rhythm.** Auto-research runs hot. Client sites are reactive. Campaigns have weekly cycles. The orchestrator knows these rhythms.
6. **Onion layers.** Each phase delivers standalone value. No big bang.

## Architecture

```
              YOU (Derek)
  Laptop: Claude Code + SuperWhisper
  Mobile: Discord (synapz_org) + CC Remote
              |
    +---------+-----------+
    |                     |
  Direct work       Review / approve
    |                     |
    v                     v
+-----------+    +------------------+
| Claude    |    | Discord Bot      |
| Code      |    | (synapz-agent)   |
| Sessions  |    |                  |
| (manual)  |    | Covenant server: |
|           |    |   channel monitor|
|           |    |   task extraction|
|           |    |                  |
|           |    | synapz_org:      |
|           |    |   approvals      |
|           |    |   status/digest  |
|           |    |   quick commands |
+-----------+    +--------+---------+
                          |
                   dispatch(config)
                          |
            +-------+-------+-------+-------+
            v       v       v       v       v
         claude  codex  claude  openclaw  future
         -cli    -cli   -api    (etc)     agents
            |       |       |       |
            v       v       v       v
         project repos (each with own rhythm)
```

### Three Layers

**1. Discord Bot (intake + interface)**

Runs in two servers with different roles:

- **Covenant server** — Read-only listener. Monitors designated channels (e.g., #comms-chat). Extracts actionable tasks using Claude API. Creates GitHub issues on `covenant-narrative` with proper labels and context. Does not post back to team channels.
- **synapz_org server** — Derek's command center. Receives notification digests, supports status queries, approval workflows (react to approve/reject), and quick task creation for any repo.

**2. Orchestrator (scheduling + dispatch)**

Lives in `synapz-agent`. Responsibilities:

- Maintains a worker registry (YAML configs per worker)
- Triggers workers on schedule (cron/launchd) or event (new issue labeled `ready`)
- Monitors worker health (stalled runs, errors, duration)
- Aggregates notifications into digests (every 2 hours by default)
- Prevents duplicate runs (don't start a worker if previous run is still going)
- Escalates stuck work (if a worker fails 3 cycles, alert Derek)

**3. Workers (execution)**

Each worker is a config file that maps to an agent session:

```yaml
# workers/covenant-content.yaml
name: covenant-content
repo: ~/Projects/covenant-narrative
schedule: "0 */4 * * *"
agent:
  type: claude-cli
  prompt_file: .claude/prompts/work-cycle.md
  max_turns: 50
  allowed_tools: ["Edit", "Write", "Bash", "Grep", "Glob", "Read"]
triggers:
  - github_issue_labeled: ready
notifications:
  channel: synapz_org#agent-feed
```

## Runtime Model

The orchestrator is a single Node.js process that contains both the Discord bot and the scheduling/dispatch logic. It runs persistently on Derek's Mac via launchd (with restart-on-failure). Later, it can move to a VPS for always-on availability independent of the laptop.

**Process architecture:**

```
synapz-agent (single Node.js process)
  |- Discord bot (discord.js, always connected)
  |- Scheduler (node-cron, triggers workers on schedule)
  |- Dispatcher (spawns claude/codex CLI as child processes)
  |- Health monitor (tracks running workers, timeouts, failures)
  |- Notifier (posts digests to synapz_org Discord)
```

**Lifecycle:**
- Managed by a launchd plist (`com.synapz.orchestrator.plist`)
- Restarts automatically on crash or Mac reboot
- On Mac sleep: running workers continue if the session is alive; scheduler catches up on missed jobs on wake (does not retroactively run all missed schedules — just runs the next one)
- Logs to `~/Projects/synapz-agent/logs/orchestrator.log`

**Prerequisites:**
- `gh auth login` completed (GitHub CLI authenticated)
- SSH keys configured for git push to all project repos
- `ANTHROPIC_API_KEY` set in launchd environment (for Claude API calls in the bot)
- `claude` CLI installed and authenticated (for worker sessions)
- Discord bot token in environment (`DISCORD_BOT_TOKEN`)

## Concurrency Model

Workers are spawned as child processes. The orchestrator enforces concurrency limits.

**Constraints:**
- `max_concurrent_workers`: 3 (configurable, conservative default to stay within CC subscription limits)
- Each worker occupies one slot from dispatch until completion/timeout
- Workers have a `max_duration` (default: 30 min for regular workers, 4 hours for auto-research)
- If all slots are full, new jobs enter a priority queue

**Priority ordering** (highest first):
1. Event-triggered (new issue labeled `ready`) — someone is waiting
2. Reactive workers (barry-music-site) — client-facing
3. Scheduled workers (covenant-narrative) — can wait for the next cycle
4. Continuous loops (crunchdao-synth) — runs whenever a slot is free

**What "continuous" means for auto-research:**
Not a single never-ending session. The auto-research wrapper runs a CC session with a bounded number of turns (e.g., 50). When it finishes, it checks results, logs them, and immediately dispatches the next session if a slot is available. This gives the orchestrator natural breakpoints to schedule other work between iterations.

## Agent-Agnostic Adapter Interface

Workers don't call agents directly. They call through an adapter with three functions:

```
dispatch(worker_config) -> result
  Start the agent with the given prompt in the given repo.
  Returns: success/failure, PRs opened, issues updated, summary.

health(worker_config) -> status
  Is the agent running? Did it error? Duration?

cancel(worker_config)
  Stop a running agent.
```

Supported agent types (initially):

| Type | When to use | How it runs |
|------|-------------|-------------|
| `claude-cli` | Code work, complex tasks, anything needing git/shell | `claude -p "..." --cwd /repo` |
| `claude-api` | Lightweight triage, extraction, classification | Direct API call with system prompt |
| `codex-cli` | Alternative to claude-cli, rate limit fallback | `codex -p "..." --cwd /repo` |
| `openclaw` | Always-on persistent agents (if/when useful) | HTTP request to deployed instance |

New types (Hermes, future frameworks) are added by writing a new adapter module conforming to the three-function interface.

### Worker Result Contract

The orchestrator needs structured results from each worker run. Since `claude` CLI does not natively return structured JSON, the adapter uses a **diff-based approach**:

1. Before dispatch: snapshot the repo state (open issues, open PRs, current branch via `gh` CLI)
2. Run the agent session
3. After completion: diff the repo state against the snapshot
4. Build a result object: `{ success, prs_opened[], issues_updated[], branches_created[], exit_reason }`

Additionally, the work-cycle prompt instructs the agent to write a brief summary to `.claude/last-run-summary.md` before exiting. The adapter reads this file for a human-readable description of what was done. This is optional — if the agent fails or forgets, the diff-based result still works.

## Task Model: GitHub Issues + PRs

No centralized task database. Each repo manages its own work.

**Issues are tasks.** Created by:
- Discord bot (extracted from team chat)
- Derek (manually or via Discord command)
- Other agents (e.g., portfolio scan creates cleanup issues)
- Teammates directly (Barry files issues on barry-music-site)

**Labels for workflow:**

| Label | Meaning |
|-------|---------|
| `triage` | Needs human decision before work begins |
| `ready` | Cleared for agent work |
| `in-progress` | Agent is working on it |
| `in-review` | PR open, awaiting Derek's review |
| `blocked` | Waiting on external dependency |

**PRs are deliverables.** Workers open PRs that reference their source issue. Derek reviews and merges. Merge closes the issue.

**Example flow:**

```
Kurt in #comms-chat: "can you at everyone in general
  and the bittensor channels to upvote the reddit post"

  -> Bot extracts task, creates issue on covenant-narrative:
     Title: Amplify Reddit post — Chamath/Bittensor/Templar
     Labels: content, ready
     Body:
       Source: #comms-chat, Kurt, 2026-03-19 5:52 PM
       Action: Post in general and bittensor channels
         requesting upvotes on [reddit link]
       Context: LinkedIn already scheduled, Reddit posted

  -> Content worker picks it up on next cycle
  -> Opens PR with drafted messages
  -> Bot notifies Derek on synapz_org
  -> Derek approves from phone
  -> Worker posts
```

## Repo Network — Rhythms and Behaviors

| Repo | Agent behavior | Cadence | Agent type |
|------|---------------|---------|------------|
| `synapz-agent` | Orchestrator. Runs bot, dispatches workers, monitors health. | Always on | N/A (it IS the orchestrator) |
| `covenant-narrative` | Campaign lifecycle. Draft content from Discord intake. Friday archival/cleanup of stale campaigns. | Every 4 hours + Friday deep sweep | `claude-cli` |
| `barry-music-site` | Reactive. Watch for new issues, implement, open PRs. | Every 30 min | `claude-cli` |
| `crunchdao-synth` | Auto-research. Continuously iterate on model score. | Near-continuous (loop) | `claude-cli` or `codex-cli` |
| Miner repos | Monitor performance, try improvements, alert on degradation. | Every 6 hours | `claude-cli` |
| `~/Projects/*` (all) | Portfolio scan. What's stale? What's dead? What needs a push? | Weekly (Sunday evening) | `claude-cli` |

Each repo contains:
- **`AGENTS.md` or `CLAUDE.md`** — Project-specific agent instructions and context
- **`.claude/prompts/work-cycle.md`** — The work-cycle prompt (Karpathy's `program.md`)
- **Defined labels** — At minimum: `triage`, `ready`, `in-progress`, `in-review`

### Example Work-Cycle Prompt

`covenant-narrative/.claude/prompts/work-cycle.md`:

```markdown
You are a content worker for Covenant AI's marketing repo.

## On each run

1. Check for open issues labeled `ready` using `gh issue list --label ready`.
2. Pick the highest-priority issue (by label: `urgent` > `high` > unlabeled).
3. Read the issue body for context, source, and action required.
4. Create a feature branch: `agent/issue-{number}-{slug}`
5. Do the work:
   - For content tasks: draft in the appropriate directory (campaigns/, posts/, threads/)
   - Follow AGENTS.md brand voice and style guidelines
   - Reference source material linked in the issue
6. Commit your work with a message referencing the issue: "Draft: {title} (closes #{number})"
7. Open a PR with:
   - Title matching the issue title
   - Body containing: what was done, source issue link, anything needing human judgment
8. Update the issue label from `ready` to `in-review`.
9. If today is Friday: also scan campaigns/ for directories with no commits in 14+ days.
   Open issues labeled `triage` for each stale campaign suggesting archive or revival.

## Constraints
- Maximum 3 issues per run
- Do not merge your own PRs
- Do not push to main
- If an issue is ambiguous, label it `triage` and move on
- Write a brief summary to .claude/last-run-summary.md before exiting
```

## Discord Bot Detail

**Tech stack:**
- `discord.js` (Node.js)
- Claude API (`@anthropic-ai/sdk`) for task extraction and routing
- `octokit` for GitHub issue/PR operations
- Runs on Derek's Mac via launchd (or a cheap VPS later)

**Project registry** — bot knows which repos exist and what work goes where:

```json
{
  "routes": [
    {
      "repo": "covenant-narrative",
      "owner": "snarktank",
      "keywords": ["content", "article", "tweet", "thread", "post",
                    "templar", "basilica", "grail", "covenant",
                    "reddit", "linkedin", "campaign"],
      "description": "Covenant AI marketing content and campaigns"
    },
    {
      "repo": "barry-music-site",
      "owner": "dwbarnes",
      "keywords": ["barry", "music", "website", "site", "tour"],
      "description": "Barry's music website"
    },
    {
      "repo": "crunchdao-synth",
      "owner": "dwbarnes",
      "keywords": ["crunchdao", "model", "score", "competition", "synth"],
      "description": "CrunchDAO competition model optimization"
    }
  ]
}
```

Keywords and descriptions are included in the Claude extraction prompt as context. Claude makes the final routing decision based on the full message content — keywords do not override the model's judgment.

**Covenant server behavior:**
- Monitors specified channels only
- Batches messages in configurable windows (default 5 min — short enough for responsiveness, long enough to capture full conversation threads; tunable based on channel activity)
- Sends batch to Claude API for task extraction
- High-confidence tasks: creates issue on covenant-narrative directly
- Ambiguous tasks: posts to synapz_org for Derek's confirmation
- Does not post in Covenant channels unless explicitly configured

**synapz_org server behavior:**
- `#agent-feed` — Notification digests, worker status updates
- `#approvals` — PRs awaiting review, react to approve/reject
- `#commands` — Quick task creation, status queries

**Commands (synapz_org):**

| Command | Action |
|---------|--------|
| `status` | Summary: open PRs, active workers, recent completions |
| `status [repo]` | Detailed status for one project |
| `approve PR [repo]#[number]` | Merge a PR |
| `reject PR [repo]#[number] [reason]` | Close PR with comment |
| `task [repo]: [description]` | Create a `ready` issue on the specified repo |
| `pause [worker]` | Temporarily stop a worker |
| `resume [worker]` | Restart a paused worker |

## Mobile Experience

Two options depending on context:

**Discord (synapz_org app)** — Quick interactions:
- Check digest notifications
- Approve/reject PRs with reactions or commands
- Drop quick tasks
- Check status

**Claude Code Remote** — Deeper work:
- Complex multi-step instructions
- Review code in detail
- Research sessions
- Voice via SuperWhisper (when at laptop) or dictation (mobile)

The treadmill-mode concept applies: when on mobile, interactions should be short, decision-oriented, with clear options.

## Rollout Plan

### Phase 1: Foundation

Delivers: automated intake from Covenant Discord, routed to GitHub issues.

- [ ] Set up Discord bot scaffold in `synapz-agent`
- [ ] Bot joins Covenant server (listener) and synapz_org (command center)
- [ ] Implement channel monitoring on Covenant server
- [ ] Implement task extraction via Claude API
- [ ] Implement GitHub issue creation on `covenant-narrative`
- [ ] Implement basic digest on synapz_org
- [ ] Set up workflow labels on `covenant-narrative` (`triage`, `ready`, `in-progress`, `in-review`, `false-positive`)
- [ ] Test with real chat from #comms-chat

**Value delivered:** You stop manually parsing Discord chat for tasks. Issues appear on covenant-narrative automatically.

### Phase 2: First Worker

Delivers: content drafts generated automatically from issues.

- [ ] Write work-cycle prompt for `covenant-narrative`
- [ ] Set up `claude-cli` adapter
- [ ] Configure cron schedule (every 4 hours)
- [ ] Worker picks up `ready` issues, drafts content, opens PRs
- [ ] Bot notifies on synapz_org when PRs are ready
- [ ] Test end-to-end: Discord chat -> issue -> PR -> review -> merge

**Value delivered:** Content starts getting drafted without you.

### Phase 3: Expand Workers

Delivers: multiple projects advancing autonomously.

- [ ] `barry-music-site` worker (reactive, every 30 min)
- [ ] `crunchdao-synth` auto-research loop (continuous)
- [ ] Portfolio scan (weekly Sunday sweep of ~/Projects/)
- [ ] Friday campaign cleanup cycle on covenant-narrative
- [ ] Worker health monitoring in orchestrator

**Value delivered:** All active projects have agents working on them.

### Phase 4: Polish

Delivers: smoother UX, smarter extraction, broader integration.

- [ ] Approval reactions on synapz_org (checkmark/X on messages)
- [ ] Smarter extraction (learn from corrections)
- [ ] Add `codex-cli` adapter as alternative/fallback
- [ ] Email integration (Gmail MCP or monitoring)
- [ ] Calendar integration (Google Calendar MCP)
- [ ] Worker performance metrics (PRs opened/merged rate, auto-research progress)
- [ ] Cost tracking (token usage per worker per day)

## Safety

Workers have real capabilities (git push, shell access, file editing). Guardrails prevent runaway damage.

**Branch isolation:** Workers always work on feature branches (`agent/issue-{number}-{slug}`). Workers cannot push to main or force-push.

**Issue creation limits:** A worker can create at most 3 issues per run (prevents duplicate floods from extraction bugs or portfolio scans gone wrong).

**PR-only output for client-facing repos:** For repos like `barry-music-site` and `covenant-narrative`, all work goes through PRs. No direct commits to main. For internal repos like `crunchdao-synth`, auto-merge is allowed if tests pass (configurable per worker via `auto_merge_eligible: true`).

**Timeout enforcement:** The orchestrator kills worker processes that exceed `max_duration`. The worker's partial work remains on its branch for inspection.

**Stall detection:** A worker is "stalled" if it has been running for >2x its `max_duration` or if it exits with a non-zero code on 3 consecutive runs. Stalled workers are paused and Derek is alerted.

## Feedback Loop for Task Extraction

From Phase 1, the `false-positive` label is available on all repos. When Derek closes an issue with this label, the bot logs:
- The original Discord message that triggered extraction
- The issue that was created
- Timestamp

This data accumulates in `synapz-agent/data/extraction-feedback.jsonl`. In Phase 4, this log is used to improve the extraction prompt (few-shot examples of what NOT to extract). Even before Phase 4, the log lets Derek audit extraction quality.

## Migration: Obsidian to GitHub

The Obsidian vault (`~/Obsidian/synapz-ops/`) was built for GTD task management but hasn't taken hold as a daily workflow. With GitHub issues replacing task tracking:

**Moves to GitHub:**
- Task capture, triage, and tracking (issues)
- Deliverable review (PRs)
- Project status (issue counts, PR queue)

**Stays in Obsidian (or moves to repo docs):**
- Knowledge base content (brand guides, research notes)
- Daily logs and personal notes
- Long-form planning documents

**Deprecated (no replacement needed):**
- `gtd-system` skill — replaced by GitHub issue workflow
- `sync-vault.sh` — no longer needed for task sync
- Obsidian vault task directories (`tasks/inbox`, `tasks/active`, etc.)

This is not a hard cutover. Obsidian continues to exist for notes and knowledge. The shift is that agents look at GitHub issues for work, not Obsidian task files.

## What This Replaces

| Current | Replaced by |
|---------|------------|
| Synapz on OpenClaw/Telegram | Discord bot + CC workers |
| Obsidian vault for task management | GitHub issues on each repo |
| Manual Discord chat parsing | Automated task extraction |
| Single agent, single interface | Multiple workers, agent-agnostic |
| Reactive (waits for you) | Proactive (works while you're away) |

OpenClaw remains available as an adapter type if a use case emerges where an always-on persistent agent is genuinely useful. The infrastructure isn't thrown away — it just becomes one option among several.

## Open Questions

1. **Covenant server permissions** — Can Derek add a bot, or does he need Kurt's approval?
2. **Rate limits** — How many CC sessions can run concurrently on Derek's subscription? May need to stagger workers.
3. **Cost budget** — What's the acceptable daily/monthly token spend for autonomous workers?
4. **covenant-narrative agent instructions** — What's already there? Build on it vs. extend it.
5. **Security** — Workers have git push access. Should PRs require manual merge, or can some be auto-merged (e.g., auto-research improvements that pass tests)?

## Success Criteria

Phase 1 is successful when:
- Tasks from Covenant Discord appear as GitHub issues within 10 minutes
- False positive rate (non-tasks filed as issues) is below 20%
- Derek reviews and triages from synapz_org Discord on his phone

The system overall is successful when:
- Derek's primary interaction is reviewing and approving output, not producing it
- Multiple projects advance daily without Derek's direct involvement
- New projects can be added by creating a repo with an AGENTS.md and a worker config
- Agent type can be swapped without changing anything else in the system
