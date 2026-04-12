/**
 * POST /api/composio/disconnect
 *
 * Disconnects a Composio-managed app connection for the current user.
 */

import { createLogger } from '@sim/logger'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { requireComposioClient } from '@/lib/composio/client'

const logger = createLogger('ComposioDisconnect')

export async function POST(req: Request) {
  try {
    const currentSession = await getSession()
    if (!currentSession?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { connectedAccountId } = (await req.json()) as {
      connectedAccountId: string
    }

    if (!connectedAccountId) {
      return NextResponse.json({ error: 'Missing connectedAccountId parameter' }, { status: 400 })
    }

    const composio = requireComposioClient()
    await composio.connectedAccounts.delete({ connectedAccountId })

    logger.info('Composio connection deleted', {
      userId: currentSession.user.id,
      connectedAccountId,
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to disconnect Composio connection', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
