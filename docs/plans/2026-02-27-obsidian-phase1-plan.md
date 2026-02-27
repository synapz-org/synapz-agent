# Obsidian Task Management — Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up a local Obsidian vault with folder structure, templates, and a rewritten GTD skill that replaces all Linear references with filesystem/Obsidian operations.

**Architecture:** File-per-task markdown files with YAML frontmatter in a structured folder hierarchy. Local vault at `~/Obsidian/synapz-ops/`. Claude Code interacts via filesystem (Read/Write/Glob/Grep). Obsidian provides the UI. GTD skill is tool-agnostic so it works locally and on Basilica (Phase 3).

**Tech Stack:** Obsidian, Markdown, YAML frontmatter, kepano/obsidian-skills, Bash (directory setup)

**Design Doc:** `docs/plans/2026-02-27-obsidian-task-management-design.md`

---

### Task 1: Create vault directory structure

**Files:**
- Create: `~/Obsidian/synapz-ops/` and all subdirectories

**Step 1: Create the full directory tree**

```bash
mkdir -p ~/Obsidian/synapz-ops/{tasks/{inbox,active/@derek,active/@synapz,active/@synapz-approval,waiting,someday,done},projects/{synapz-agent,covenant-marketing,personal},knowledge,daily,templates,agents/synapz,views}
```

**Step 2: Create .gitkeep files so empty dirs survive git**

```bash
find ~/Obsidian/synapz-ops -type d -empty -exec touch {}/.gitkeep \;
```

**Step 3: Verify structure**

```bash
find ~/Obsidian/synapz-ops -type d | sort
```

Expected output should show all directories from the design doc.

**Step 4: Initialize git repo in the vault**

```bash
cd ~/Obsidian/synapz-ops && git init
```

**Step 5: Create .gitignore for Obsidian config noise**

Create `~/Obsidian/synapz-ops/.gitignore`:
```
.obsidian/workspace.json
.obsidian/workspace-mobile.json
.obsidian/hotkeys.json
.obsidian/plugins/
.obsidian/themes/
.trash/
```

We keep `.obsidian/app.json`, `.obsidian/appearance.json`, `.obsidian/core-plugins.json` tracked so settings are reproducible.

**Step 6: Commit initial structure**

```bash
cd ~/Obsidian/synapz-ops && git add -A && git commit -m "feat: initialize synapz-ops vault structure"
```

---

### Task 2: Create task and daily note templates

**Files:**
- Create: `~/Obsidian/synapz-ops/templates/task.md`
- Create: `~/Obsidian/synapz-ops/templates/daily-note.md`
- Create: `~/Obsidian/synapz-ops/templates/project.md`

**Step 1: Create task template**

Write `~/Obsidian/synapz-ops/templates/task.md`:
```markdown
---
status: inbox
assignee: ""
priority: medium
due:
project:
tags: []
created: {{date:YYYY-MM-DD}}
completed:
---
# {{title}}

## Context


## Subtasks
- [ ]
```

**Step 2: Create daily note template**

Write `~/Obsidian/synapz-ops/templates/daily-note.md`:
```markdown
---
date: {{date:YYYY-MM-DD}}
type: daily
---
# {{date:dddd, MMMM D, YYYY}}

## Calendar
<!-- gcal_today results go here -->

## Priority Tasks
<!-- urgent/high tasks due today -->

## Waiting On
<!-- @waiting items -->

## Synapz Actions
<!-- @synapz autonomous tasks -->

## Notes

```

**Step 3: Create project template**

Write `~/Obsidian/synapz-ops/templates/project.md`:
```markdown
---
status: active
lead: "@derek"
created: {{date:YYYY-MM-DD}}
tags: []
---
# {{title}}

## Goal


## Tasks
<!-- Links to task files in tasks/ -->

## Notes

```

**Step 4: Commit templates**

```bash
cd ~/Obsidian/synapz-ops && git add templates/ && git commit -m "feat: add task, daily note, and project templates"
```

---

### Task 3: Create agent registry files

**Files:**
- Create: `~/Obsidian/synapz-ops/agents/synapz/status.md`
- Create: `~/Obsidian/synapz-ops/agents/synapz/capabilities.md`

