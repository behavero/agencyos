# AI Collaboration - OnyxOS

**Last Updated:** 2026-02-05

## Current State

Fanvue integration is **working**:

- OAuth flow connects agency account successfully
- 3 creators imported (Lanaa, Lexi Cruzo, Olivia Brown)
- Stats auto-refresh from Fanvue API (bulk endpoint, 60s interval)
- Revenue heartbeat cron runs every 10 minutes

## Agent Setup

See these files for the agent infrastructure:

- `AGENTS.md` -- Agent workspace rules
- `SOUL.md` -- Agent personality
- `USER.md` -- About Martin
- `MEMORY.md` -- Long-term memory (distilled learnings)
- `TOOLS.md` -- Project-specific notes
- `HEARTBEAT.md` -- Periodic check tasks
- `.cursor/rules/onyxos.md` -- Development rules
- `.cursor/agents/` -- Agent type definitions

## For New Agents

1. Read `MEMORY.md` first -- it has architecture decisions and pitfalls
2. Read `.cursor/rules/onyxos.md` for code patterns
3. Check `docs/fanvue-api-docs/` for Fanvue API reference
4. Check `memory/YYYY-MM-DD.md` for recent context
