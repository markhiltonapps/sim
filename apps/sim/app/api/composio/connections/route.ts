/**
 * GET /api/composio/connections
 *
 * Lists all Composio-managed connected accounts for the current user.
 */

import { createLogger } from '@sim/logger'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { requireComposioClient } from '@/lib/composio/client'

const logger = createLogger('ComposioConnections')

export async function GET() {
  try {
    const currentSession = await getSession()
    if (!currentSession?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const composio = requireComposioClient()
    const entity = composio.getEntity(currentSession.user.id)
    const connections = await entity.getConnections()

    const apps = connections.map((c) => ({
      id: c.id,
      app: c.appName,
      status: c.status,
      connectedAt: c.createdAt,
    }))

    logger.info('Listed Composio connections', {
      userId: currentSession.user.id,
      count: apps.length,
    })

    return NextResponse.json({ connections: apps })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to list Composio connections', { error: message })
    return NextResponse.json({ connections: [] })
  }
}