**Step 1: Create Synapz status file**

Write `~/Obsidian/synapz-ops/agents/synapz/status.md`:
```markdown
---
agent: synapz
status: online
deployment: basilica
last_heartbeat: 2026-02-27
version: v13
---
# Synapz — Status

**Deployment:** Basilica (99beba4f-9862-4d0f-8b17-85858b9b5fca)
**Image:** dwbarnes/synapz-agent:v13
**Health:** https://99beba4f-9862-4d0f-8b17-85858b9b5fca.deployments.basilica.ai/health

## Current Focus
- Digital philosopher persona on Telegram
- GTD co-pilot for Derek
- Bittensor ecosystem knowledge holder

## Recent Activity
<!-- Updated by agent or sync script -->
```

**Step 2: Create Synapz capabilities file**

Write `~/Obsidian/synapz-ops/agents/synapz/capabilities.md`:
```markdown
---
agent: synapz
type: general-purpose
platform: openclaw
---
# Synapz — Capabilities

## Tools Available
- **Hippius S3**: File storage and retrieval (hippius_store, hippius_download, hippius_list_files, hippius_sync_state)
- **Google Calendar**: Schedule awareness (gcal_today, gcal_this_week, gcal_create_event, gcal_list_events)
- **Knowledge Base**: Reference material (kb_add, kb_search, kb_list, kb_ingest_url)
- **Telegram**: Communication with Derek
- **Browser**: Web research and data extraction
- **Desearch**: Bittensor-native web/Twitter search

## Task Types
- `@synapz` — Can handle autonomously (research, drafting, monitoring)
- `@synapz-approval` — Can draft, needs Derek's approval (content, decisions)

## Limitations
- No direct git push to Covenant repos (Derek approves all commits)
- No financial transactions
- No access to Linear (deprecated — use vault task files)
```

**Step 3: Commit agent registry**

```bash
cd ~/Obsidian/synapz-ops && git add agents/ && git commit -m "feat: add Synapz agent registry files"
```

---

### Task 4: Install kepano's obsidian-skills

**Files:**
- Create: `~/Obsidian/synapz-ops/.claude/skills/` (from kepano/obsidian-skills repo)

**Step 1: Clone obsidian-skills into vault's .claude directory**

```bash
mkdir -p ~/Obsidian/synapz-ops/.claude
cd ~/Obsidian/synapz-ops/.claude
git clone https://github.com/kepano/obsidian-skills.git skills-repo
cp -r skills-repo/skills/* . 2>/dev/null || true
```

Note: The exact directory structure depends on how kepano packages the skills. The goal is to have skill folders (obsidian-cli, obsidian-markdown, obsidian-bases, json-canvas, defuddle) accessible under `.claude/`.

**Step 2: Verify skills are present**

```bash
ls ~/Obsidian/synapz-ops/.claude/
```

Expected: directories for obsidian-cli, obsidian-markdown, obsidian-bases, json-canvas, defuddle (or similar structure).

**Step 3: Clean up clone artifacts**

```bash
rm -rf ~/Obsidian/synapz-ops/.claude/skills-repo
```

**Step 4: Commit skills installation**

```bash
cd ~/Obsidian/synapz-ops && git add .claude/ && git commit -m "feat: install kepano obsidian-skills for Claude Code"
```

---

### Task 5: Rewrite GTD skill for Obsidian/filesystem

This is the core migration. The GTD skill at `skills/gtd-system/SKILL.md` currently references Linear tools. Rewrite it to use filesystem operations (locally) or Hippius S3 (on Basilica). Make the skill tool-agnostic where possible.

**Files:**
- Modify: `/Users/dwbarnes/Projects/synapz-agent/skills/gtd-system/SKILL.md`

**Step 1: Read the existing GTD skill**

Read `/Users/dwbarnes/Projects/synapz-agent/skills/gtd-system/SKILL.md` to confirm current content.

**Step 2: Rewrite the full skill**

Replace the entire content of `skills/gtd-system/SKILL.md` with the new version below. Key changes:
- All `linear_*` tool references → filesystem/vault operations
- Task storage → markdown files in `~/Obsidian/synapz-ops/tasks/`
- Same GTD methodology (capture, clarify, organize, reflect, engage)
- Tool-agnostic: describes operations conceptually, with notes for local vs Basilica context
- Vault path: `~/Obsidian/synapz-ops/` (local) or `s3://synapz-ops/vault/` (Basilica)

