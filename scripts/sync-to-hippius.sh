#!/bin/bash
# Sync synapz workspace state to Hippius (SN75)
# Requires: hipc CLI installed and configured

set -e

# Source Hippius environment
if [ -f ~/.hippius/.env ]; then
    source ~/.hippius/.env
fi

WORKSPACE_DIR="$(dirname "$0")/.."
STATE_HISTORY="$WORKSPACE_DIR/state-history.json"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "Syncing synapz workspace to Hippius..."

# Create tarball of current state
TARBALL="/tmp/synapz-state-$TIMESTAMP.tar.gz"
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

# Upload to Hippius IPFS
echo "Uploading to Hippius..."
UPLOAD_OUTPUT=$(hipc upload-to-ipfs "$TARBALL" 2>&1)
echo "$UPLOAD_OUTPUT"

# Extract CID (handles both Qm... and bafy... formats)
CID=$(echo "$UPLOAD_OUTPUT" | grep -oE '"Hash":"[^"]+"' | head -1 | sed 's/"Hash":"//;s/"//')

if [ -z "$CID" ]; then
    echo "Error: Failed to get CID from Hippius upload"
    exit 1
fi

echo "Uploaded! CID: $CID"

# Update state history
if [ ! -f "$STATE_HISTORY" ]; then
    echo "[]" > "$STATE_HISTORY"
fi

# Append new entry (using jq if available, otherwise simple append)
if command -v jq &> /dev/null; then
    jq --arg ts "$TIMESTAMP" --arg cid "$CID" \
        '. + [{"timestamp": $ts, "cid": $cid}]' \
        "$STATE_HISTORY" > "$STATE_HISTORY.tmp" && mv "$STATE_HISTORY.tmp" "$STATE_HISTORY"
else
    echo "Warning: jq not installed, appending raw entry"
    echo "{\"timestamp\": \"$TIMESTAMP\", \"cid\": \"$CID\"}" >> "$STATE_HISTORY.raw"
fi

# Cleanup
rm -f "$TARBALL"

echo "State synced successfully!"
echo "CID: $CID"
echo "Gateway URL: https://ipfs.io/ipfs/$CID"
