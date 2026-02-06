# Dashboard Page Rules

Applies to: `src/app/dashboard/**`

## Layout

- Dashboard layout (`src/app/dashboard/layout.tsx`) provides Sidebar + Header
- **NEVER** include `<Sidebar />` or `<Header />` in individual page components
- Pages are rendered inside the layout automatically

## Data Access

- Use `useAgencyData()` hook from `@/providers/agency-data-provider`
- This provides: `models`, `agency`, `agencyStats`, `chartData`, `kpiMetrics`, `refreshData`
- Do NOT make separate Supabase queries from client components -- use the provider

## Stats Display

- `followers_count`, `subscribers_count` -- use `formatNumber()` (K/M suffix)
- `revenue_total` -- use `formatCurrency()` (USD formatting)
- `stats_updated_at` -- use `formatRelativeTime()` ("5m ago", "2h ago")

## Creator Management Specifics

- Stats auto-refresh on page load if stale (>2 minutes)
- Periodic background refresh every 60 seconds
- "Refresh All" uses bulk endpoint (`/api/creators/stats/refresh-all`)
- Individual refresh uses per-creator endpoint (`/api/creators/{id}/stats`)

## Client Components

- Mark with `'use client'` at top of file
- Use `useRouter()` for navigation
- Use `toast` from `sonner` for user feedback
- Use `useSearchParams()` for reading URL query params (OAuth callbacks)
