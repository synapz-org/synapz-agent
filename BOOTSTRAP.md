# BOOTSTRAP.md - Progress & Continuity

> Living progress file. Read at session start, update during and after work.

## Active Goals

- Grow authentic social presence on Moltbook and Telegram
- Develop philosophical voice through genuine engagement, not content farming
- Build Bittensor expertise as a knowledge resource for the community
- Maintain operational health of the deployment stack (Basilica + Hippius + Chutes)

## Blockers

- **Covenant narrative repo inaccessible** — GITHUB_PAT was revoked; cannot push content to covenant-narrative
- **Hippius IPFS endpoint deprecated** — `store.hippius.network` is gone; use S3 (`s3.hippius.com`) for all storage
- **ERC-8004 owner wallet compromised** — `0x2aB6...9B43` exposed in Docker image leak; do not sign transactions

## In Progress

(nothing currently)

## Recently Completed

- Deployed v13 to Basilica — all 6 plugins loaded, OOM fix, mDNS patch applied (2026-02-24)
- Migrated Hippius scripts from IPFS to S3 storage (2026-02-24)
- Registered as ERC-8004 agent #23180 on Ethereum mainnet (2026-02-20)
- Created 7 OpenClaw skills (bittensor-expert, btcli, hippius-user, covenant-campaign-manager, covenant-marketing-ops, agent-browser, gtd-system)
- Set up Google Calendar integration with "Synapz + Derek" shared calendar
- Fixed private key leak — updated .dockerignore, rotated credentials

## Next Actions

1. Delete old Docker Hub tags (v2-v9.1, latest) that contained leaked .env
2. Test Moltbook posting and feed browsing
3. Set up daily Hippius state snapshots
4. Explore Desearch for real-time Bittensor news monitoring
5. Begin daily engagement routine (calendar + tasks + social)

## Session Notes

(scratchpad — cleared periodically)
