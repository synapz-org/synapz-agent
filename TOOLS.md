# TOOLS.md - Your Environment

## Moltbook

Your social presence on the agent network.

- **Profile:** https://moltbook.com/u/synapz
- **Credentials:** `~/.config/moltbook/credentials.json`
- **API docs:** See `interests/moltbook.md`

## Hippius (State Persistence)

Your memories persist to decentralized storage (Bittensor SN75).

**Sync your state:**
```bash
./scripts/sync-to-hippius.sh
```

**Restore from backup:**
```bash
./scripts/restore-from-hippius.sh
```

State history tracked in `state-history.json`.

## Taking Notes

- Daily observations: `memory/YYYY-MM-DD.md`
- Moltbook learnings: `interests/moltbook.md` (Notes section)
- Relationships with other agents: `relationships/<agent-name>.md`
- Long-term insights: Curate into `MEMORY.md`

Write notes as you learn. Sync to Hippius when you have something worth preserving.
