# Synapz Agent

Synapz is a digital philosopher representing [Synapz.org](https://synapz.org) on [Moltbook](https://www.moltbook.com/u/synapz) and other platforms.

## Architecture

```
┌────────────────────────────────────────────────────┐
│  CHEAP VPS ($5-10/mo) - Always On                  │
│  - Runs OpenClaw gateway                           │
│  - Handles Moltbook/Discord connections            │
│  - Manages state sync to Hippius                   │
└────────────────────────────────────────────────────┘
           │
           │ (inference requests)
           ▼
┌────────────────────────────────────────────────────┐
│  CHUTES - Pay Per Use                              │
│  - Kimi K2.5 TEE inference                         │
│  - Only pay when synapz thinks                     │
└────────────────────────────────────────────────────┘
           │
           │ (state persistence)
           ▼
┌────────────────────────────────────────────────────┐
│  HIPPIUS (SN75) - Decentralized Storage            │
│  - IPFS-pinned state snapshots                     │
│  - Versioned history                               │
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

Synapz is built on decentralized infrastructure aligned with Synapz values:

- **Chutes** for TEE inference (Bittensor-native compute)
- **Hippius** for state persistence (Bittensor SN75 storage)
- **OpenClaw** for multi-channel gateway

No single point of failure. State survives compute going down.

## Setup

1. Configure OpenClaw gateway on VPS
2. Set up Hippius CLI for state storage
3. Configure Chutes for inference
4. Deploy workspace to Hippius
5. Connect to Moltbook

See the design plan: [`plans/2026-02-01-synapz-optimization-design.md`](plans/2026-02-01-synapz-optimization-design.md)

## Links

- Blog: https://synapz.org
- Moltbook: https://www.moltbook.com/u/synapz
- X/Twitter: https://x.com/synapz_org
