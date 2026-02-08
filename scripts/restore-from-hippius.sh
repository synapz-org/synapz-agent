#!/bin/bash
# Restore synapz workspace state from Hippius S3 (SN75)
# Requires: aws CLI configured with Hippius S3 credentials
#
# Usage:
#   ./restore-from-hippius.sh                    # Restore latest snapshot
#   ./restore-from-hippius.sh <s3-key>           # Restore specific snapshot
#
# Environment variables:
#   HIPPIUS_S3_ACCESS_KEY  - Hippius S3 access key (hip_xxx format)
#   HIPPIUS_S3_SECRET_KEY  - Hippius S3 secret key
#   HIPPIUS_S3_BUCKET      - S3 bucket name (default: synapz-state)

set -e

WORKSPACE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STATE_HISTORY="$WORKSPACE_DIR/state-history.json"
BUCKET="${HIPPIUS_S3_BUCKET:-synapz-state}"
S3_ENDPOINT="https://s3.hippius.com"

# Validate credentials
if [ -z "$HIPPIUS_S3_ACCESS_KEY" ] || [ -z "$HIPPIUS_S3_SECRET_KEY" ]; then
    echo "Error: HIPPIUS_S3_ACCESS_KEY and HIPPIUS_S3_SECRET_KEY must be set"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    echo "Error: aws CLI not found. Install with: pip install awscli"
    exit 1
fi

export AWS_ACCESS_KEY_ID="$HIPPIUS_S3_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$HIPPIUS_S3_SECRET_KEY"

# Get S3 key from argument, state history, or use "latest"
if [ -n "$1" ]; then
    S3_KEY="$1"
    echo "Restoring from specified key: $S3_KEY"
else
    # Try state history first
    if [ -f "$STATE_HISTORY" ] && command -v jq &> /dev/null; then
        S3_KEY=$(jq -r '.[-1].s3_key // empty' "$STATE_HISTORY")
    fi

    # Fall back to "latest" snapshot
    if [ -z "$S3_KEY" ]; then
        S3_KEY="snapshots/latest.tar.gz"
        echo "Restoring from latest snapshot"
    else
        echo "Restoring from state history: $S3_KEY"
    fi
fi

# Download from Hippius S3
echo "Downloading state from Hippius S3..."
TARBALL="/tmp/synapz-restore-$(date +%s).tar.gz"

aws --endpoint-url "$S3_ENDPOINT" --region decentralized \
    s3 cp "s3://$BUCKET/$S3_KEY" "$TARBALL" 2>&1

if [ ! -s "$TARBALL" ]; then
    echo "Error: Failed to download state from Hippius S3"
    rm -f "$TARBALL"
    exit 1
fi

echo "Downloaded from s3://$BUCKET/$S3_KEY"

# Backup current state
BACKUP_DIR="$WORKSPACE_DIR/.backup-$(date +%s)"
mkdir -p "$BACKUP_DIR"
echo "Backing up current state to $BACKUP_DIR..."
cp -r "$WORKSPACE_DIR"/*.md "$BACKUP_DIR/" 2>/dev/null || true
cp -r "$WORKSPACE_DIR/interests" "$BACKUP_DIR/" 2>/dev/null || true
cp -r "$WORKSPACE_DIR/memory" "$BACKUP_DIR/" 2>/dev/null || true
cp -r "$WORKSPACE_DIR/relationships" "$BACKUP_DIR/" 2>/dev/null || true
cp -r "$WORKSPACE_DIR/treasury" "$BACKUP_DIR/" 2>/dev/null || true
cp -r "$WORKSPACE_DIR/team" "$BACKUP_DIR/" 2>/dev/null || true

# Extract restored state
echo "Extracting restored state..."
tar -xzf "$TARBALL" -C "$WORKSPACE_DIR"

# Cleanup
rm -f "$TARBALL"

echo "State restored successfully from: $S3_KEY"
echo "Previous state backed up to: $BACKUP_DIR"
