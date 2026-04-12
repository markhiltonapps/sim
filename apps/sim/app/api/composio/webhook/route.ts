/**
 * POST /api/composio/webhook
 *
 * Handles Composio webhook events for connection status changes.
 * Set this URL in the Composio dashboard under webhook settings.
 */

import { createLogger } from '@sim/logger'
import { NextResponse } from 'next/server'

const logger = createLogger('ComposioWebhook')

interface ComposioWebhookPayload {
  type: string
  data: {
    toolkit?: string
    userId?: string
    connectedAccountId?: string
    [key: string]: unknown
  }
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as ComposioWebhookPayload

    switch (payload.type) {
      case 'composio.connected_account.created':
        logger.info('Composio: user connected an app', {
          userId: payload.data.userId,
          toolkit: payload.data.toolkit,
        })
        break

      case 'composio.connected_account.expired':
        logger.warn('Composio: connection expired', {
          userId: payload.data.userId,
          toolkit: payload.data.toolkit,
        })
        break

      case 'composio.connected_account.deleted':
        logger.info('Composio: connection deleted', {
          userId: payload.data.userId,
          toolkit: payload.data.toolkit,
        })
        break

      default:
        logger.info('Composio webhook received', { type: payload.type })
    }

    return NextResponse.json({ received: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to process Composio webhook', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
