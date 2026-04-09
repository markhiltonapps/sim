import { createLogger } from '@sim/logger'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { generateRequestId } from '@/lib/core/utils/request'
import { getNangoClient } from '@/lib/nango/client'
import { getNangoProviderConfigKey, PROVIDER_SCOPE_OVERRIDES } from '@/lib/nango/providers'

const logger = createLogger('NangoSessionAPI')

const sessionBodySchema = z.object({
  providerId: z.string().min(1),
})

/**
 * POST /api/auth/nango/session
 *
 * Creates a short-lived Nango connect session token scoped to one provider
 * and the current user. The frontend passes this token to `new Nango({ connectSessionToken })`
 * instead of a static public key.
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }
    const { id: userId, email, name } = session.user

    const rawBody = await request.json()
    const parseResult = sessionBodySchema.safeParse(rawBody)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message || 'Validation failed' },
        { status: 400 }
      )
    }

    const { providerId } = parseResult.data

    const nangoClient = getNangoClient()
    if (!nangoClient) {
      return NextResponse.json({ error: 'Nango is not configured' }, { status: 503 })
    }

    const providerConfigKey = getNangoProviderConfigKey(providerId)

    const isValidEmail = (e: string | null | undefined) =>
      typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

    const scopeOverride = PROVIDER_SCOPE_OVERRIDES[providerId]
    const result = await nangoClient.createConnectSession({
      end_user: {
        id: userId,
        ...(isValidEmail(email) ? { email: email! } : {}),
        ...(name ? { display_name: name } : {}),
      },
      allowed_integrations: [providerConfigKey],
      ...(scopeOverride
        ? {
            integrations_config_defaults: {
              [providerConfigKey]: {
                connection_config: {
                  oauth_scopes_override: scopeOverride.join(' '),
                },
              },
            },
          }
        : {}),
    })

    logger.info(`[${requestId}] Nango session created`, { userId, providerConfigKey })

    return NextResponse.json(
      { sessionToken: result.data.token, connectionId: userId },
      { status: 200 }
    )
  } catch (error) {
    const nangoMsg =
      error instanceof Error
        ? (error as unknown as { response?: { data?: unknown } }).response?.data ?? error.message
        : String(error)
    logger.error(`[${requestId}] Nango session error`, { nangoError: nangoMsg })
    const detail = typeof nangoMsg === 'string' ? nangoMsg : JSON.stringify(nangoMsg)
    return NextResponse.json({ error: detail || 'Failed to create OAuth session' }, { status: 500 })
  }
}