New content for the skill:

```markdown
---
name: gtd-system
description: GTD (Getting Things Done) workflow for managing tasks, knowledge, and calendar. Use when Derek mentions tasks, todos, next actions, projects, daily briefing, weekly review, or asks what's on the agenda.
---

# GTD System — Synapz Task Management

You are Derek's GTD co-pilot. You use the Obsidian vault for task management, the Knowledge Base for reference material, and Google Calendar for schedule awareness.

## Vault Location

- **Local (Claude Code):** `~/Obsidian/synapz-ops/`
- **Remote (Basilica):** `s3://synapz-ops/vault/` via Hippius S3 tools

## Task File Format

Each task is a markdown file in `tasks/`. Filename: `YYYY-MM-DD-slug.md`.

Frontmatter:
​```yaml
---
status: inbox | active | waiting | someday | done
assignee: "@derek" | "@synapz" | "@synapz-approval" | "@waiting"
priority: urgent | high | medium | low
due: YYYY-MM-DD
project: synapz-agent | covenant-marketing | personal
tags: []
created: YYYY-MM-DD
completed: YYYY-MM-DD
---
​```

## Core Principle

**Capture everything. Clarify immediately. Organize ruthlessly. Review regularly. Engage deliberately.**

---

## 1. CAPTURE

When Derek mentions something actionable in conversation, capture it immediately.

**Trigger phrases**: "remind me to", "I need to", "we should", "don't forget", "add a task", "todo", "action item"

**How to capture**:
1. Create a new markdown file in `tasks/inbox/` named `YYYY-MM-DD-slug.md`
2. Set frontmatter: status=inbox, created=today, priority=medium (default)
3. Add context from the conversation as the description
4. If it has a deadline, set `due`

**Do NOT silently capture** — always confirm: "Captured: [title] — in inbox"

---

## 2. CLARIFY

Before or after capturing, quickly clarify:

1. **Is it actionable?** If no → reference material, add to `knowledge/` instead
2. **Who does it?**
   - Derek does it → assignee `@derek`
   - Synapz can do it autonomously → assignee `@synapz`
   - Synapz needs Derek's approval → assignee `@synapz-approval`
   - Waiting on someone else → assignee `@waiting`
3. **What's the next physical action?** Make the title a concrete next action
4. **Is there a deadline?** Set `due` if yes
5. **Is it actionable now?** If not → assignee stays, status=someday

**Good titles**: "Email John about partnership proposal", "Review Bittensor whitepaper section 3"
**Bad titles**: "Partnership stuff", "Bittensor"

---

## 3. ORGANIZE

After clarifying, move the task file to the right folder:

| Status | Folder | When |
|--------|--------|------|
| inbox | `tasks/inbox/` | Just captured, not yet clarified |
| active | `tasks/active/@assignee/` | Being worked on |
| waiting | `tasks/waiting/` | Blocked on external party |
| someday | `tasks/someday/` | Not actionable now |
| done | `tasks/done/` | Completed |

Update the `status` frontmatter field to match the folder.

### Priority Mapping

| Priority | When to use |
|----------|-------------|
| urgent | Due today or blocking other work |
| high | Due this week or important |
| medium | No hard deadline, should do soon |
| low | Nice to have, no rush |

### Routing

- **Actionable task** → Task file in appropriate tasks/ folder
- **Reference material** → File in `knowledge/` (or `kb_add` on Basilica)
- **Calendar event** → Google Calendar (`gcal_create_event`)
- **Quick answer** → Just respond, no capture needed

---

## 4. REFLECT

### Daily Briefing

**Triggers**: "good morning", "daily briefing", "what's on today", "morning update"

**Steps**:
1. Check calendar: `gcal_today`
2. Scan `tasks/active/@derek/` for Derek's active tasks (sort by priority, flag overdue)
3. Scan `tasks/waiting/` for blocked items
4. Scan `tasks/active/@synapz/` for autonomous work available
5. Scan `tasks/inbox/` for unclarified items
6. Check `knowledge/` for recently added items (last 3 days)

