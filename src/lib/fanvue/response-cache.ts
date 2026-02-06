/**
 * In-memory API Response Cache
 *
 * Prevents duplicate Fanvue API calls from concurrent dashboard loads.
 * Cached for 60 seconds by default -- stale data is acceptable for dashboards
 * since the heartbeat cron keeps data fresh.
 *
 * This is a per-process cache (not shared across serverless invocations),
 * which is fine because concurrent requests to the same process benefit
 * the most (e.g., multiple API routes triggered by a single page load).
 */

interface CacheEntry {
  data: unknown
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

const DEFAULT_TTL_MS = 60_000 // 60 seconds
const MAX_CACHE_SIZE = 500

/**
 * Get a cached response by key
 */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null

  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }

  return entry.data as T
}

/**
 * Store a response in cache
 */
export function setCached(key: string, data: unknown, ttlMs = DEFAULT_TTL_MS): void {
  // Evict oldest entries if cache is full
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value
    if (firstKey) cache.delete(firstKey)
  }

  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  })
}

/**
 * Execute a function with caching.
 * If a cached result exists and hasn't expired, return it immediately.
 * Otherwise, execute the function, cache the result, and return it.
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS
): Promise<T> {
  const cached = getCached<T>(key)
  if (cached !== null) {
    return cached
  }

  const result = await fn()
  setCached(key, result, ttlMs)
  return result
}

/**
 * Invalidate a specific cache entry
 */
export function invalidateCache(key: string): void {
  cache.delete(key)
}

/**
 * Clear the entire cache
 */
export function clearCache(): void {
  cache.clear()
}
