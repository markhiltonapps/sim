import { db } from '@sim/db'
import { credential, credentialMember } from '@sim/db/schema'
import { createLogger } from '@sim/logger'
import { and, eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { generateRequestId } from '@/lib/core/utils/request'
import { generateId } from '@/lib/core/utils/uuid'
import { getNangoClient } from '@/lib/nango/client'
import { getNangoProviderConfigKey } from '@/lib/nango/providers'

const logger = createLogger('NangoConnectAPI')

const connectBodySchema = z.object({
  providerId: z.string().min(1),
  displayName: z.string().min(1).max(255),
  workspaceId: z.string().uuid(),
  nangoConnectionId: z.string().min(1),
  extraConfig: z.record(z.string()).optional(),
})

/**
 * POST /api/auth/nango/connect
 *
 * Called by the frontend after `nango.auth()` completes.
 * Verifies the connection exists in Nango, then creates (or returns) a
 * workspace-scoped credential record so the rest of the app can reference it
 * by a stable UUID.
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }
    const userId = session.user.id

    const rawBody = await request.json()
    const parseResult = connectBodySchema.safeParse(rawBody)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message || 'Validation failed' },
        { status: 400 }
      )
    }

    const { providerId, displayName, workspaceId, nangoConnectionId, extraConfig } =
      parseResult.data

    const nangoClient = getNangoClient()
    if (!nangoClient) {
      return NextResponse.json({ error: 'Nango is not configured' }, { status: 503 })
    }

    const providerConfigKey = getNangoProviderConfigKey(providerId)

    // Verify the connection actually exists in Nango (throws if not found)
    try {
      await nangoClient.getConnection(providerConfigKey, nangoConnectionId)
    } catch {
      logger.warn(`[${requestId}] Nango connection not found`, {
        nangoConnectionId,
        providerConfigKey,
      })
      return NextResponse.json(
        { error: 'OAuth connection not found. Please try connecting again.' },
        { status: 404 }
      )
    }

    // Store extra config (e.g., PostHog projectId) in Nango connection metadata
    if (extraConfig && Object.keys(extraConfig).length > 0) {
      try {
        await nangoClient.setMetadata(providerConfigKey, nangoConnectionId, extraConfig)
        logger.info(`[${requestId}] Stored extra config in Nango metadata`, {
          providerConfigKey,
          keys: Object.keys(extraConfig),
        })
      } catch (err) {
        logger.warn(`[${requestId}] Failed to store extra config in Nango metadata`, { err })
      }
    }

    // Validate API key providers by testing the stored credential against the actual service
    if (providerId === 'posthog') {
      try {
        const token = await nangoClient.getToken(providerConfigKey, nangoConnectionId)
        const apiKey =
          typeof token === 'string'
            ? token
            : token && typeof token === 'object' && 'apiKey' in token
              ? (token as { apiKey?: string }).apiKey
              : null

        if (!apiKey) {
          return NextResponse.json(
            { error: 'Failed to retrieve API key from Nango. Please try again.' },
            { status: 400 }
          )
        }

        // Test the key against PostHog to catch invalid keys immediately
        const projectId = extraConfig?.projectId
        const baseUrl = extraConfig?.region === 'eu' ? 'https://eu.posthog.com' : 'https://us.posthog.com'
        const testUrl = projectId
          ? `${baseUrl}/api/projects/${projectId}/`
          : `${baseUrl}/api/projects/`
        const testResp = await fetch(testUrl, {
          headers: { Authorization: `Bearer ${apiKey}` },
        })

        if (!testResp.ok) {
          const detail = await testResp.text().catch(() => '')
          logger.warn(`[${requestId}] PostHog API key validation failed`, {
            status: testResp.status,
            detail: detail.substring(0, 200),
          })
          return NextResponse.json(
            {
              error:
                testResp.status === 403
                  ? 'PostHog API key is invalid. Please check the key in PostHog → Settings → Personal API Keys and try again.'
                  : `PostHog returned ${testResp.status}. Please check your API key and project ID.`,
            },
            { status: 400 }
          )
        }

        logger.info(`[${requestId}] PostHog API key validated successfully`)
      } catch (err) {
        logger.warn(`[${requestId}] PostHog validation check failed (non-fatal):`, err)
        // Continue — don't block the connection if the validation check itself errors
      }
    }

    // Upsert: return existing credential if already connected for this workspace+provider+user
    const [existing] = await db
      .select({ id: credential.id })
      .from(credential)
      .where(
        and(
          eq(credential.workspaceId, workspaceId),
          eq(credential.type, 'nango'),
          eq(credential.providerId, providerId),
          eq(credential.nangoConnectionId, nangoConnectionId)
        )
      )
      .limit(1)

    if (existing) {
      return NextResponse.json({ credentialId: existing.id }, { status: 200 })
    }

    const credentialId = generateId()
    const memberId = generateId()
    const now = new Date()

    await db.transaction(async (tx) => {
      await tx.insert(credential).values({
        id: credentialId,
        workspaceId,
        type: 'nango',
        displayName,
        providerId,
        nangoConnectionId,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })

      await tx.insert(credentialMember).values({
        id: memberId,
        credentialId,
        userId,
        role: 'admin',
        status: 'active',
        joinedAt: now,
      })
    })

    logger.info(`[${requestId}] Nango credential created`, {
      credentialId,
      userId,
      providerId,
      workspaceId,
    })

    return NextResponse.json({ credentialId }, { status: 201 })
  } catch (error) {
    logger.error(`[${requestId}] Nango connect error`, { error })
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg || 'Internal server error' }, { status: 500 })
  }
}
