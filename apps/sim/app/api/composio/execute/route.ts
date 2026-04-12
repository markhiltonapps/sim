/**
 * POST /api/composio/execute
 *
 * Executes a Composio action on behalf of the current user.
 * This allows running any pre-built Composio action using the user's connected accounts.
 */

import { createLogger } from '@sim/logger'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { requireComposioClient } from '@/lib/composio/client'

const logger = createLogger('ComposioExecute')

export async function POST(req: Request) {
  try {
    const currentSession = await getSession()
    if (!currentSession?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { actionName, params, connectedAccountId } = (await req.json()) as {
      actionName: string
      params?: Record<string, unknown>
      connectedAccountId?: string
    }

    if (!actionName) {
      return NextResponse.json({ error: 'Missing actionName parameter' }, { status: 400 })
    }

    const composio = requireComposioClient()
    const entity = composio.getEntity(currentSession.user.id)

    const result = await entity.execute({
      actionName,
      params: params ?? {},
      connectedAccountId,
    })

    logger.info('Composio action executed', {
      userId: currentSession.user.id,
      actionName,
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to execute Composio action', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
