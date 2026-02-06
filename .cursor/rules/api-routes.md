# API Route Rules

Applies to: `src/app/api/**`

## Authentication

- **Cron routes** (`/api/cron/*`): Authenticate with `CRON_SECRET` via header or query param
- **Debug routes** (`/api/debug/*`): Use `requireAdminAuth()` from `@/lib/utils/debug-auth`
- **Public routes**: Only OAuth callback routes should be unauthenticated

## Database Access

- Always use `createAdminClient()` from `@/lib/supabase/server` in API routes
- This bypasses RLS -- be careful with data access
- The admin client is **untyped** -- column names match actual DB, not `database.types.ts`

## Error Handling

- Return meaningful error messages in JSON: `{ error: "Human-readable message" }`
- Include HTTP status codes: 400 (bad request), 401 (unauthorized), 404 (not found), 500 (server error)
- Log errors to console with prefix for easy filtering: `console.error('[Stats API] ...')`

## Fanvue Token Pattern

```typescript
// 1. Try agency connection token first
try {
  accessToken = await getAgencyFanvueToken(agencyId)
} catch {
  // 2. Fall back to individual model token
  accessToken = await getModelAccessToken(modelId)
}
```

## Response Format

- Success: `{ success: true, ...data }`
- Error: `{ error: "message" }` with appropriate status code
- Include debug info in non-production responses when helpful
