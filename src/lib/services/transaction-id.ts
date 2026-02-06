/**
 * Shared Transaction ID Generator
 *
 * Produces a deterministic, unique ID for each Fanvue transaction.
 * Used by ALL sync paths (agency sync, transaction-syncer, analytics sync)
 * to ensure the same underlying transaction always gets the same ID,
 * preventing duplicate inserts even when synced by different code paths.
 *
 * The hash is: SHA256(date + source + gross_cents + net_cents + fan_uuid + model_id)
 * truncated to 24 hex characters.
 */

import { createHash } from 'crypto'

/**
 * Build a deterministic transaction ID from the Fanvue earning data.
 *
 * @param date      - ISO date string from the Fanvue API (e.g. "2025-10-31T02:39:09.337Z")
 * @param source    - Earning source/type from API (e.g. "message", "subscription", "tip")
 * @param grossCents - Gross amount in cents (as returned by the API, before dividing by 100)
 * @param netCents   - Net amount in cents
 * @param fanUuid   - Fan's UUID (or 'unknown' if not present)
 * @param modelId   - Our internal model UUID
 */
export function buildTransactionId(
  date: string,
  source: string,
  grossCents: number,
  netCents: number,
  fanUuid: string,
  modelId: string
): string {
  return createHash('sha256')
    .update(`${date}_${source}_${grossCents}_${netCents}_${fanUuid || 'unknown'}_${modelId}`)
    .digest('hex')
    .substring(0, 24)
}
