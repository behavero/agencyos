/**
 * Fanvue API Rate Limiter
 * Handles 429 responses with exponential backoff
 * Based on: https://api.fanvue.com/docs/advanced/working-with-rate-limits
 */

interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number // Unix timestamp
}

/**
 * Extract rate limit info from response headers
 */
export function getRateLimitInfo(response: Response): RateLimitInfo | null {
  const limit = response.headers.get('X-RateLimit-Limit')
  const remaining = response.headers.get('X-RateLimit-Remaining')
  const reset = response.headers.get('X-RateLimit-Reset')

  if (!limit || !remaining || !reset) {
    return null
  }

  return {
    limit: parseInt(limit, 10),
    remaining: parseInt(remaining, 10),
    reset: parseInt(reset, 10),
  }
}

/**
 * Get seconds to wait from Retry-After header
 */
export function getRetryAfter(response: Response): number {
  const retryAfter = response.headers.get('Retry-After')
  return retryAfter ? parseInt(retryAfter, 10) : 60 // Default 60s if not provided
}

/**
 * Make a fetch request with automatic rate limit retry
 * Implements exponential backoff with jitter
 */
export async function fetchWithRateLimit(
  url: string,
  options: RequestInit = {},
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)

      // Log rate limit info if available
      const rateLimitInfo = getRateLimitInfo(response)
      if (rateLimitInfo) {
        console.log(`[Rate Limit] ${rateLimitInfo.remaining}/${rateLimitInfo.limit} remaining`)

        // Warn if getting low
        if (rateLimitInfo.remaining < 10) {
          console.warn(`⚠️ [Rate Limit] Only ${rateLimitInfo.remaining} requests remaining!`)
        }
      }

      // Handle rate limit
      if (response.status === 429) {
        if (attempt >= maxRetries) {
          throw new Error('Rate limit exceeded after maximum retries')
        }

        const retryAfter = getRetryAfter(response)
        const jitter = Math.random() * 1000 // Add 0-1s random jitter
        const waitTime = retryAfter * 1000 + jitter

        console.log(
          `⏰ [Rate Limit] Hit 429 on attempt ${attempt + 1}/${maxRetries + 1}. ` +
            `Waiting ${retryAfter}s (+jitter) before retry...`
        )

        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue // Retry
      }

      // Success or non-rate-limit error
      return response
    } catch (error: any) {
      lastError = error

      // Network errors: exponential backoff
      if (attempt < maxRetries) {
        const backoffTime = Math.min(1000 * Math.pow(2, attempt), 30000) // Max 30s
        const jitter = Math.random() * 1000
        console.log(
          `⚠️ [Network Error] Attempt ${attempt + 1}/${maxRetries + 1} failed. ` +
            `Retrying in ${backoffTime / 1000}s...`
        )
        await new Promise(resolve => setTimeout(resolve, backoffTime + jitter))
        continue
      }
    }
  }

  throw lastError || new Error('Request failed after maximum retries')
}

/**
 * Helper to create Fanvue API request with rate limiting
 */
export async function fanvueFetch(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `https://api.fanvue.com${endpoint}`

  const response = await fetchWithRateLimit(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Fanvue-API-Version': '2025-06-26',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      `Fanvue API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
    )
  }

  return response.json()
}