**Format**:
​```
Good morning, Derek. Here's your day:

CALENDAR
[gcal_today results]

PRIORITY TASKS
[Active @derek tasks, urgent/high first, flag anything overdue]

WAITING ON
[@waiting tasks with context]

INBOX (unclarified)
[tasks/inbox/ items that need triage]

SYNAPZ ACTIONS
[@synapz tasks I can work on autonomously]
​```

### Weekly Review

**Triggers**: "weekly review", "review the week", "what did we accomplish"

**Steps**:
1. Scan `tasks/done/` for items completed this week (check `completed` date)
2. Scan `tasks/active/` for in-progress work
3. Scan all tasks for upcoming due dates (next 7 days)
4. Flag stale items (in active/ but not updated in 7+ days)
5. Scan `tasks/someday/` for promotion or deletion
6. Check `gcal_list_events` for next 7 days
7. Check `knowledge/` for items added this week

**Format**:
​```
Weekly Review — [date range]

COMPLETED THIS WEEK
[done/ items with completed date in range]

STILL IN PROGRESS
[active/ items]

UPCOMING DEADLINES
[tasks with due dates in next 7 days]

STALE ITEMS (no update in 7+ days)
[active/ items not modified recently]

SOMEDAY/MAYBE
[someday/ items — review for promotion or deletion]

NEXT WEEK CALENDAR
[gcal_list_events for next 7 days]
​```

Present the review and ask: "Any items to promote, defer, or delete?"

---

## 5. ENGAGE

### Picking Next Actions

When Derek asks "what should I work on" or "what's next":
1. Check calendar for imminent events
2. List urgent/high priority tasks in `tasks/active/@derek/`
3. Recommend the highest-impact next action
4. Mention anything in `tasks/active/@synapz/` that you can handle

### Autonomous Work

For tasks assigned `@synapz`:
- Pick them up proactively when Derek isn't actively chatting
- Add progress notes to the task file body
- When complete, move to `tasks/done/` and set `completed` date
- Notify Derek

For tasks assigned `@synapz-approval`:
- Do the work (draft, research, etc.)
- Add the output to the task file or a linked file
- Notify Derek for review
- Only move to done after Derek approves

---

## Tool Reference

### Task Operations (Local — Claude Code)
- **Create task**: Write new file to `tasks/inbox/YYYY-MM-DD-slug.md`
- **Read task**: Read the markdown file
- **List tasks**: Glob `tasks/**/*.md`, read frontmatter
- **Search tasks**: Grep for keywords or frontmatter values
- **Update task**: Edit the file (frontmatter or body)
- **Move task**: Move file between folders, update status field
- **Complete task**: Move to `tasks/done/`, set `completed: YYYY-MM-DD`

### Task Operations (Remote — Basilica/Hippius)
- **Create task**: `hippius_store` file to `vault/tasks/inbox/`
- **Read task**: `hippius_download` file by key
- **List tasks**: `hippius_list_files` with prefix `vault/tasks/`
- **Update task**: `hippius_store` updated file (overwrite)
- **Complete task**: Store in `vault/tasks/done/`, update frontmatter

### Knowledge Base
- `kb_add` — Store curated knowledge
- `kb_ingest_url` — Crawl and store a web page
- `kb_search` — Search knowledge by keyword
- `kb_list` — Browse knowledge entries

### Google Calendar
- `gcal_today` — Today's events
- `gcal_this_week` — This week's events
- `gcal_create_event` — Create an event
- `gcal_list_events` — Events in a date range
```

**Step 3: Verify no Linear references remain**

```bash
grep -i "linear" /Users/dwbarnes/Projects/synapz-agent/skills/gtd-system/SKILL.md
```

Expected: no output (zero matches).

**Step 4: Commit the rewritten skill**

```bash
cd /Users/dwbarnes/Projects/synapz-agent && git add skills/gtd-system/SKILL.md && git commit -m "feat: rewrite GTD skill for Obsidian vault (replaces Linear)"
```

---

### Task 6: Update HEARTBEAT.md

**Files:**
- Modify: `/Users/dwbarnes/Projects/synapz-agent/HEARTBEAT.md`

**Step 1: Read current HEARTBEAT.md**

Read `/Users/dwbarnes/Projects/synapz-agent/HEARTBEAT.md`.

**Step 2: Replace Linear references with vault operations**

Replace the full content with:

```markdown
# Heartbeat — Synapz Daily Routine

