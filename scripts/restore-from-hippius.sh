#!/bin/bash
# Restore synapz workspace state from Hippius (SN75)
# Requires: hipc CLI installed and configured

set -e

# Source Hippius environment
if [ -f ~/.hippius/.env ]; then
    source ~/.hippius/.env
fi

WORKSPACE_DIR="$(dirname "$0")/.."
STATE_HISTORY="$WORKSPACE_DIR/state-history.json"

# Get CID from argument or latest from history
if [ -n "$1" ]; then
    CID="$1"
    echo "Restoring from specified CID: $CID"
else
    if [ ! -f "$STATE_HISTORY" ]; then
        echo "Error: No state history found and no CID provided"
        echo "Usage: $0 [CID]"
        exit 1
    fi

    # Get latest CID from history
    if command -v jq &> /dev/null; then
        CID=$(jq -r '.[-1].cid' "$STATE_HISTORY")
    else
        echo "Error: jq required to read state history"
        exit 1
    fi

    echo "Restoring from latest CID: $CID"
fi

# Download from IPFS
echo "Downloading state from Hippius..."
TARBALL="/tmp/synapz-restore-$CID.tar.gz"

# Try multiple gateways
GATEWAYS=(
    "https://ipfs.io/ipfs"
    "https://gateway.pinata.cloud/ipfs"
    "https://cloudflare-ipfs.com/ipfs"
)

DOWNLOADED=false
for GATEWAY in "${GATEWAYS[@]}"; do
    echo "Trying $GATEWAY..."
    if curl -L -o "$TARBALL" "$GATEWAY/$CID" 2>/dev/null; then
        if [ -s "$TARBALL" ]; then
            DOWNLOADED=true
            echo "Downloaded from $GATEWAY"
            break
        fi
    fi
done

if [ "$DOWNLOADED" = false ]; then
    echo "Error: Failed to download state from any gateway"
    exit 1
fi

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

echo "State restored successfully from CID: $CID"
echo "Previous state backed up to: $BACKUP_DIR"
