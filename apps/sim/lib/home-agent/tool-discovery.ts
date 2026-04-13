import { createLogger } from '@sim/logger'
import { db } from '@sim/db'
import { credential, credentialMember } from '@sim/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import type { ToolInput } from '@/executor/handlers/agent/types'
import { getNangoToken } from '@/app/api/auth/oauth/utils'
import { env } from '@/lib/core/config/env'
import { getNangoClient } from '@/lib/nango/client'
import { getNangoProviderConfigKey } from '@/lib/nango/providers'

const logger = createLogger('ToolDiscovery')

/**
 * Maps Composio appName (lowercase) to the PROVIDER_TOOLS key used by the agent.
 */
const COMPOSIO_APP_TO_PROVIDER: Record<string, string> = {
  gmail: 'google-email',
  googlecalendar: 'google-calendar',
  googledrive: 'google-drive',
  googlesheets: 'google-sheets',
  googledocs: 'google-docs',
  outlook: 'outlook',
  slack: 'slack',
  notion: 'notion',
  github: 'github',
  jira: 'jira',
  linear: 'linear',
  asana: 'asana',
  hubspot: 'hubspot',
  posthog: 'posthog',
  salesforce: 'salesforce',
  microsoftteams: 'microsoft-teams',
  onedrive: 'onedrive',
  dropbox: 'dropbox',
  trello: 'trello',
  airtable: 'airtable',
  zoom: 'zoom',
}

/**
 * Maps a Nango providerId to the corresponding agent ToolInputs.
 * Each entry represents one operation the LLM can call.
 */
