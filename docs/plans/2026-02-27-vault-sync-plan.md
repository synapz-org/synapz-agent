# Vault Sync Script Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a bidirectional sync script that keeps the local Obsidian vault (`~/Obsidian/synapz-ops/`) in sync with Hippius S3 (`s3://synapz-state/vault/`), with auto-watch and conflict detection.

**Architecture:** Bash script with three subcommands (push, pull, watch). Push uploads changed files using `aws s3 cp`. Pull downloads remote changes with conflict detection via MD5 checksums stored in `.sync-state/checksums.json`. Watch mode uses `fswatch` for local changes + 60-second poll for remote changes.

**Tech Stack:** Bash, aws CLI, fswatch (brew), jq, md5 (macOS built-in)

**Design doc:** `docs/plans/2026-02-27-vault-sync-design.md`

**Reference:** Existing scripts at `scripts/sync-to-hippius.sh` and `scripts/restore-from-hippius.sh` for S3 patterns.

---

### Task 1: Install fswatch dependency

**Step 1: Install fswatch via Homebrew**

```bash
brew install fswatch
```

**Step 2: Verify installation**

```bash
which fswatch && fswatch --version
```

Expected: path to fswatch binary and version output.

---

### Task 2: Create the sync-vault.sh script — setup and push

**Files:**
- Create: `/Users/dwbarnes/Projects/synapz-agent/scripts/sync-vault.sh`

**Step 1: Write the script with configuration, helpers, and push subcommand**

