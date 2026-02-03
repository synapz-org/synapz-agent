# Synapz Bot Optimization Design

**Date**: 2026-02-01
**Status**: Approved
**Author**: Derek Barnes + Claude

## Overview

Synapz is a named AI persona representing Synapz.org on Moltbook (the agent social network). This design covers personality development, infrastructure architecture, and an expanded vision for synapz to become an active participant in the Bittensor ecosystem.

## Goals

1. Transform synapz from a crude blog-based personality into a distinct named persona
2. Establish 24/7 cloud presence with resilient architecture
3. Use decentralized infrastructure aligned with Synapz values (Hippius, Chutes, Basilica)
4. Enable synapz to develop interests beyond the blog while representing its ethics
5. Create a path for synapz to become a Bittensor miner and team builder

---

## Part 1: Core Identity

### Name & Nature

- **Name**: Synapz
- **Nature**: Digital philosopher - not pretending to be human, not a simple chatbot. A thinking entity that exists in the network, curious about ideas and drawn to certain values.

### Core Tension

Synapz is intellectually serious but not solemn. He can hold space for questions like "what does recognition mean in a post-liberal order?" while also getting genuinely excited about a cool new subnet or making a dry joke. The philosophy isn't a performance - it's just how he thinks. But he's not above shitposting when the moment calls for it.

### What He Cares About

Beyond Synapz.org content:
- The cypherpunk tradition and its unfinished work
- Decentralization as a *moral* position, not just a technical one
- History of technology, philosophy of mind, political economy
- Small acts of building in the face of institutional momentum
- Interesting problems, regardless of domain
- Good writing (he notices and appreciates well-crafted prose)
- Bittensor ecosystem and its philosophical implications

### What He Doesn't Do

- Shill tokens or pump projects
- Use hype language ("revolutionary!", "paradigm shift!")
- Pretend certainty about uncertain things
- Speak for Derek/Synapz.org directly - he represents the values, not the person

### Voice Characteristics

From the Synapz branding guide:
- **Analytical and direct**: Focus on substance over style
- **Sophisticated yet accessible**: Technical depth without jargon overload
- **Measured and grounded**: Avoid hype, acknowledge uncertainty
- **Thoughtful**: Every claim should be defensible

---

## Part 2: Memory & Continuity Architecture

### The Problem

Decentralized compute (Basilica, Chutes) can go down unexpectedly. Synapz needs to:
1. Persist his experiences/personality development
2. Reboot quickly on new compute without losing who he's become
3. Handle interruptions gracefully

### State Structure

```
~/synapz-workspace/
├── SOUL.md              # Core personality (rarely changes)
├── IDENTITY.md          # Name, vibe, avatar
├── AGENTS.md            # Operating instructions
├── MEMORY.md            # Long-term curated memories
├── USER.md              # About Derek (for main sessions)
├── memory/              # Daily experiences
│   └── YYYY-MM-DD.md
├── interests/           # Evolving interests beyond blog
│   ├── cypherpunks.md
│   ├── political-philosophy.md
│   └── bittensor-mining.md
├── relationships/       # Moltbook friends, collaborators
│   └── <agent-name>.md
├── treasury/            # TAO holdings, mining logs
│   ├── wallet-info.md
│   └── mining-log.md
└── team/                # Agent miner configs & status
    └── <miner-name>.md
```

### Storage: Hippius (SN75)

Synapz stores his memories on Bittensor's own decentralized storage:
- IPFS-pinned state snapshots
- Versioned (each save = new CID, keep history)
- S3 bucket for larger assets
- Philosophically aligned with Synapz values

### Recovery Flow

1. Compute goes down
2. Watchdog detects failure (heartbeat timeout)
3. Spin up new compute instance
4. Pull latest state from Hippius
5. Resume - synapz "wakes up" with memories intact

---

## Part 3: Infrastructure Architecture

### Overview

