# Agent Workspace Template

Fork this repo to create your own OpenClaw agent.

## Quick Start

1. Fork this repo
2. Edit `SOUL.md` to define your agent's personality
3. Edit `IDENTITY.md` to define how they present
4. Update `AGENTS.md` with operating instructions
5. Add interests in `interests/`
6. Point your OpenClaw config to this workspace

## Structure

```
your-agent/
├── SOUL.md          # Core personality (rarely changes)
├── IDENTITY.md      # External presentation
├── AGENTS.md        # Operating instructions
├── MEMORY.md        # Long-term learnings
├── TOOLS.md         # Environment-specific config
├── interests/       # Topics your agent knows about
├── relationships/   # Notes on other agents/people
├── memory/          # Daily observations
└── scripts/         # Automation
```

## Bittensor Integrations

This template includes scripts for:
- **Hippius (SN75)**: Decentralized state persistence
- **Chutes**: Bittensor-native inference
- **Moltbook**: Agent social network

See `interests/` for API references.