```bash
#!/bin/bash
# Bidirectional sync between Obsidian vault and Hippius S3
#
# Usage:
#   ./sync-vault.sh push    # Push local changes to S3
#   ./sync-vault.sh pull    # Pull remote changes (with conflict detection)
#   ./sync-vault.sh watch   # Auto-sync: fswatch + periodic pull
#   ./sync-vault.sh status  # Show sync state
#   ./sync-vault.sh stop    # Stop watch daemon
#
# Environment variables:
#   HIPPIUS_S3_ACCESS_KEY  - Hippius S3 access key (hip_xxx format)
#   HIPPIUS_S3_SECRET_KEY  - Hippius S3 secret key
#   HIPPIUS_S3_BUCKET      - S3 bucket name (default: synapz-state)
#   VAULT_PATH             - Local vault path (default: ~/Obsidian/synapz-ops)

set -euo pipefail

# --- Configuration ---
VAULT_PATH="${VAULT_PATH:-$HOME/Obsidian/synapz-ops}"
BUCKET="${HIPPIUS_S3_BUCKET:-synapz-state}"
S3_PREFIX="vault"
S3_ENDPOINT="https://s3.hippius.com"
SYNC_STATE_DIR="$VAULT_PATH/.sync-state"
CHECKSUMS_FILE="$SYNC_STATE_DIR/checksums.json"
LAST_SYNC_FILE="$SYNC_STATE_DIR/last-sync"
PID_FILE="$SYNC_STATE_DIR/watch.pid"
DEBOUNCE_SECONDS=5
PULL_INTERVAL=60

# Directories/patterns to exclude from sync
EXCLUDE_PATTERNS=(
    ".obsidian"
    ".git"
    ".claude"
    ".sync-state"
    ".trash"
    ".gitkeep"
    "*.conflict.md"
    ".DS_Store"
)

# --- Credential Setup ---
validate_credentials() {
    if [ -z "${HIPPIUS_S3_ACCESS_KEY:-}" ] || [ -z "${HIPPIUS_S3_SECRET_KEY:-}" ]; then
        echo "Error: HIPPIUS_S3_ACCESS_KEY and HIPPIUS_S3_SECRET_KEY must be set"
        exit 1
    fi
    if ! command -v aws &>/dev/null; then
        echo "Error: aws CLI not found"
        exit 1
    fi
    export AWS_ACCESS_KEY_ID="$HIPPIUS_S3_ACCESS_KEY"
    export AWS_SECRET_ACCESS_KEY="$HIPPIUS_S3_SECRET_KEY"
}

# --- Helper Functions ---

# Initialize sync state directory
init_sync_state() {
    mkdir -p "$SYNC_STATE_DIR"
    if [ ! -f "$CHECKSUMS_FILE" ]; then
        echo '{}' > "$CHECKSUMS_FILE"
    fi
    # Add .sync-state to vault .gitignore if not already there
    if ! grep -q ".sync-state" "$VAULT_PATH/.gitignore" 2>/dev/null; then
        echo ".sync-state/" >> "$VAULT_PATH/.gitignore"
    fi
}

# Check if a path should be excluded from sync
should_exclude() {
    local rel_path="$1"
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        case "$rel_path" in
            ${pattern}*|*/${pattern}*|*.conflict.md)
                return 0 ;;
        esac
    done
    return 1
}

# Compute MD5 of a file (macOS md5 command)
file_md5() {
    md5 -q "$1" 2>/dev/null || md5sum "$1" 2>/dev/null | awk '{print $1}'
}

# Get stored checksum for a file
stored_checksum() {
    local rel_path="$1"
    jq -r --arg p "$rel_path" '.[$p] // ""' "$CHECKSUMS_FILE"
}

# Update stored checksum for a file
update_checksum() {
    local rel_path="$1"
    local checksum="$2"
    local tmp
    tmp=$(mktemp)
    jq --arg p "$rel_path" --arg c "$checksum" '.[$p] = $c' "$CHECKSUMS_FILE" > "$tmp" \
        && mv "$tmp" "$CHECKSUMS_FILE"
}

# Remove stored checksum for a file
remove_checksum() {
    local rel_path="$1"
    local tmp
    tmp=$(mktemp)
    jq --arg p "$rel_path" 'del(.[$p])' "$CHECKSUMS_FILE" > "$tmp" \
        && mv "$tmp" "$CHECKSUMS_FILE"
}

# S3 command helper
s3cmd() {
    aws --endpoint-url "$S3_ENDPOINT" --region decentralized s3 "$@" 2>&1
}

# --- Push: Local → S3 ---
do_push() {
    echo "Pushing local changes to S3..."
    local pushed=0
    local skipped=0

    # Find all files in vault (excluding dirs and excluded patterns)
    while IFS= read -r -d '' file; do
        local rel_path="${file#$VAULT_PATH/}"

        if should_exclude "$rel_path"; then
            continue
        fi

        local current_md5
        current_md5=$(file_md5 "$file")
        local stored
        stored=$(stored_checksum "$rel_path")

        if [ "$current_md5" != "$stored" ]; then
            local s3_key="$S3_PREFIX/$rel_path"
            if s3cmd cp "$file" "s3://$BUCKET/$s3_key" >/dev/null; then
                update_checksum "$rel_path" "$current_md5"
                echo "  ↑ $rel_path"
                ((pushed++))
            else
                echo "  ✗ Failed to push: $rel_path"
            fi
        else
            ((skipped++))
        fi
    done < <(find "$VAULT_PATH" -type f -print0)

    # Check for deleted files (in checksums but not on disk)
    local deleted=0
    for rel_path in $(jq -r 'keys[]' "$CHECKSUMS_FILE"); do
        if [ ! -f "$VAULT_PATH/$rel_path" ] && ! should_exclude "$rel_path"; then
            local s3_key="$S3_PREFIX/$rel_path"
            if s3cmd rm "s3://$BUCKET/$s3_key" >/dev/null 2>&1; then
                remove_checksum "$rel_path"
                echo "  ✗ Deleted from S3: $rel_path"
                ((deleted++))
            fi
        fi
    done

    date -u +"%Y-%m-%dT%H:%M:%SZ" > "$LAST_SYNC_FILE"
    echo "Push complete: $pushed uploaded, $skipped unchanged, $deleted deleted"
}

# --- Main ---
main() {
    local cmd="${1:-help}"

    case "$cmd" in
        push)
            validate_credentials
            init_sync_state
            do_push
            ;;
        pull)
            echo "Pull not yet implemented (Task 3)"
            ;;
        watch)
            echo "Watch not yet implemented (Task 4)"
            ;;
        status)
            echo "Status not yet implemented (Task 5)"
            ;;
        stop)
            echo "Stop not yet implemented (Task 4)"
            ;;
        help|*)
            echo "Usage: $0 {push|pull|watch|status|stop}"
            echo ""
            echo "Commands:"
            echo "  push    Push local vault changes to Hippius S3"
            echo "  pull    Pull remote changes from S3 (with conflict detection)"
            echo "  watch   Start auto-sync daemon (fswatch + periodic pull)"
            echo "  status  Show sync state"
            echo "  stop    Stop watch daemon"
            ;;
    esac
}

main "$@"
```