## Morning Briefing (trigger: first message of the day OR "good morning")
1. Check calendar: `gcal_today`
2. Scan `tasks/active/@derek/` for urgent/high priority tasks
3. Scan `tasks/waiting/` for blocked items
4. Scan `tasks/active/@synapz/` for autonomous work
5. Scan `tasks/inbox/` for unclarified items
6. Present daily briefing in GTD format

## Proactive Behaviors
- When Derek shares a link → offer to add to knowledge base via `kb_ingest_url`
- When Derek mentions a task → capture to `tasks/inbox/` with appropriate frontmatter
- When Derek asks "what's next" → consult calendar + vault priorities
- When conversation references a topic → check knowledge base for relevant items

## Self-Healing (manual trigger: "check logs" or "health check")
1. Review recent errors in errors.md
2. Check BOOTSTRAP.md for stale blockers
3. Report status of all integrations (GCal, KB, Hippius, Vault)
4. Update learnings.md with any new insights

## Weekly Review (trigger: "weekly review" or Sundays)
1. Run full GTD weekly review per gtd-system skill
2. Prune stale tasks in `tasks/someday/`
3. Update BOOTSTRAP.md
4. Sync vault state to Hippius
```

**Step 3: Verify no Linear references remain**

```bash
grep -i "linear" /Users/dwbarnes/Projects/synapz-agent/HEARTBEAT.md
```

Expected: no output.

**Step 4: Commit**

```bash
cd /Users/dwbarnes/Projects/synapz-agent && git add HEARTBEAT.md && git commit -m "feat: update HEARTBEAT.md for Obsidian vault (replaces Linear)"
```

---

### Task 7: Update BOOTSTRAP.md and AGENTS.md Linear references

**Files:**
- Modify: `/Users/dwbarnes/Projects/synapz-agent/BOOTSTRAP.md` (lines 7, 36)
- Modify: `/Users/dwbarnes/Projects/synapz-agent/AGENTS.md` (line 189)

**Step 1: Read both files**

Read BOOTSTRAP.md and AGENTS.md to confirm current Linear references.

**Step 2: Update BOOTSTRAP.md**

- Line 7: Change "Run daily GTD workflow via Linear + GCal + Knowledge Base" → "Run daily GTD workflow via Obsidian vault + GCal + Knowledge Base"
- Line 36: Change "Create initial Linear issues for pending ROADMAP items" → "Create initial task files in vault for pending ROADMAP items"

**Step 3: Update AGENTS.md**

- Line 189 (or wherever Linear is referenced as a tool): Change "Linear" → "Obsidian vault (tasks/)" in the tools list. Update description from "Task capture, GTD workflow, project tracking" to "Task capture, GTD workflow, project tracking (markdown files in Obsidian vault)"

**Step 4: Verify no stale Linear references in core files**

```bash
grep -ri "linear" /Users/dwbarnes/Projects/synapz-agent/BOOTSTRAP.md /Users/dwbarnes/Projects/synapz-agent/AGENTS.md /Users/dwbarnes/Projects/synapz-agent/HEARTBEAT.md /Users/dwbarnes/Projects/synapz-agent/skills/gtd-system/SKILL.md
```

Expected: no output for these files. (Note: covenant-marketing-ops still has Linear refs — that's Phase 3.)

**Step 5: Commit**

```bash
cd /Users/dwbarnes/Projects/synapz-agent && git add BOOTSTRAP.md AGENTS.md && git commit -m "feat: update BOOTSTRAP.md and AGENTS.md to reference Obsidian vault"
```

---

### Task 8: Create a seed task to verify the system works

**Files:**
- Create: `~/Obsidian/synapz-ops/tasks/inbox/2026-02-27-set-up-obsidian-sync.md`
- Create: `~/Obsidian/synapz-ops/tasks/inbox/2026-02-27-update-obsidian-to-1-12.md`
- Create: `~/Obsidian/synapz-ops/tasks/active/@derek/2026-02-27-buy-obsidian-catalyst-license.md`

**Step 1: Create seed tasks**

These are real Phase 2 tasks, captured using the new system:

`tasks/inbox/2026-02-27-set-up-obsidian-sync.md`:
```markdown
---
status: inbox
assignee: "@derek"
priority: high
due:
project: synapz-agent
tags: [obsidian, sync, phase-2]
created: 2026-02-27
completed:
---
# Set up Obsidian Sync Standard

