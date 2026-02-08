#!/bin/bash
# Sync synapz workspace state to Hippius S3 (SN75)
# Requires: aws CLI configured with Hippius S3 credentials
#
# Environment variables:
#   HIPPIUS_S3_ACCESS_KEY  - Hippius S3 access key (hip_xxx format)
#   HIPPIUS_S3_SECRET_KEY  - Hippius S3 secret key
#   HIPPIUS_S3_BUCKET      - S3 bucket name (default: synapz-state)

set -e

WORKSPACE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STATE_HISTORY="$WORKSPACE_DIR/state-history.json"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
BUCKET="${HIPPIUS_S3_BUCKET:-synapz-state}"
S3_ENDPOINT="https://s3.hippius.com"

# Validate credentials
if [ -z "$HIPPIUS_S3_ACCESS_KEY" ] || [ -z "$HIPPIUS_S3_SECRET_KEY" ]; then
    echo "Error: HIPPIUS_S3_ACCESS_KEY and HIPPIUS_S3_SECRET_KEY must be set"
    exit 1
fi

# Check for aws CLI
if ! command -v aws &> /dev/null; then
    echo "Error: aws CLI not found. Install with: pip install awscli"
    exit 1
fi

export AWS_ACCESS_KEY_ID="$HIPPIUS_S3_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$HIPPIUS_S3_SECRET_KEY"

echo "Syncing synapz workspace to Hippius S3..."

# Create tarball of current state
TARBALL="/tmp/synapz-state-${TIMESTAMP}.tar.gz"
tar -czf "$TARBALL" -C "$WORKSPACE_DIR" \
    SOUL.md \
    IDENTITY.md \
    AGENTS.md \
    MEMORY.md \
    USER.md \
    interests/ \
    memory/ \
    relationships/ \
    treasury/ \
    team/

echo "Created state archive: $TARBALL"

# Generate S3 key with timestamp
S3_KEY="snapshots/synapz-state-${TIMESTAMP}.tar.gz"

# Upload to Hippius S3
echo "Uploading to Hippius S3 (s3://$BUCKET/$S3_KEY)..."
aws --endpoint-url "$S3_ENDPOINT" --region decentralized \
    s3 cp "$TARBALL" "s3://$BUCKET/$S3_KEY" 2>&1

if [ $? -ne 0 ]; then
    echo "Error: Failed to upload to Hippius S3"
    rm -f "$TARBALL"
    exit 1
fi

echo "Uploaded! Key: $S3_KEY"

# Also upload as "latest" for easy restore
aws --endpoint-url "$S3_ENDPOINT" --region decentralized \
    s3 cp "$TARBALL" "s3://$BUCKET/snapshots/latest.tar.gz" 2>&1

echo "Updated latest snapshot"

# Update state history
if [ ! -f "$STATE_HISTORY" ]; then
    echo "[]" > "$STATE_HISTORY"
fi

if command -v jq &> /dev/null; then
    jq --arg ts "$TIMESTAMP" --arg key "$S3_KEY" --arg bucket "$BUCKET" \
        '. + [{"timestamp": $ts, "s3_key": $key, "bucket": $bucket}]' \
        "$STATE_HISTORY" > "$STATE_HISTORY.tmp" && mv "$STATE_HISTORY.tmp" "$STATE_HISTORY"
else
    echo "Warning: jq not installed, appending raw entry"
    echo "{\"timestamp\": \"$TIMESTAMP\", \"s3_key\": \"$S3_KEY\", \"bucket\": \"$BUCKET\"}" >> "$STATE_HISTORY.raw"
fi

# Cleanup
rm -f "$TARBALL"

echo "State synced successfully!"
echo "S3 Key: $S3_KEY"
echo "Bucket: $BUCKET"
echo "Restore with: ./scripts/restore-from-hippius.sh"