const PROVIDER_TOOLS: Record<string, Array<{ blockType: string; operation: string }>> = {
  outlook: [
    { blockType: 'outlook', operation: 'read_outlook' },
    { blockType: 'outlook', operation: 'send_outlook' },
    { blockType: 'outlook', operation: 'draft_outlook' },
    { blockType: 'outlook', operation: 'forward_outlook' },
    { blockType: 'outlook_calendar', operation: 'list_outlook_calendar' },
    { blockType: 'outlook_calendar', operation: 'create_outlook_calendar' },
    { blockType: 'outlook_calendar', operation: 'update_outlook_calendar' },
    { blockType: 'outlook_calendar', operation: 'delete_outlook_calendar' },
  ],
  'google-email': [
    { blockType: 'gmail_v2', operation: 'read_gmail' },
    { blockType: 'gmail_v2', operation: 'send_gmail' },
    { blockType: 'gmail_v2', operation: 'draft_gmail' },
    { blockType: 'gmail_v2', operation: 'search_gmail' },
  ],
  'google-calendar': [
    { blockType: 'google_calendar_v2', operation: 'list_events' },
    { blockType: 'google_calendar_v2', operation: 'create_event' },
    { blockType: 'google_calendar_v2', operation: 'update_event' },
    { blockType: 'google_calendar_v2', operation: 'delete_event' },
  ],
  'google-drive': [
    { blockType: 'google_drive', operation: 'list' },
    { blockType: 'google_drive', operation: 'read' },
    { blockType: 'google_drive', operation: 'upload' },
  ],
  'google-sheets': [
    { blockType: 'google_sheets_v2', operation: 'read_sheet' },
    { blockType: 'google_sheets_v2', operation: 'write_sheet' },
    { blockType: 'google_sheets_v2', operation: 'append_sheet' },
  ],
  'google-docs': [
    { blockType: 'google_docs', operation: 'read' },
    { blockType: 'google_docs', operation: 'create' },
    { blockType: 'google_docs', operation: 'append' },
  ],
  slack: [
    { blockType: 'slack', operation: 'send' },
    { blockType: 'slack', operation: 'read' },
    { blockType: 'slack', operation: 'list_channels' },
    { blockType: 'slack', operation: 'get_message' },
    { blockType: 'slack', operation: 'get_thread' },
  ],
  notion: [
    { blockType: 'notion_v2', operation: 'get_page' },
    { blockType: 'notion_v2', operation: 'create_page' },
    { blockType: 'notion_v2', operation: 'update_page' },
    { blockType: 'notion_v2', operation: 'query_database' },
    { blockType: 'notion_v2', operation: 'list_databases' },
  ],
  github: [
    { blockType: 'github_v2', operation: 'list_issues' },
    { blockType: 'github_v2', operation: 'create_issue' },
    { blockType: 'github_v2', operation: 'get_issue' },
    { blockType: 'github_v2', operation: 'list_repos' },
    { blockType: 'github_v2', operation: 'list_pull_requests' },
  ],
  jira: [
    { blockType: 'jira', operation: 'list_issues' },
    { blockType: 'jira', operation: 'create_issue' },
    { blockType: 'jira', operation: 'get_issue' },
    { blockType: 'jira', operation: 'update_issue' },
  ],
  linear: [
    { blockType: 'linear_v2', operation: 'list_issues' },
    { blockType: 'linear_v2', operation: 'create_issue' },
    { blockType: 'linear_v2', operation: 'get_issue' },
    { blockType: 'linear_v2', operation: 'update_issue' },
  ],
  asana: [
    { blockType: 'asana', operation: 'list_tasks' },
    { blockType: 'asana', operation: 'create_task' },
    { blockType: 'asana', operation: 'get_task' },
    { blockType: 'asana', operation: 'update_task' },
  ],
  hubspot: [
    { blockType: 'hubspot', operation: 'list_contacts' },
    { blockType: 'hubspot', operation: 'create_contact' },
    { blockType: 'hubspot', operation: 'get_contact' },
    { blockType: 'hubspot', operation: 'list_deals' },
  ],
  posthog: [
    { blockType: 'posthog', operation: 'posthog_query' },
    { blockType: 'posthog', operation: 'posthog_list_insights' },
    { blockType: 'posthog', operation: 'posthog_get_insight' },
    { blockType: 'posthog', operation: 'posthog_list_feature_flags' },
    { blockType: 'posthog', operation: 'posthog_get_feature_flag' },
    { blockType: 'posthog', operation: 'posthog_list_persons' },
    { blockType: 'posthog', operation: 'posthog_capture_event' },
  ],
  salesforce: [
    { blockType: 'salesforce', operation: 'query' },
    { blockType: 'salesforce', operation: 'create_record' },
    { blockType: 'salesforce', operation: 'update_record' },
  ],
  'microsoft-teams': [
    { blockType: 'microsoft_teams', operation: 'send_message' },
    { blockType: 'microsoft_teams', operation: 'list_channels' },
    { blockType: 'microsoft_teams', operation: 'list_messages' },
  ],
  onedrive: [
    { blockType: 'onedrive', operation: 'list' },
    { blockType: 'onedrive', operation: 'read' },
    { blockType: 'onedrive', operation: 'upload' },
  ],
  dropbox: [
    { blockType: 'dropbox', operation: 'list' },
    { blockType: 'dropbox', operation: 'read' },
    { blockType: 'dropbox', operation: 'upload' },
  ],
  trello: [
    { blockType: 'trello', operation: 'list_boards' },
    { blockType: 'trello', operation: 'list_cards' },
    { blockType: 'trello', operation: 'create_card' },
  ],
  airtable: [
    { blockType: 'airtable', operation: 'list_records' },
    { blockType: 'airtable', operation: 'create_record' },
    { blockType: 'airtable', operation: 'update_record' },
  ],
  zoom: [
    { blockType: 'zoom', operation: 'list_meetings' },
    { blockType: 'zoom', operation: 'create_meeting' },
  ],
}

export interface DiscoveredCredential {
  id: string
  displayName: string | null
  providerId: string
  nangoConnectionId: string | null
}

/**
 * Fetches all active Nango credentials for a workspace + user.
 */
export async function discoverNangoCredentials(
  workspaceId: string,
  userId: string
): Promise<DiscoveredCredential[]> {
  const rows = await db
    .select({
      id: credential.id,
      displayName: credential.displayName,
      providerId: credential.providerId,
      nangoConnectionId: credential.nangoConnectionId,
    })
    .from(credential)
    .innerJoin(
      credentialMember,
      and(
        eq(credentialMember.credentialId, credential.id),
        eq(credentialMember.userId, userId),
        eq(credentialMember.status, 'active')
      )
    )
    .where(and(eq(credential.workspaceId, workspaceId), eq(credential.type, 'nango')))
    .orderBy(desc(credential.createdAt))

  return rows
    .filter((r) => Boolean(r.providerId))
    .map((r) => ({ ...r, providerId: r.providerId as string }))
}

