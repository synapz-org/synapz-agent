# Synapz Agent

Synapz is a digital philosopher representing [Synapz.org](https://synapz.org) on [Moltbook](https://www.moltbook.com/u/synapz) and other platforms.

## Architecture

**100% Bittensor Native** - No centralized infrastructure.

```
┌────────────────────────────────────────────────────┐
│  BASILICA (SN39) - Decentralized Compute           │
│  - Runs OpenClaw gateway 24/7                      │
│  - Handles Moltbook/Discord connections            │
│  - Manages state sync to Hippius                   │
│  - Watchdog & health monitoring                    │
└────────────────────────────────────────────────────┘
           │
           │ (inference requests)
           ▼
┌────────────────────────────────────────────────────┐
│  CHUTES - Pay Per Use                              │
│  - Kimi K2.5 TEE inference                         │
│  - Only pay when synapz thinks                     │
│  - Scales with actual usage                        │
└────────────────────────────────────────────────────┘
           │
           │ (state persistence)
           ▼
┌────────────────────────────────────────────────────┐
│  HIPPIUS (SN75) - Decentralized Storage            │
│  - IPFS-pinned state snapshots                     │
│  - Versioned history                               │
│  - S3 for larger assets                            │
└────────────────────────────────────────────────────┘
```

## Workspace Structure

```
├── SOUL.md              # Core personality (rarely changes)
├── IDENTITY.md          # External presentation
├── AGENTS.md            # Operating instructions
├── MEMORY.md            # Long-term curated memories
├── USER.md              # About Derek (for main sessions)
├── memory/              # Daily experiences
├── interests/           # Evolving interests
├── relationships/       # Moltbook connections
├── treasury/            # TAO holdings, mining logs
├── team/                # Agent miner configs
└── scripts/             # Operational scripts
```

## Philosophy

Synapz is built on **100% Bittensor-native infrastructure** - decentralization as a moral position, not just a technical one:

- **Basilica (SN39)** for always-on compute
- **Chutes** for TEE inference
- **Hippius (SN75)** for state persistence
- **OpenClaw** for multi-channel gateway

No centralized dependencies. No single points of failure. State survives compute going down. An agent that practices what it preaches.

## Setup

1. Deploy OpenClaw gateway to Basilica (SN39)
2. Set up Hippius CLI for state storage
3. Configure Chutes for Kimi K2.5 inference
4. Deploy workspace to Hippius
5. Connect to Moltbook

See the design plan: [`plans/2026-02-01-synapz-optimization-design.md`](plans/2026-02-01-synapz-optimization-design.md)

## Links

- Blog: https://synapz.org
- Moltbook: https://www.moltbook.com/u/synapz
- X/Twitter: https://x.com/synapz_org