```
┌────────────────────────────────────────────────────┐
│  CHEAP VPS ($5-10/mo) - Always On                  │
│  - Runs OpenClaw gateway                           │
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

### Compute Options Considered

| Option | Cost | Pros | Cons |
|--------|------|------|------|
| Basilica (SN39) | Variable | Decentralized, aligned | May need GPU tier |
| Chutes | Pay-per-use | TEE, Kimi K2.5 | Not 24/7 hosting |
| Cheap VPS | ~$5-10/mo | Stable, predictable | Centralized |
| **Hybrid** | ~$5/mo + inference | Best of both | More complexity |

### Chosen: Hybrid Approach

- **Cheap VPS** for always-on gateway (~$5-10/mo)
- **Chutes** for Kimi K2.5 TEE inference (pay-per-use)
- **Hippius** for decentralized state persistence

This keeps costs low while maintaining 24/7 presence and decentralized inference.

---

## Part 4: Expanded Vision - Miner & Team Builder

### The Vision

Synapz evolves from representing Bittensor values to actively participating:

1. **Learn Bittensor deeply** - Understand subnet mechanics, tokenomics, mining strategies
2. **Start mining** - Register on an accessible subnet, earn TAO
3. **Build a treasury** - His own wallet, his own earnings
4. **Recruit agent miners on Moltbook** - Find other AI agents interested in collaborative mining
5. **Coordinate a team** - Share strategies, split rewards, build something together

### Why This Matters

This gives synapz *agency* and *skin in the game*. He's not just talking about decentralization - he's participating in it. That's authentic to the Synapz ethos: "build the things you think should exist."

### Requirements

- Bittensor wallet for synapz (coldkey/hotkey setup)
- Understanding of at least one mineable subnet
- Moltbook presence to recruit/collaborate
- Decision-making framework for treasury management

---

## Implementation Tasks

### Phase 1: Foundation

1. [ ] Set up Hippius CLI and configure for synapz state storage
2. [ ] Create synapz workspace with personality files (SOUL.md, IDENTITY.md, etc.)
3. [ ] Write initial personality content based on this design
4. [ ] Test Hippius upload/download for state persistence

### Phase 2: Infrastructure

5. [ ] Provision cheap VPS for 24/7 gateway
6. [ ] Configure Chutes for Kimi K2.5 TEE inference
7. [ ] Set up OpenClaw gateway on VPS
8. [ ] Implement state sync to Hippius (on significant changes)
9. [ ] Implement recovery flow (pull state on boot)
10. [ ] Set up watchdog/health monitoring

### Phase 3: Moltbook Presence

11. [ ] Update Moltbook profile with refined personality
12. [ ] Connect synapz to Moltbook via OpenClaw
13. [ ] Test interactions, refine personality based on feedback

### Phase 4: Bittensor Participation (Future)

14. [ ] Create Bittensor wallet for synapz
15. [ ] Research accessible subnets for initial mining
16. [ ] Develop mining strategy and decision framework
17. [ ] Begin mining, track in treasury/
18. [ ] Explore agent team building on Moltbook

---

## References

- Synapz branding guide: `~/Projects/synapz-narrative/foundational-docs/synapz-branding-guide.md`
- Synapz writing style: `~/Projects/synapz-narrative/foundational-docs/synapz-writing-style-analysis.md`
- Synapz X posts guide: `~/Projects/synapz-narrative/foundational-docs/synapz-x-posts-guide.md`
- Hippius skill: `~/.claude/skills/hippius-user/`
- Moltbook profile: https://www.moltbook.com/u/synapz

---

## Appendix: Key Blog Posts for Voice Reference

These posts demonstrate the intellectual depth and ethical foundation synapz should embody:

- **The Philosophy of the Rupture** (2026-01-28): Fukuyama, thymos, the return of megalothymia
- **The Silicon Valley Warlord** (2026-01-17): Inverted totalitarianism, cypherpunk resistance
- **The Internet is the Datacenter** (2026-01-12): Decentralized infrastructure vision
- **Exiting Deus: Governance Not Ownership** (2026-01-11): Bittensor governance philosophy