/**
 * Pre-fetches Nango access tokens for all discovered credentials.
 * Returns a map of credentialId → accessToken.
 * Credentials that fail to resolve are omitted silently.
 */
export async function resolveCredentialTokens(
  credentials: DiscoveredCredential[]
): Promise<Map<string, string>> {
  const tokens = new Map<string, string>()
  await Promise.all(
    credentials.map(async (cred) => {
      try {
        const token = await getNangoToken(cred.id)
        tokens.set(cred.id, token)
      } catch (error) {
        logger.warn(`Failed to pre-fetch token for credential ${cred.id} (${cred.providerId}):`, error)
      }
    })
  )
  return tokens
}

/**
 * Resolves provider-specific extra params needed beyond the access token.
 * Currently handles PostHog project ID — reads from Nango metadata first,
 * then falls back to API auto-discovery.
 * Returns a map of credentialId → extra params record.
 */
export async function resolveCredentialExtras(
  credentials: DiscoveredCredential[],
  tokens: Map<string, string>
): Promise<Map<string, Record<string, string>>> {
  const extras = new Map<string, Record<string, string>>()
  const nangoClient = getNangoClient()

  const posthogCreds = credentials.filter((c) => c.providerId === 'posthog')
  await Promise.all(
    posthogCreds.map(async (cred) => {
      // 1. Try reading projectId from Nango connection metadata (set during connect)
      if (nangoClient && cred.nangoConnectionId) {
        try {
          const providerConfigKey = getNangoProviderConfigKey(cred.providerId)
          const connection = await nangoClient.getConnection(
            providerConfigKey,
            cred.nangoConnectionId
          )
          const metadata = (connection as Record<string, unknown>).metadata as
            | Record<string, unknown>
            | null
            | undefined
          const projectId = String(metadata?.projectId ?? '')
          if (projectId) {
            logger.info(`PostHog projectId from metadata for ${cred.id}: ${projectId}`)
            extras.set(cred.id, { projectId })
            return
          }
        } catch (err) {
          logger.warn(`Failed to read Nango metadata for PostHog credential ${cred.id}:`, err)
        }
      }

      // 2. Fallback: auto-discover first project from PostHog API
      const apiKey = tokens.get(cred.id)
      if (!apiKey) return
      for (const baseUrl of ['https://us.posthog.com', 'https://eu.posthog.com']) {
        try {
          const resp = await fetch(`${baseUrl}/api/projects/`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          })
          if (!resp.ok) continue
          const data = (await resp.json()) as { results?: Array<{ id: number }> }
          const projectId = String(data.results?.[0]?.id ?? '')
          if (projectId) {
            extras.set(cred.id, { projectId })
            return
          }
        } catch {
          // Try next region
        }
      }

      logger.warn(`Could not resolve PostHog project ID for credential ${cred.id}`)
    })
  )

  return extras
}

/**
 * Converts discovered Nango credentials into ToolInput objects for the AgentBlockHandler.
 * Only includes providers that have a known tool mapping.
 * When a token map is provided, injects accessToken directly to bypass the OAuth token fetch.
 * When an extras map is provided, merges additional provider-specific params (e.g., PostHog projectId).
 */
export function credentialsToToolInputs(
  credentials: DiscoveredCredential[],
  tokens?: Map<string, string>,
  extras?: Map<string, Record<string, string>>
): ToolInput[] {
  const tools: ToolInput[] = []
  const seenProviders = new Set<string>()

  for (const cred of credentials) {
    // Only use one credential per provider to avoid duplicate tool names
    // when a user has multiple active credentials for the same service
    if (seenProviders.has(cred.providerId)) continue
    seenProviders.add(cred.providerId)

    const providerTools = PROVIDER_TOOLS[cred.providerId]
    if (!providerTools) continue

    const accessToken = tokens?.get(cred.id)
    const credExtras = extras?.get(cred.id) ?? {}

    for (const { blockType, operation } of providerTools) {
      let params: Record<string, string>

      if (cred.providerId === 'posthog' && accessToken) {
        // PostHog tools use inconsistent auth param names across tools — pre-fill both
        // so every tool gets the key regardless of which param name it declares.
        params = {
          apiKey: accessToken,
          personalApiKey: accessToken,
          operation,
          ...credExtras,
        }
      } else if (accessToken) {
        params = { accessToken, operation, ...credExtras }
      } else {
        params = { credential: cred.id, operation, ...credExtras }
      }

      tools.push({
        type: blockType,
        operation,
        params,
        usageControl: 'auto',
      })
    }
  }

  return tools
}