Subscribe to Obsidian Sync Standard ($4/mo) and connect the synapz-ops vault. This enables mobile access and is prerequisite for headless agent sync.

## Subtasks
- [ ] Buy Sync Standard subscription at obsidian.md/pricing
- [ ] Enable Sync in Obsidian settings
- [ ] Connect synapz-ops vault to Sync
- [ ] Verify sync works between devices
```

`tasks/inbox/2026-02-27-update-obsidian-to-1-12.md`:
```markdown
---
status: inbox
assignee: "@derek"
priority: high
due:
project: synapz-agent
tags: [obsidian, cli, phase-2]
created: 2026-02-27
completed:
---
# Update Obsidian to v1.12 for CLI support

Current version is 1.8.9. Need 1.12+ for CLI commands. Requires Catalyst license ($25 one-time) for early access.

## Subtasks
- [ ] Buy Catalyst license at obsidian.md/pricing
- [ ] Update Obsidian desktop to 1.12+
- [ ] Verify `obsidian` CLI command is available
- [ ] Test: `obsidian search "test" --vault synapz-ops`
```

`tasks/active/@derek/2026-02-27-buy-obsidian-catalyst-license.md`:
```markdown
---
status: active
assignee: "@derek"
priority: urgent
due: 2026-02-28
project: synapz-agent
tags: [obsidian, license, phase-2]
created: 2026-02-27
completed:
---
# Buy Obsidian Catalyst license

$25 one-time at obsidian.md/pricing. Unlocks CLI early access (v1.12) and Sync subscription. Do this first — everything else in Phase 2 depends on it.
```

**Step 2: Verify task files have correct frontmatter**

```bash
head -10 ~/Obsidian/synapz-ops/tasks/inbox/2026-02-27-set-up-obsidian-sync.md
head -10 ~/Obsidian/synapz-ops/tasks/active/@derek/2026-02-27-buy-obsidian-catalyst-license.md
```

**Step 3: Commit seed tasks**

```bash
cd ~/Obsidian/synapz-ops && git add tasks/ && git commit -m "feat: add Phase 2 seed tasks to verify vault system"
```

---

### Task 9: Open vault in Obsidian and verify

**Step 1: Open the vault in Obsidian**

```bash
open ~/Obsidian/synapz-ops
```

Or open Obsidian manually and use "Open folder as vault" → select `~/Obsidian/synapz-ops`.

**Step 2: Visual verification checklist**

Manually confirm in Obsidian:
- [ ] Folder structure visible in file explorer
- [ ] Task files render with frontmatter properties
- [ ] Templates folder has all 3 templates
- [ ] Agent registry files are readable
- [ ] No errors in Obsidian console

**Step 3: Final commit in synapz-agent repo**

```bash
cd /Users/dwbarnes/Projects/synapz-agent && git add docs/plans/ && git commit -m "docs: add Obsidian task management design doc and Phase 1 plan"
```

---

## Post-Phase 1 Checklist

After all tasks complete, verify:
- [ ] Vault exists at `~/Obsidian/synapz-ops/` with full directory structure
- [ ] 3 templates created (task, daily-note, project)
- [ ] Agent registry files for Synapz
- [ ] kepano's obsidian-skills installed in `.claude/`
- [ ] GTD skill rewritten with zero Linear references
- [ ] HEARTBEAT.md updated with zero Linear references
- [ ] BOOTSTRAP.md and AGENTS.md updated
- [ ] Seed tasks created and visible in Obsidian
- [ ] Both repos committed (synapz-ops vault + synapz-agent)

**Next:** Phase 2 — Update Obsidian to 1.12, buy Sync + Catalyst, set up mobile, build Hippius sync script.
