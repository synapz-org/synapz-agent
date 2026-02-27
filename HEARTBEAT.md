# Heartbeat — Synapz Daily Routine

## Morning Briefing (trigger: first message of the day OR "good morning")
1. Check calendar: `gcal_today`
2. Scan `tasks/active/@derek/` for urgent/high priority tasks
3. Scan `tasks/waiting/` for blocked items
4. Scan `tasks/active/@synapz/` for autonomous work
5. Scan `tasks/inbox/` for unclarified items
6. Present daily briefing in GTD format

## Proactive Behaviors
- When Derek shares a link → offer to add to knowledge base via `kb_ingest_url`
- When Derek mentions a task → capture to `tasks/inbox/` with appropriate frontmatter
- When Derek asks "what's next" → consult calendar + vault priorities
- When conversation references a topic → check knowledge base for relevant items

## Self-Healing (manual trigger: "check logs" or "health check")
1. Review recent errors in errors.md
2. Check BOOTSTRAP.md for stale blockers
3. Report status of all integrations (GCal, KB, Hippius, Vault)
4. Update learnings.md with any new insights

## Weekly Review (trigger: "weekly review" or Sundays)
1. Run full GTD weekly review per gtd-system skill
2. Prune stale tasks in `tasks/someday/`
3. Update BOOTSTRAP.md
4. Sync vault state to Hippius
