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

init_sync_state() {
    mkdir -p "$SYNC_STATE_DIR"
    if [ ! -f "$CHECKSUMS_FILE" ]; then
        echo '{}' > "$CHECKSUMS_FILE"
    fi
    # Add .sync-state to vault .gitignore if not already there
    if ! grep -q "^\.sync-state/" "$VAULT_PATH/.gitignore" 2>/dev/null; then
        echo ".sync-state/" >> "$VAULT_PATH/.gitignore"
    fi
}

should_exclude() {
    local rel_path="$1"
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        case "$rel_path" in
            ${pattern}|${pattern}/*|*/${pattern}|*/${pattern}/*|*.conflict.md)
                return 0 ;;
        esac
    done
    return 1
}

file_md5() {
    md5 -q "$1" 2>/dev/null || md5sum "$1" 2>/dev/null | awk '{print $1}'
}

stored_checksum() {
    local rel_path="$1"
    jq -r --arg p "$rel_path" '.[$p] // ""' "$CHECKSUMS_FILE"
}

update_checksum() {
    local rel_path="$1"
    local checksum="$2"
    local tmp
    tmp=$(mktemp)
    jq --arg p "$rel_path" --arg c "$checksum" '.[$p] = $c' "$CHECKSUMS_FILE" > "$tmp" \
        && mv "$tmp" "$CHECKSUMS_FILE"
}

remove_checksum() {
    local rel_path="$1"
    local tmp
    tmp=$(mktemp)
    jq --arg p "$rel_path" 'del(.[$p])' "$CHECKSUMS_FILE" > "$tmp" \
        && mv "$tmp" "$CHECKSUMS_FILE"
}

s3cmd() {
    aws --endpoint-url "$S3_ENDPOINT" --region decentralized s3 "$@"
}

s3api() {
    aws --endpoint-url "$S3_ENDPOINT" --region decentralized s3api "$@"
}

# --- Push: Local -> S3 ---
do_push() {
    echo "Pushing local changes to S3..."
    local pushed=0
    local skipped=0
    local deleted=0

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
                ((pushed++)) || true
            else
                echo "  ✗ Failed to push: $rel_path"
            fi
        else
            ((skipped++)) || true
        fi
    done < <(find "$VAULT_PATH" -type f -not -path "*/.git/*" -print0)

    # Check for deleted files (in checksums but not on disk)
    for rel_path in $(jq -r 'keys[]' "$CHECKSUMS_FILE"); do
        if [ ! -f "$VAULT_PATH/$rel_path" ] && ! should_exclude "$rel_path"; then
            local s3_key="$S3_PREFIX/$rel_path"
            if s3cmd rm "s3://$BUCKET/$s3_key" >/dev/null 2>&1; then
                remove_checksum "$rel_path"
                echo "  ✗ Deleted from S3: $rel_path"
                ((deleted++)) || true
            fi
        fi
    done

    date -u +"%Y-%m-%dT%H:%M:%SZ" > "$LAST_SYNC_FILE"
    echo "Push complete: $pushed uploaded, $skipped unchanged, $deleted deleted"
}

# --- Pull: S3 -> Local ---
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
        remote_etag=$(s3api head-object --bucket "$BUCKET" --key "$S3_PREFIX/$rel_path" \
            --query ETag --output text 2>/dev/null | tr -d '"' || echo "")

        if [ -z "$remote_etag" ]; then
            ((skipped++)) || true
            continue
        fi

        # If stored checksum matches remote ETag, nothing changed remotely
        if [ "$remote_etag" = "$stored" ]; then
            ((skipped++)) || true
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

                # Download remote version as .conflict.md
                mkdir -p "$(dirname "$conflict_file")"
                s3cmd cp "s3://$BUCKET/$S3_PREFIX/$rel_path" "$conflict_file" >/dev/null
                # Prepend conflict header
                local tmp
                tmp=$(mktemp)
                printf '%s\n' "<!-- CONFLICT: Remote version from S3 ($(date -u +%Y-%m-%dT%H:%M:%SZ)). Review and merge with $(basename "$local_file"), then delete this file. -->" > "$tmp"
                cat "$conflict_file" >> "$tmp"
                mv "$tmp" "$conflict_file"
                ((conflicts++)) || true
            else
                # Only remote changed -- safe to pull
                mkdir -p "$(dirname "$local_file")"
                s3cmd cp "s3://$BUCKET/$S3_PREFIX/$rel_path" "$local_file" >/dev/null
                update_checksum "$rel_path" "$remote_etag"
                echo "  ↓ $rel_path"
                ((pulled++)) || true
            fi
        else
            # New file from remote -- download
            mkdir -p "$(dirname "$local_file")"
            s3cmd cp "s3://$BUCKET/$S3_PREFIX/$rel_path" "$local_file" >/dev/null
            update_checksum "$rel_path" "$remote_etag"
            echo "  ↓ $rel_path (new)"
            ((pulled++)) || true
        fi
    done <<< "$s3_listing"

    date -u +"%Y-%m-%dT%H:%M:%SZ" > "$LAST_SYNC_FILE"
    echo "Pull complete: $pulled downloaded, $conflicts conflicts, $skipped unchanged"

    if [ "$conflicts" -gt 0 ]; then
        echo ""
        echo "⚠ $conflicts conflict(s) detected. Review .conflict.md files in Obsidian."
    fi
}

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

    # Build fswatch exclude regex
    local exclude_regex=""
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        if [ -n "$exclude_regex" ]; then
            exclude_regex="$exclude_regex|"
        fi
        exclude_regex="$exclude_regex$pattern"
    done
    exclude_regex="($exclude_regex|\.conflict\.md)"

    # Start fswatch in background -- debounced push on local changes
    fswatch -o -l "$DEBOUNCE_SECONDS" --exclude "$exclude_regex" "$VAULT_PATH" | while read -r _count; do
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

# --- Status: Show sync state ---
do_status() {
    echo "Vault Sync Status"
    echo "================="
    echo "  Vault:  $VAULT_PATH"
    echo "  S3:     s3://$BUCKET/$S3_PREFIX/"
    echo ""

    if [ -f "$LAST_SYNC_FILE" ]; then
        echo "  Last sync: $(cat "$LAST_SYNC_FILE")"
    else
        echo "  Last sync: never"
    fi

    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "  Watcher:   running (PID $(cat "$PID_FILE"))"
    else
        echo "  Watcher:   not running"
    fi

    if [ -f "$CHECKSUMS_FILE" ]; then
        local count
        count=$(jq 'length' "$CHECKSUMS_FILE")
        echo "  Tracked:   $count files"
    else
        echo "  Tracked:   0 files (no sync state)"
    fi

    local conflicts
    conflicts=$(find "$VAULT_PATH" -name "*.conflict.md" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$conflicts" -gt 0 ]; then
        echo ""
        echo "  !! $conflicts unresolved conflict(s):"
        find "$VAULT_PATH" -name "*.conflict.md" -exec echo "    {}" \;
    fi
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
            validate_credentials
            init_sync_state
            do_pull
            ;;
        watch)
            validate_credentials
            init_sync_state
            do_watch
            ;;
        status)
            init_sync_state
            do_status
            ;;
        stop)
            do_stop
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
