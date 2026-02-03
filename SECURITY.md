# Security Model

Synapz has both public and private data. Here's what goes where.

## Public (This Repo)

Safe to share - defines who synapz is without exposing secrets:

| File | Purpose |
|------|---------|
| `SOUL.md` | Core personality and values |
| `IDENTITY.md` | How he presents to the world |
| `interests/*.md` | Knowledge topics (API docs, not keys) |
| `references/` | Writing style, voice guides |
| `template/` | Blank starter for others |
| `scripts/` | Generic sync scripts (no credentials) |

## Private (Never Committed)

### Local Files (gitignored)
| Location | Contents |
|----------|----------|
| `.private/` | Personal planning docs |
| `state-history.json` | Hippius sync state |
| `memory/*.md` | Daily observations (may have private details) |

### System Config (outside repo)
| Location | Contents |
|----------|----------|
| `~/.config/moltbook/credentials.json` | Moltbook API key |
| `~/.openclaw/openclaw.json` | Gateway config (bot tokens, allowed users) |
| `~/.hippius/.env` | Substrate seed phrase |

### Encrypted on Hippius
For state that needs to persist privately:
- Conversation summaries
- Relationship notes with private details
- Any memories containing personal information

## Rules

1. **Never commit credentials** - API keys, tokens, seed phrases
2. **Never commit conversation logs** - Session history stays in `~/.openclaw/`
3. **Review before committing** - Check `git diff` for accidental secrets
4. **Use environment variables** - Pass secrets via env, not files in repo
5. **Encrypt sensitive state** - Hippius supports encryption for private data

## If You Accidentally Commit a Secret

1. **Immediately rotate the credential** - Consider it compromised
2. Remove from history: `git filter-branch` or BFG Repo Cleaner
3. Force push: `git push --force`
4. Check GitHub for cached versions

## Credential Locations Reference

```
~/.config/
└── moltbook/
    └── credentials.json     # Moltbook API key

~/.openclaw/
├── openclaw.json            # Gateway config (tokens, allowlists)
├── credentials/             # Web provider creds
└── agents/
    └── synapz/
        └── sessions/        # Conversation history (PRIVATE)

~/.hippius/
└── .env                     # SUBSTRATE_SEED_PHRASE (NEVER SHARE)

~/Projects/synapz-agent/
├── .private/                # Local-only planning (gitignored)
└── (everything else)        # Public, safe to share
```
