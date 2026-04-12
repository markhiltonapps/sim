import { Composio } from 'composio-core'
import { createLogger } from '@sim/logger'
import { env } from '@/lib/core/config/env'

const logger = createLogger('ComposioClient')

let _composio: Composio | null = null

/**
 * Returns a singleton Composio server-side client.
 * Returns null when COMPOSIO_API_KEY is not configured.
 */
export function getComposioClient(): Composio | null {
  if (!env.COMPOSIO_API_KEY) return null
  if (!_composio) {
    _composio = new Composio({ apiKey: env.COMPOSIO_API_KEY })
    logger.info('Composio client initialized')
  }
  return _composio
}

/**
 * Returns the Composio client or throws if not configured.
 */
export function requireComposioClient(): Composio {
  const client = getComposioClient()
  if (!client) {
    throw new Error('Composio is not configured. Set COMPOSIO_API_KEY in your environment.')
  }
  return client
}
