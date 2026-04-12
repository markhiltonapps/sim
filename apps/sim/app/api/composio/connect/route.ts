/**
 * POST /api/composio/connect
 *
 * Initiates a Composio OAuth connection for a third-party app.
 * Returns a redirect URL that the user visits to authorize the connection.
 */

import { createLogger } from '@sim/logger'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { requireComposioClient } from '@/lib/composio/client'

const logger = createLogger('ComposioConnect')

export async function POST(req: Request) {
  try {
    const currentSession = await getSession()
    if (!currentSession?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { app, redirectUrl } = (await req.json()) as {
      app: string
      redirectUrl?: string
    }

    if (!app) {
      return NextResponse.json({ error: 'Missing app parameter' }, { status: 400 })
    }

    const composio = requireComposioClient()
    const entity = composio.getEntity(currentSession.user.id)

    const connectionRequest = await entity.initiateConnection({
      appName: app,
      config: {
        redirectUrl:
          redirectUrl ||
          `${process.env.NEXT_PUBLIC_APP_URL}/workspace?composio_connected=${app}`,
      },
    })

    logger.info('Composio connection initiated', {
      userId: currentSession.user.id,
      app,
      status: connectionRequest.connectionStatus,
    })

    return NextResponse.json({
      redirectUrl: connectionRequest.redirectUrl,
      connectedAccountId: connectionRequest.connectedAccountId,
      status: connectionRequest.connectionStatus,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to initiate Composio connection', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
