# Fanvue API Rules

Applies to: `src/lib/fanvue/**`, `src/lib/services/*fanvue*`, `src/app/api/oauth/**`

## API Client (`src/lib/fanvue/client.ts`)

- All Fanvue API calls go through `FanvueClient` class
- Always include `X-Fanvue-API-Version: 2025-06-26` header (handled by client)
- Use `fetchWithRateLimit()` for automatic 429 retry with exponential backoff
- Amounts from Fanvue are in **CENTS** -- always divide by 100 before storing/displaying as dollars

## OAuth (`src/lib/fanvue/oauth.ts`)

- Token exchange uses `Authorization: Basic` header (base64 of `clientId:clientSecret`)
- Scopes come from `process.env.OAUTH_SCOPES` -- must exactly match Fanvue developer portal
- Client ID: check both `FANVUE_CLIENT_ID` and `NEXT_PUBLIC_FANVUE_CLIENT_ID`
- Centralized helpers: `getClientId()`, `getClientSecret()`, `getAuthorizeUrl()`, `exchangeCodeForToken()`

## Token Management

- Agency tokens: `agency_fanvue_connections` table -> `getAgencyFanvueToken(agencyId)`
- Model tokens: `models` table -> `getModelAccessToken(modelId)`
- Both auto-refresh if expiring within 1 hour
- ALWAYS try agency token first, fall back to model token

## Endpoint Reference

Full docs in `docs/fanvue-api-docs/`. Key agency endpoints:

- `GET /creators` -- list creators (scope: `read:creator`)
- `GET /creators/{uuid}/chats/lists/smart` -- follower/subscriber counts (scope: `read:creator`, `read:chat`, `read:fan`)
- `GET /creators/{uuid}/insights/earnings` -- revenue data (scope: `read:creator`, `read:insights`)
