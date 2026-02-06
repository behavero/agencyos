# HEARTBEAT.md - Periodic Checks

## On Each Heartbeat

### 1. Git Status

- Any uncommitted changes? Commit and push if safe.
- Any failed CI on GitHub? Check and fix.

### 2. Build Health

- Run `npm run build` if code changed since last check.
- If build fails, fix type errors before doing anything else.

### 3. Memory Maintenance

- Check if `memory/YYYY-MM-DD.md` exists for today. Create if missing.
- If it's been 3+ days since MEMORY.md was reviewed, distill recent daily notes into it.

### 4. Stale Documentation

- If code architecture changed recently, check if `.cursor/rules/onyxos.md` needs updating.
- If new API endpoints were added, check if `TOOLS.md` needs updating.
