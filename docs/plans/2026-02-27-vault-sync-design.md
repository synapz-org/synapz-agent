# Vault Sync Script — Design Doc

**Date:** 2026-02-27
**Status:** Approved
**Parent:** Obsidian Task Management System (Phase 2)

## Problem

The Obsidian vault at `~/Obsidian/synapz-ops/` needs bidirectional sync with Hippius S3 so that Synapz on Basilica (and future agents) can read/write task files. Derek also needs changes from agents to appear locally in Obsidian.

## Decision

Bash script using `aws s3` commands + `fswatch` for auto-watching. Conflict detection via checksum tracking. Same tooling as existing `sync-to-hippius.sh` and `restore-from-hippius.sh`.

## Architecture

```
LOCAL                                    HIPPIUS S3
~/Obsidian/synapz-ops/                   s3://synapz-state/vault/
├── tasks/                               ├── tasks/
├── projects/         ◄──── pull ────►   ├── projects/
├── knowledge/          (every 60s)      ├── knowledge/
├── daily/                               ├── daily/
├── agents/           ──── push ────►    ├── agents/
└── templates/          (on change)      └── templates/
```

### S3 Details

- **Bucket:** `synapz-state` (existing)
- **Prefix:** `vault/`
- **Endpoint:** `https://s3.hippius.com`
- **Region:** `decentralized`
- **Auth:** `HIPPIUS_S3_ACCESS_KEY` / `HIPPIUS_S3_SECRET_KEY` env vars

### Subcommands

- `sync-vault.sh push` — Push local changes to S3
- `sync-vault.sh pull` — Pull remote changes from S3 (with conflict detection)
- `sync-vault.sh watch` — Start daemon: fswatch for push + periodic pull

### Sync Logic

**Push:** For each locally modified file (compared to `.sync-state/checksums.json`), upload to S3 and update checksum record.

**Pull:** List remote files, compare ETags to stored checksums. If remote changed and local unchanged → download. If both changed → create `.conflict.md` file. If new remote file → download.

**Conflict handling:** Creates `filename.conflict.md` with a comment header noting it's a remote version. Original local file stays untouched. Conflicts visible in Obsidian for manual review.

### Watch Mode

- `fswatch` with 5-second debounce triggers push on local changes
- 60-second poll loop triggers pull for remote changes
- PID file at `.sync-state/watch.pid` for daemon management

### Excluded from Sync

`.obsidian/`, `.git/`, `.claude/`, `.sync-state/`, `.trash/`, `.gitkeep`, `*.conflict.md`

### Files

- `~/Projects/synapz-agent/scripts/sync-vault.sh` — the script
- `~/Obsidian/synapz-ops/.sync-state/checksums.json` — checksum tracking
- `~/Obsidian/synapz-ops/.sync-state/last-sync` — last sync timestamp
- `~/Obsidian/synapz-ops/.sync-state/watch.pid` — daemon PID

### Dependencies

- `aws` CLI (already installed at `~/.local/bin/aws`)
- `fswatch` (install via `brew install fswatch`)
- `jq` (for JSON checksum file manipulation)
- `md5` (macOS built-in)

## Costs

None — uses existing `synapz-state` bucket and Hippius S3 credentials.