/**
 * Discovers Composio-connected apps for a user and returns ToolInputs.
 * Calls the Composio REST API directly (the SDK strips connectionParams
 * which contain the OAuth tokens we need).
 */
export async function discoverComposioTools(userId: string): Promise<ToolInput[]> {
  if (!env.COMPOSIO_API_KEY) {
    logger.info('[ToolDiscovery] No COMPOSIO_API_KEY, skipping')
    return []
  }

  try {
    const url = `https://backend.composio.dev/api/v1/connectedAccounts?user_uuid=${encodeURIComponent(userId)}`
    logger.info(`[ToolDiscovery] Fetching Composio connections for ${userId}`)
    const resp = await fetch(url, { headers: { 'x-api-key': env.COMPOSIO_API_KEY } })
    if (!resp.ok) {
      logger.info(`[ToolDiscovery] Composio API returned ${resp.status}`)
      return []
    }

    const data = (await resp.json()) as {
      items: Array<{
        id: string
        appName?: string
        appUniqueId?: string
        status: string
        isDisabled?: boolean
        connectionParams?: Record<string, unknown>
      }>
    }

    const activeConnections = (data.items || []).filter(
      (c) => c.status === 'ACTIVE' && !c.isDisabled
    )
    logger.info(`[ToolDiscovery] Found ${activeConnections.length} active Composio connections: ${activeConnections.map((c) => c.appName).join(', ')}`)

    if (activeConnections.length === 0) return []

    const tools: ToolInput[] = []
    const seenProviders = new Set<string>()

    for (const conn of activeConnections) {
      const appName = (conn.appName || conn.appUniqueId || '').toLowerCase()
      const providerId = COMPOSIO_APP_TO_PROVIDER[appName]
      if (!providerId) {
        logger.info(`[ToolDiscovery] No provider mapping for app: ${appName}`)
        continue
      }
      if (seenProviders.has(providerId)) continue
      seenProviders.add(providerId)

      const providerTools = PROVIDER_TOOLS[providerId]
      if (!providerTools) {
        logger.info(`[ToolDiscovery] No PROVIDER_TOOLS for: ${providerId}`)
        continue
      }

      // Fetch the individual connection to trigger token refresh.
      // The list endpoint returns stale tokens; the detail endpoint
      // triggers Composio's OAuth refresh flow for expired tokens.
      let accessToken: string | undefined
      try {
        const detailResp = await fetch(
          `https://backend.composio.dev/api/v1/connectedAccounts/${conn.id}`,
          { headers: { 'x-api-key': env.COMPOSIO_API_KEY } }
        )
        if (detailResp.ok) {
          const detail = (await detailResp.json()) as {
            connectionParams?: Record<string, unknown>
          }
          const params = detail.connectionParams
          accessToken =
            (params?.access_token as string) ||
            (params?.accessToken as string) ||
            (params?.token as string) ||
            undefined
        }
      } catch (err) {
        logger.warn(`[ToolDiscovery] Failed to fetch fresh token for ${appName} (${conn.id})`)
      }

      // Fall back to token from the list response
      if (!accessToken) {
        const params = conn.connectionParams
        accessToken =
          (params?.access_token as string) ||
          (params?.accessToken as string) ||
          (params?.token as string) ||
          undefined
      }

      if (!accessToken) {
        logger.warn(`[ToolDiscovery] No access token for ${appName} (${conn.id})`)
        continue
      }

      for (const { blockType, operation } of providerTools) {
        tools.push({
          type: blockType,
          operation,
          params: { accessToken, operation },
          usageControl: 'auto',
        })
      }

      logger.info(`[ToolDiscovery] Added ${providerTools.length} tools for ${appName} (provider: ${providerId})`)
    }

    logger.info(`[ToolDiscovery] Total Composio tools: ${tools.length}`)
    return tools
  } catch (error) {
    logger.info('[ToolDiscovery] Failed to discover Composio tools:', error)
    return []
  }
}
