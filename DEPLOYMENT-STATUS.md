# Deployment Status

Last updated: 2026-02-05

## Current State: Running Locally

Synapz runs as a Docker container on the local machine.

```bash
docker start synapz-agent    # Start
docker stop synapz-agent     # Stop
docker logs synapz-agent     # View logs
```

Port 18790 (host) -> 18789 (container)

## Docker Image

- **Image**: `dwbarnes/synapz-agent:v7` (Docker Hub, amd64)
- **Source**: `openclaw-bittensor/extensions/basilica/`
- **Base**: `node:22-bookworm` + OpenClaw + Chromium
- **Includes**: mDNS/ciao K8s hostname patch (see below)

## Basilica Deployment: Blocked

### What works

- Container builds and runs on Basilica Summons tier
- Health checks pass (Replicas: 1/1, Phase: ready)
- mDNS/ciao crash fixed by patching `DNSLabelCoder.js` in Dockerfile
- Deployment ID was `5b341659-c451-479f-829f-4fddf4415792` (deleted)

### What's blocked

**Basilica Summons has no outbound internet access.** All `fetch()` calls fail with `TypeError: fetch failed`. This affects:

- Telegram Bot API (api.telegram.org)
- Chutes inference API (claude.chutes.ai)
- Moltbook API

This was confirmed with both the custom `dwbarnes/synapz-agent:v7` image AND the stock `basilica deploy openclaw` command. It's a platform-level restriction, not an image issue.

### Citadel (GPU rental) is too expensive

All Citadel offerings are GPU instances. Cheapest is A100 at $0.50/hr (~$360/month). Synapz only needs CPU + network access.

## Questions for Basilica Support

1. **Is outbound internet planned for Summons?** The container tier is unusable for agents that need external APIs (Telegram, LLM inference, etc.).
2. **Are CPU-only Citadel offerings planned?** A cheap CPU instance with networking would be perfect for always-on agents.
3. **Is there a workaround?** Any way to enable egress for Summons containers, even if limited to specific domains?

## Known Issues and Fixes

### mDNS/ciao 63-byte DNS Label Crash

OpenClaw uses `@homebridge/ciao` for mDNS discovery. In Kubernetes, pod hostnames exceed the 63-byte DNS label limit, causing `AssertionError` crash. Fix is applied in the Dockerfile:

```dockerfile
RUN CIAO_FILE=$(find /usr/local/lib/node_modules/openclaw -path "*/ciao/lib/coder/DNSLabelCoder.js" -type f) && \
    if [ -n "$CIAO_FILE" ]; then \
        sed -i 's/(0, assert_1.default)(byteLength <= 63, ...)/if (byteLength > 63) { label = label.substring(0, 63); }/g' "$CIAO_FILE"; \
    fi
```

This MUST be applied after every `npm install -g openclaw@latest`.

## To Resume Basilica Deployment

1. Get answers to the support questions above
2. If egress is enabled: `basilica deploy dwbarnes/synapz-agent:v7 --name synapz -p 18789 --health-path /health --env-file .env`
3. If CPU Citadel becomes available: rent a CPU instance and run the Docker image there
4. Basilica account balance: ~9,758 credits