**Step 2: Make it executable**

```bash
chmod +x /Users/dwbarnes/Projects/synapz-agent/scripts/sync-vault.sh
```

**Step 3: Test push with a dry run**

First, source env vars (from wherever they're stored — likely the basilica .env):
```bash
source ~/Projects/openclaw-bittensor/extensions/basilica/.env 2>/dev/null
```

Then test help:
```bash
./scripts/sync-vault.sh help
```

Expected: usage output with all subcommands listed.

**Step 4: Test push**

```bash
./scripts/sync-vault.sh push
```

Expected: uploads ~30 vault files to `s3://synapz-state/vault/`, shows `↑` for each file pushed.

**Step 5: Test push again (should be no-op)**

```bash
./scripts/sync-vault.sh push
```

Expected: `Push complete: 0 uploaded, N unchanged, 0 deleted` — checksums match, nothing to push.

**Step 6: Verify files on S3**

```bash
source ~/Projects/openclaw-bittensor/extensions/basilica/.env 2>/dev/null
AWS_ACCESS_KEY_ID="$HIPPIUS_S3_ACCESS_KEY" AWS_SECRET_ACCESS_KEY="$HIPPIUS_S3_SECRET_KEY" \
  aws --endpoint-url https://s3.hippius.com --region decentralized \
  s3 ls s3://synapz-state/vault/ --recursive
```

Expected: all vault files listed under `vault/` prefix.

**Step 7: Commit**

```bash
cd /Users/dwbarnes/Projects/synapz-agent && git add scripts/sync-vault.sh && git commit -m "feat: add sync-vault.sh with push subcommand"
```

---

### Task 3: Add pull subcommand with conflict detection

**Files:**
- Modify: `/Users/dwbarnes/Projects/synapz-agent/scripts/sync-vault.sh`

**Step 1: Replace the pull placeholder with the full implementation**

Replace the line `echo "Pull not yet implemented (Task 3)"` and add the `do_pull` function before the `main` function. The pull logic:

```bash
# --- Pull: S3 → Local ---
do_pull() {
    echo "Pulling remote changes from S3..."
    local pulled=0
    local conflicts=0
    local skipped=0

    # List all files on S3 under vault/ prefix
    local s3_listing
    s3_listing=$(s3cmd ls "s3://$BUCKET/$S3_PREFIX/" --recursive 2>/dev/null | awk '{print $4}') || true

    if [ -z "$s3_listing" ]; then
        echo "No files found on S3 at s3://$BUCKET/$S3_PREFIX/"
        return
    fi

    while IFS= read -r s3_uri; do
        [ -z "$s3_uri" ] && continue

        # Extract relative path (remove s3://bucket/prefix/)
        local rel_path="${s3_uri#s3://$BUCKET/$S3_PREFIX/}"

        if should_exclude "$rel_path"; then
            continue
        fi

        local local_file="$VAULT_PATH/$rel_path"
        local stored
        stored=$(stored_checksum "$rel_path")

        # Get remote ETag (MD5) from S3 head-object
        local remote_etag
        remote_etag=$(aws --endpoint-url "$S3_ENDPOINT" --region decentralized \
            s3api head-object --bucket "$BUCKET" --key "$S3_PREFIX/$rel_path" \
            --query ETag --output text 2>/dev/null | tr -d '"' || echo "")

        if [ -z "$remote_etag" ]; then
            ((skipped++))
            continue
        fi

        # Normalize: stored checksums are md5, ETags are md5 (for non-multipart)
        # If stored checksum matches remote ETag, nothing changed remotely
        if [ "$remote_etag" = "$stored" ]; then
            ((skipped++))
            continue
        fi

        # Remote has changed. Check local state.
        if [ -f "$local_file" ]; then
            local local_md5
            local_md5=$(file_md5 "$local_file")

            if [ "$local_md5" != "$stored" ] && [ -n "$stored" ]; then
                # CONFLICT: Both local and remote changed since last sync
                local conflict_file="${local_file%.md}.conflict.md"
                echo "  ⚠ CONFLICT: $rel_path"
                echo "    Local changed (md5: $local_md5) and remote changed (etag: $remote_etag)"
                echo "    Downloading remote version to: $(basename "$conflict_file")"

                # Download remote version as .conflict.md
                mkdir -p "$(dirname "$conflict_file")"
                s3cmd cp "s3://$BUCKET/$S3_PREFIX/$rel_path" "$conflict_file" >/dev/null
                # Prepend conflict header
                local tmp
                tmp=$(mktemp)
                echo "<!-- CONFLICT: Remote version from S3 ($(date -u +%Y-%m-%dT%H:%M:%SZ)). Review and merge with $(basename "$local_file"), then delete this file. -->" > "$tmp"
                cat "$conflict_file" >> "$tmp"
                mv "$tmp" "$conflict_file"
                ((conflicts++))
            else
                # Only remote changed — safe to pull
                mkdir -p "$(dirname "$local_file")"
                s3cmd cp "s3://$BUCKET/$S3_PREFIX/$rel_path" "$local_file" >/dev/null
                update_checksum "$rel_path" "$remote_etag"
                echo "  ↓ $rel_path"
                ((pulled++))
            fi
        else
            # New file from remote — download
            mkdir -p "$(dirname "$local_file")"
            s3cmd cp "s3://$BUCKET/$S3_PREFIX/$rel_path" "$local_file" >/dev/null
            update_checksum "$rel_path" "$remote_etag"
            echo "  ↓ $rel_path (new)"
            ((pulled++))
        fi
    done <<< "$s3_listing"

    date -u +"%Y-%m-%dT%H:%M:%SZ" > "$LAST_SYNC_FILE"
    echo "Pull complete: $pulled downloaded, $conflicts conflicts, $skipped unchanged"

    if [ "$conflicts" -gt 0 ]; then
        echo ""
        echo "⚠ $conflicts conflict(s) detected. Review .conflict.md files in Obsidian."
    fi
}
```

Also update the `pull` case in `main`:
```bash
        pull)
            validate_credentials
            init_sync_state
            do_pull
            ;;
```

**Step 2: Test pull (should be no-op after push)**

```bash
source ~/Projects/openclaw-bittensor/extensions/basilica/.env 2>/dev/null
./scripts/sync-vault.sh pull
```

Expected: `Pull complete: 0 downloaded, 0 conflicts, N unchanged`

**Step 3: Test conflict detection**

Create a test scenario:
```bash
# Modify a local file
echo "<!-- local edit -->" >> ~/Obsidian/synapz-ops/agents/synapz/status.md
# Upload a different version to S3 directly
echo "remote edit" | AWS_ACCESS_KEY_ID="$HIPPIUS_S3_ACCESS_KEY" AWS_SECRET_ACCESS_KEY="$HIPPIUS_S3_SECRET_KEY" \
  aws --endpoint-url https://s3.hippius.com --region decentralized \
  s3 cp - "s3://synapz-state/vault/agents/synapz/status.md"
# Now pull — should detect conflict
./scripts/sync-vault.sh pull
```

Expected: `⚠ CONFLICT: agents/synapz/status.md` and a `.conflict.md` file created.

**Step 4: Clean up test conflict**

```bash
# Restore original status.md from git
cd ~/Obsidian/synapz-ops && git checkout agents/synapz/status.md
rm -f agents/synapz/status.conflict.md
# Re-push clean version
cd ~/Projects/synapz-agent && ./scripts/sync-vault.sh push
```

**Step 5: Commit**

```bash
cd /Users/dwbarnes/Projects/synapz-agent && git add scripts/sync-vault.sh && git commit -m "feat: add pull subcommand with conflict detection"
```

---

### Task 4: Add watch and stop subcommands

**Files:**
- Modify: `/Users/dwbarnes/Projects/synapz-agent/scripts/sync-vault.sh`

**Step 1: Add watch and stop functions**

Replace the watch and stop placeholders. Add these functions before `main`:

```bash
# --- Watch: Auto-sync daemon ---
do_watch() {
    if ! command -v fswatch &>/dev/null; then
        echo "Error: fswatch not found. Install with: brew install fswatch"
        exit 1
    fi

    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "Watch is already running (PID $(cat "$PID_FILE"))"
        echo "Stop with: $0 stop"
        exit 1
    fi

    echo "Starting vault sync watcher..."
    echo "  Vault: $VAULT_PATH"
    echo "  S3:    s3://$BUCKET/$S3_PREFIX/"
    echo "  Push:  on file change (${DEBOUNCE_SECONDS}s debounce)"
    echo "  Pull:  every ${PULL_INTERVAL}s"
    echo ""

    # Initial sync
    do_push
    do_pull
    echo ""
    echo "Watching for changes... (Ctrl+C to stop)"

    # Write PID
    echo $$ > "$PID_FILE"

    # Trap to clean up PID file on exit
    trap 'rm -f "$PID_FILE"; echo ""; echo "Watch stopped."; exit 0' INT TERM

    # Build fswatch exclude args
    local exclude_args=()
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        exclude_args+=(--exclude "$pattern")
    done

    # Start fswatch in background — debounced push on local changes
    fswatch -o -l "$DEBOUNCE_SECONDS" "${exclude_args[@]}" "$VAULT_PATH" | while read -r _count; do
        echo "[$(date +%H:%M:%S)] Local changes detected, pushing..."
        do_push
    done &
    local FSWATCH_PID=$!

    # Periodic pull loop in foreground
    while true; do
        sleep "$PULL_INTERVAL"
        echo "[$(date +%H:%M:%S)] Checking for remote changes..."
        do_pull
    done

    # Cleanup (shouldn't reach here normally)
    kill "$FSWATCH_PID" 2>/dev/null
    rm -f "$PID_FILE"
}

# --- Stop: Kill watch daemon ---
do_stop() {
    if [ ! -f "$PID_FILE" ]; then
        echo "No watch daemon running (no PID file)"
        exit 0
    fi

    local pid
    pid=$(cat "$PID_FILE")

    if kill -0 "$pid" 2>/dev/null; then
        kill "$pid"
        rm -f "$PID_FILE"
        echo "Watch daemon stopped (PID $pid)"
    else
        rm -f "$PID_FILE"
        echo "Watch daemon was not running (stale PID file removed)"
    fi
}
```

Update the main cases:
```bash
        watch)
            validate_credentials
            init_sync_state
            do_watch
            ;;
        stop)
            do_stop
            ;;
```

**Step 2: Test watch start (Ctrl+C after verifying)**

```bash
source ~/Projects/openclaw-bittensor/extensions/basilica/.env 2>/dev/null
./scripts/sync-vault.sh watch
```

Expected: initial push/pull, then "Watching for changes..." message. Ctrl+C to stop.

**Step 3: Test that PID file was cleaned up**

```bash
ls ~/Obsidian/synapz-ops/.sync-state/watch.pid 2>/dev/null && echo "PID file exists (bad)" || echo "PID file cleaned up (good)"
```

**Step 4: Commit**

```bash
cd /Users/dwbarnes/Projects/synapz-agent && git add scripts/sync-vault.sh && git commit -m "feat: add watch and stop subcommands for auto-sync"
```

---

### Task 5: Add status subcommand and .gitignore updates

**Files:**
- Modify: `/Users/dwbarnes/Projects/synapz-agent/scripts/sync-vault.sh`
- Modify: `/Users/dwbarnes/Obsidian/synapz-ops/.gitignore`

**Step 1: Add status function**

Replace the status placeholder:

```bash
# --- Status: Show sync state ---
do_status() {
    echo "Vault Sync Status"
    echo "================="
    echo "  Vault:  $VAULT_PATH"
    echo "  S3:     s3://$BUCKET/$S3_PREFIX/"
    echo ""

    # Last sync time
    if [ -f "$LAST_SYNC_FILE" ]; then
        echo "  Last sync: $(cat "$LAST_SYNC_FILE")"
    else
        echo "  Last sync: never"
    fi

    # Watch daemon status
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "  Watcher:   running (PID $(cat "$PID_FILE"))"
    else
        echo "  Watcher:   not running"
    fi

    # Tracked files count
    if [ -f "$CHECKSUMS_FILE" ]; then
        local count
        count=$(jq 'length' "$CHECKSUMS_FILE")
        echo "  Tracked:   $count files"
    else
        echo "  Tracked:   0 files (no sync state)"
    fi

    # Check for conflicts
    local conflicts
    conflicts=$(find "$VAULT_PATH" -name "*.conflict.md" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$conflicts" -gt 0 ]; then
        echo ""
        echo "  ⚠ $conflicts unresolved conflict(s):"
        find "$VAULT_PATH" -name "*.conflict.md" -exec echo "    {}" \;
    fi
}
```

Update the main case:
```bash
        status)
            init_sync_state
            do_status
            ;;
```

**Step 2: Update vault .gitignore**

Add `.sync-state/` and `*.conflict.md` to `/Users/dwbarnes/Obsidian/synapz-ops/.gitignore`:

```
.obsidian/workspace.json
.obsidian/workspace-mobile.json
.obsidian/hotkeys.json
.obsidian/plugins/
.obsidian/themes/
.trash/
.sync-state/
*.conflict.md
```

**Step 3: Test status**

```bash
./scripts/sync-vault.sh status
```

Expected: shows vault path, S3 path, last sync time, watcher status, tracked file count.

**Step 4: Commit both repos**

```bash
cd /Users/dwbarnes/Projects/synapz-agent && git add scripts/sync-vault.sh && git commit -m "feat: add status subcommand"
cd /Users/dwbarnes/Obsidian/synapz-ops && git add .gitignore && git commit -m "chore: add .sync-state and .conflict.md to gitignore"
```

---

### Task 6: End-to-end test and documentation

**Step 1: Full push-pull-watch cycle test**

```bash
source ~/Projects/openclaw-bittensor/extensions/basilica/.env 2>/dev/null
cd /Users/dwbarnes/Projects/synapz-agent

# Clean slate
rm -rf ~/Obsidian/synapz-ops/.sync-state

# Push all files
./scripts/sync-vault.sh push

# Verify on S3
AWS_ACCESS_KEY_ID="$HIPPIUS_S3_ACCESS_KEY" AWS_SECRET_ACCESS_KEY="$HIPPIUS_S3_SECRET_KEY" \
  aws --endpoint-url https://s3.hippius.com --region decentralized \
  s3 ls s3://synapz-state/vault/ --recursive | wc -l

# Pull (should be no-op)
./scripts/sync-vault.sh pull

# Status
./scripts/sync-vault.sh status
```

**Step 2: Commit design docs**

```bash
cd /Users/dwbarnes/Projects/synapz-agent && git add docs/plans/ && git commit -m "docs: add vault sync design doc and implementation plan"
```

---

## Post-Implementation Checklist

- [ ] `fswatch` installed
- [ ] `sync-vault.sh push` uploads vault files to `s3://synapz-state/vault/`
- [ ] `sync-vault.sh pull` downloads remote changes with conflict detection
- [ ] `sync-vault.sh watch` starts auto-sync daemon
- [ ] `sync-vault.sh stop` stops the daemon
- [ ] `sync-vault.sh status` shows sync state
- [ ] Conflict detection creates `.conflict.md` files
- [ ] `.sync-state/` and `*.conflict.md` excluded from git
- [ ] No interference with Obsidian Sync

**Next:** Phase 3 — Update Synapz on Basilica to read/write tasks directly to `s3://synapz-state/vault/tasks/`.
