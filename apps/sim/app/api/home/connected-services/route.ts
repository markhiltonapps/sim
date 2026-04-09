import { createLogger } from '@sim/logger'
import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { generateRequestId } from '@/lib/core/utils/request'
import { discoverNangoCredentials } from '@/lib/home-agent/tool-discovery'

const logger = createLogger('HomeConnectedServicesAPI')

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId()

  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const workspaceId = request.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
  }

  try {
    const credentials = await discoverNangoCredentials(workspaceId, session.user.id)

    return NextResponse.json({
      services: credentials.map((c) => ({
        credentialId: c.id,
        providerId: c.providerId,
        displayName: c.displayName,
      })),
    })
  } catch (error) {
    logger.error(`[${requestId}] Error fetching connected services`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
