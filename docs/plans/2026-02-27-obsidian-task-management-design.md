# Obsidian Task Management System — Design Doc

**Date:** 2026-02-27
**Status:** Approved
**Replaces:** Linear-based GTD system (never fully deployed)

## Problem

Linear doesn't fit Derek's workflow. The structured boards/cycles/sprints model adds friction rather than reducing it. Task management should be markdown-native, decentralized, mobile-accessible, and agent-friendly.

## Decision

Replace Linear with Obsidian + Hippius S3 as the task management backbone. Obsidian provides the local UI and CLI. Hippius S3 provides decentralized storage and agent coordination. Obsidian Sync provides cross-device access (MacBook, phone).

## Architecture

### Source of Truth

Hippius S3 (`s3://synapz-ops/vault/`) is the canonical store. Local Obsidian vault is a synced client.

```
┌─────────────────────────────────────────────┐
│           HIPPIUS S3 (Source of Truth)        │
│         s3://synapz-ops/vault/               │
└──────┬──────────┬──────────┬────────────────┘
       │          │          │
       ▼          ▼          ▼
  ┌─────────┐ ┌────────┐ ┌──────────────────┐
  │ Derek's │ │Derek's │ │ Synapz on        │
  │ MacBook │ │ Phone  │ │ Basilica         │
  │(Obsidian│ │(Obsid. │ │ (direct S3 R/W)  │
  │ + CLI)  │ │ mobile)│ │                  │
  └────┬────┘ └───┬────┘ └──────────────────┘
       └────┬─────┘                ▲
            ▼                      │
     ┌──────────────┐    ┌────────┴────────┐
     │ Obsidian Sync│    │ Future agents   │
     │ ($4/mo)      │    │ (same S3 path)  │
     └──────────────┘    └─────────────────┘
```

### Vault Structure

```
~/Obsidian/synapz-ops/
├── .obsidian/                  # Obsidian config (auto-generated)
├── .claude/                    # Claude Code skills (kepano's obsidian-skills)
├── tasks/
│   ├── inbox/                  # Unclarified captures
│   ├── active/
│   │   ├── @derek/             # Derek's active tasks
│   │   ├── @synapz/            # Synapz's active tasks
│   │   └── @synapz-approval/   # Synapz drafts, Derek approves
│   ├── waiting/                # Blocked on someone/something
│   ├── someday/                # Not actionable now
│   └── done/                   # Completed (archived)
├── projects/                   # Multi-task project notes
│   ├── synapz-agent/
│   ├── covenant-marketing/
│   └── personal/
├── knowledge/                  # Reference material
├── daily/                      # Daily notes (briefings, journals)
├── templates/                  # Task and note templates
├── agents/                     # Agent registry
│   └── synapz/
│       ├── status.md           # Heartbeat/status
│       └── capabilities.md    # What this agent can do
└── views/                      # Bases views (Phase 4)
```

### Task File Schema

Filename: `YYYY-MM-DD-slug.md`

```yaml
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
# Task Title

Description and context here.

## Subtasks
- [ ] Step 1
- [ ] Step 2
```

### GTD Operation Mapping

| Operation | Old (Linear) | New (Obsidian/Hippius) |
|---|---|---|
| Capture | `linear_create_issue` | Create file in `tasks/inbox/` |
| Clarify | Set labels/priority | Set frontmatter, move to folder |
| List | `linear_list_issues` | `obsidian search` / grep frontmatter |
| Update | `linear_update_issue` | Edit file frontmatter/content |
| Complete | Set state "completed" | Move to `tasks/done/`, set date |
| Search | `linear_search` | `obsidian search` / ripgrep |
| Daily briefing | Multiple Linear API calls | Scan tasks/ + gcal_today |
| Weekly review | Multiple Linear API calls | Scan vault for stale/done/upcoming |

### Covenant Workflow

The Covenant Narrative repo (`~/Projects/covenant-narrative/`) syncs to GitHub. Agents coordinate work via the vault, but all changes to the Covenant repo go through Derek:

1. Agent works on content task (labeled `@synapz-approval`)
2. Output stored in vault or agent workspace
3. Derek reviews and approves
4. Derek commits/pushes to covenant-narrative → GitHub

The vault coordinates work; the git repo is the publication channel.

### Communication

Stay on Telegram for now. Evaluate Slack when fleet > 2 agents.

## Phased Rollout

### Phase 1 — Local setup (today)
1. Create vault at `~/Obsidian/synapz-ops/`
2. Set up folder structure and templates
3. Install kepano's obsidian-skills for Claude Code
4. Rewrite GTD skill for Obsidian/filesystem
5. Update HEARTBEAT.md references

### Phase 2 — Sync & mobile
1. Update Obsidian to 1.12 (CLI support)
2. Buy Obsidian Sync Standard ($4/mo)
3. Set up Obsidian mobile with synced vault
4. Build bidirectional sync script (vault ↔ Hippius S3)

### Phase 3 — Agent integration
1. Update Synapz Hippius plugin for task file R/W on S3
2. Update deployed GTD skill for Hippius S3 operations
3. Add agent heartbeat files to `agents/synapz/`
4. Update AGENTS.md with new patterns

### Phase 4 — Fleet readiness (future)
1. Agent registration template in `agents/`
2. Coordination protocol (task handoff files)
3. Bases views for multi-agent dashboard
4. Evaluate Slack migration if needed

## Costs

- Obsidian Catalyst License: $25 one-time (CLI early access)
- Obsidian Sync Standard: $4/mo
- Hippius S3: already provisioned (synapz-state bucket)
- Linear: cancelled (no active subscription)
