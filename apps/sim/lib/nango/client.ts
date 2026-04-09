import { Nango } from '@nangohq/node'
import { env } from '@/lib/core/config/env'

let _nango: Nango | null = null

/**
 * Returns a singleton Nango server-side client.
 * Returns null when NANGO_SECRET_KEY is not configured (Nango disabled).
 */
export function getNangoClient(): Nango | null {
  if (!env.NANGO_SECRET_KEY) return null
  if (!_nango) {
    _nango = new Nango({
      secretKey: env.NANGO_SECRET_KEY,
      ...(env.NANGO_BASE_URL ? { serverUrl: env.NANGO_BASE_URL } : {}),
    })
  }
  return _nango
}
