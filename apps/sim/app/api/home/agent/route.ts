import { db } from '@sim/db'
import { userTableDefinitions, userTableRows, workflowSchedule } from '@sim/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { createLogger } from '@sim/logger'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { SSE_HEADERS, encodeSSE } from '@/lib/core/utils/sse'
import { generateId } from '@/lib/core/utils/uuid'
import { env } from '@/lib/core/config/env'
import { getEffectiveDecryptedEnv } from '@/lib/environment/utils'
import { validateCronExpression } from '@/lib/workflows/schedules/utils'
import {
  credentialsToToolInputs,
  discoverComposioTools,
  discoverNangoCredentials,
  resolveCredentialExtras,
  resolveCredentialTokens,
} from '@/lib/home-agent/tool-discovery'
import { addConversationMemory, searchMemories } from '@/lib/home-agent/mem0'
import { searchKnowledgeBases } from '@/lib/home-agent/knowledge-search'
import { AgentBlockHandler } from '@/executor/handlers/agent/agent-handler'
import type { AgentInputs, Message } from '@/executor/handlers/agent/types'
import type { ExecutionContext, StreamingExecution } from '@/executor/types'
import type { SerializedBlock } from '@/serializer/types'

const logger = createLogger('HomeAgentAPI')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string(),
    })
  ),
  workspaceId: z.string(),
  conversationId: z.string().optional(),
  model: z.string().optional(),
  timezone: z.string().optional(),
})

function buildMinimalContext(opts: {
  workflowId: string
  workspaceId: string
  executionId: string
  userId: string
  environmentVariables: Record<string, string>
  abortSignal: AbortSignal
}): ExecutionContext {
  const { workflowId, workspaceId, executionId, userId, environmentVariables, abortSignal } = opts
  return {
    workflowId,
    workspaceId,
    executionId,
    userId,
    blockStates: new Map(),
    executedBlocks: new Set(),
    blockLogs: [],
    metadata: {
      workflowId,
      workspaceId,
      executionId,
      userId,
      duration: 0,
    },
    environmentVariables,
    decisions: {
      router: new Map(),
      condition: new Map(),
    },
    completedLoops: new Set(),
    activeExecutionPath: new Set(),
    stream: true,
    selectedOutputs: ['home-agent-block'],
    edges: [],
    abortSignal,
  }
}

const SCHEDULE_MARKER_RE = /\[\[SCHEDULE:([\s\S]*?)\]\]/g

async function createSchedulesFromResponse(
  content: string,
  workspaceId: string,
  userId: string,
  requestId: string
): Promise<void> {
  const matches = [...content.matchAll(SCHEDULE_MARKER_RE)]
  if (matches.length === 0) return

  for (const match of matches) {
    try {
      let raw = match[1]
      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(raw)
      } catch {
        raw = raw.replace(/\\"/g, '"').replace(/\\\\"/g, '\\"')
        parsed = JSON.parse(raw)
      }

      const title = String(parsed.title || '').trim()
      const prompt = String(parsed.prompt || '').trim()
      const cronExpression = String(parsed.cronExpression || '').trim()
      const tz = String(parsed.timezone || 'UTC')
      const lifecycle = parsed.lifecycle === 'until_complete' ? 'until_complete' : 'persistent'
      const maxRuns = typeof parsed.maxRuns === 'number' ? parsed.maxRuns : null

      if (!title || !prompt || !cronExpression) {
        logger.warn(`[${requestId}] Skipping schedule — missing required fields`)
        continue
      }

      const validation = validateCronExpression(cronExpression, tz)
      if (!validation.isValid) {
        logger.warn(`[${requestId}] Skipping schedule — invalid cron: ${validation.error}`)
        continue
      }

      const now = new Date()
      const id = generateId()

      await db.insert(workflowSchedule).values({
        id,
        cronExpression,
        triggerType: 'schedule',
        sourceType: 'job',
        status: 'active',
        timezone: tz,
        nextRunAt: validation.nextRun!,
        createdAt: now,
        updatedAt: now,
        failedCount: 0,
        jobTitle: title,
        prompt,
        lifecycle,
        maxRuns,
        runCount: 0,
        sourceWorkspaceId: workspaceId,
        sourceUserId: userId,
      })

      logger.info(`[${requestId}] Created schedule "${title}" (${id})`, { cronExpression, tz })
    } catch (err) {
      logger.error(`[${requestId}] Failed to create schedule from agent response:`, err)
    }
  }
}

const TABLE_MARKER_RE = /\[\[TABLE:([\s\S]*?)\]\]/g
const ADD_ROWS_MARKER_RE = /\[\[ADD_ROWS:([\s\S]*?)\]\]/g

interface TableColumn {
  name: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'json'
  required?: boolean
}

async function createTablesFromResponse(
  content: string,
  workspaceId: string,
  userId: string,
  requestId: string
): Promise<string[]> {
  const matches = [...content.matchAll(TABLE_MARKER_RE)]
  if (matches.length === 0) return []

  const createdIds: string[] = []

  for (const match of matches) {
    try {
      let raw = match[1]
      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(raw)
      } catch {
        raw = raw.replace(/\\"/g, '"').replace(/\\\\"/g, '\\"')
        parsed = JSON.parse(raw)
      }

      const name = String(parsed.name || '').trim()
      const description = parsed.description ? String(parsed.description).trim() : null
      const columns = parsed.columns as TableColumn[] | undefined
      const rows = parsed.rows as Array<Record<string, unknown>> | undefined

      if (!name || !columns || !Array.isArray(columns) || columns.length === 0) {
        logger.warn(`[${requestId}] Skipping table — missing name or columns`)
        continue
      }

      const id = generateId()
      const now = new Date()

      await db.insert(userTableDefinitions).values({
        id,
        workspaceId,
        name,
        description,
        schema: { columns },
        maxRows: 10000,
        rowCount: 0,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })

      logger.info(`[${requestId}] Created table "${name}" (${id})`, {
        columnCount: columns.length,
      })

      if (rows && Array.isArray(rows) && rows.length > 0) {
        const rowValues = rows.map((rowData, idx) => ({
          id: generateId(),
          tableId: id,
          workspaceId,
          data: rowData,
          position: idx,
          createdAt: now,
          updatedAt: now,
          createdBy: userId,
        }))

        await db.insert(userTableRows).values(rowValues)

        await db
          .update(userTableDefinitions)
          .set({ rowCount: rows.length, updatedAt: now })
          .where(eq(userTableDefinitions.id, id))

        logger.info(`[${requestId}] Inserted ${rows.length} rows into table "${name}"`)
      }

      createdIds.push(id)
    } catch (err) {
      logger.error(`[${requestId}] Failed to create table from agent response:`, err)
    }
  }

  return createdIds
}

async function addRowsFromResponse(
  content: string,
  workspaceId: string,
  userId: string,
  requestId: string
): Promise<number> {
  const matches = [...content.matchAll(ADD_ROWS_MARKER_RE)]
  if (matches.length === 0) return 0

  let totalAdded = 0

  for (const match of matches) {
    try {
      let raw = match[1]
      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(raw)
      } catch {
        raw = raw.replace(/\\"/g, '"').replace(/\\\\"/g, '\\"')
        parsed = JSON.parse(raw)
      }

      const tableName = String(parsed.table || '').trim()
      const rows = parsed.rows as Array<Record<string, unknown>> | undefined

      if (!tableName || !rows || !Array.isArray(rows) || rows.length === 0) {
        logger.warn(`[${requestId}] Skipping ADD_ROWS — missing table name or rows`)
        continue
      }

      // Look up the table by name within the workspace (non-archived only)
      const [existingTable] = await db
        .select({ id: userTableDefinitions.id, rowCount: userTableDefinitions.rowCount })
        .from(userTableDefinitions)
        .where(
          and(
            eq(userTableDefinitions.workspaceId, workspaceId),
            eq(userTableDefinitions.name, tableName),
            isNull(userTableDefinitions.archivedAt)
          )
        )
        .limit(1)

      if (!existingTable) {
        logger.warn(`[${requestId}] ADD_ROWS: table "${tableName}" not found in workspace ${workspaceId}`)
        continue
      }

      const now = new Date()
      const startPosition = existingTable.rowCount

      const rowValues = rows.map((rowData, idx) => ({
        id: generateId(),
        tableId: existingTable.id,
        workspaceId,
        data: rowData,
        position: startPosition + idx,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
      }))

      await db.insert(userTableRows).values(rowValues)

      await db
        .update(userTableDefinitions)
        .set({ rowCount: startPosition + rows.length, updatedAt: now })
        .where(eq(userTableDefinitions.id, existingTable.id))

      totalAdded += rows.length
      logger.info(`[${requestId}] Added ${rows.length} rows to table "${tableName}" (${existingTable.id})`)
    } catch (err) {
      logger.error(`[${requestId}] Failed to add rows from agent response:`, err)
    }
  }

  return totalAdded
}

const FAST_MODEL = 'claude-haiku-4-5-20251001'
const POWERFUL_MODEL = 'claude-sonnet-4-6'

/**
 * Routes queries to the appropriate model based on complexity.
 * Simple queries use Haiku (fast), complex ones use Sonnet (capable).
 */
function selectModel(
  latestMessage: string,
  hasTools: boolean,
  hasKbContext: boolean,
): string {
  const msg = latestMessage.toLowerCase().trim()
  const wordCount = msg.split(/\s+/).length

  // Very short messages (greetings, confirmations) → fast model
  if (wordCount <= 3) return FAST_MODEL

  // Patterns that indicate complex tasks → powerful model
  const complexPatterns = [
    // Multi-step requests
    /\b(and then|after that|once .* done|step[s]?\s*\d|first .* then)\b/,
    // Analysis / research
    /\b(analy[zs]e|research|compare|investigate|deep dive|comprehensive|detailed report)\b/,
    // Creative / generation
    /\b(write me a|draft|compose|create a .*(report|document|presentation|proposal))\b/,
    // Scheduling (needs to produce correct JSON markers)
    /\b(schedule|every (morning|day|week|monday|tuesday|wednesday|thursday|friday)|recurring|cron|remind me)\b/,
    // Table creation or adding rows (needs to produce correct JSON markers)
    /\b(create a table|make a (table|spreadsheet|tracker)|build a .*(table|database|tracker))\b/,
    /\b(add .*(rows?|leads?|entries|records|data|more)|more .*(leads?|rows?|entries|records)|append|insert .* (to|into))\b/,
    // Multi-tool orchestration
    /\b(check my .* and (then |also )?(send|create|update|forward))\b/,
    // Long messages often mean complex requests
  ]

  for (const pattern of complexPatterns) {
    if (pattern.test(msg)) return POWERFUL_MODEL
  }

  // Long messages (>50 words) likely need more reasoning
  if (wordCount > 50) return POWERFUL_MODEL

  // If we have KB context and the user is asking about it, Haiku can handle Q&A
  if (hasKbContext) return FAST_MODEL

  // If tools are available and the message mentions a service → powerful (better tool use)
  if (hasTools) {
    const toolMentions = /\b(email|calendar|slack|github|jira|linear|notion|drive|sheets|hubspot|asana|posthog|search the web|look up|find online)\b/
    if (toolMentions.test(msg)) return POWERFUL_MODEL
  }

  // Default: fast model for everything else (general chat, Q&A, follow-ups)
  return FAST_MODEL
}

function buildAgentBlock(): SerializedBlock {
  return {
    id: 'home-agent-block',
    position: { x: 0, y: 0 },
    config: { tool: 'agent', params: {} },
    inputs: {},
    outputs: {},
    metadata: { id: 'agent', name: 'Home Agent' },
    enabled: true,
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { messages, workspaceId, conversationId: clientConversationId, model, timezone } = parsed.data
  const userId = session.user.id
  const executionId = generateId()
  const requestId = generateId()

  logger.info(`[${requestId}] Home agent request`, { workspaceId, userId, messageCount: messages.length })

  const abortController = new AbortController()
  request.signal.addEventListener('abort', () => abortController.abort())

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const emitStatus = (message: string) => {
          controller.enqueue(encodeSSE({ type: 'status', content: message }))
        }

        emitStatus('Loading your connected services...')

        // Discover tools from connected Nango credentials, Composio, and load env vars in parallel
        const [credentials, composioTools, decryptedEnv] = await Promise.all([
          discoverNangoCredentials(workspaceId, userId),
          discoverComposioTools(userId),
          getEffectiveDecryptedEnv(userId, workspaceId),
        ])
        // Pre-fetch Nango tokens to inject as accessToken directly, bypassing
        // the per-tool OAuth token fetch which requires a valid DB workflowId.
        const tokens = await resolveCredentialTokens(credentials)
        // Resolve provider-specific extras (e.g., PostHog project ID auto-discovery)
        const extras = await resolveCredentialExtras(credentials, tokens)
        const nangoTools = credentialsToToolInputs(credentials, tokens, extras)

        // Merge: Nango tools first, then Composio tools for providers not already covered.
        // Deduplicate by type+operation to avoid "Tool names must be unique" API errors.
        const seenToolKeys = new Set<string>()
        const tools: typeof nangoTools = []
        for (const tool of [...nangoTools, ...composioTools]) {
          const key = `${tool.type}:${tool.operation}`
          if (seenToolKeys.has(key)) continue
          seenToolKeys.add(key)
          tools.push(tool)
        }

        // Inject env-var-powered tools (web search, etc.)
        const tavilyKey = decryptedEnv.TAVILY_API_KEY
        if (tavilyKey) {
          tools.push(
            { type: 'tavily', operation: 'tavily_search', params: { apiKey: tavilyKey }, usageControl: 'auto' },
            { type: 'tavily', operation: 'tavily_extract', params: { apiKey: tavilyKey }, usageControl: 'auto' },
          )
        }
        // Serper (Google Search) — available when API key is configured
        const serperKey = decryptedEnv.SERPER_API_KEY || env.SERPER_API_KEY
        if (serperKey) {
          tools.push(
            { type: 'serper', operation: 'serper_search', params: { apiKey: serperKey }, usageControl: 'auto' },
          )
        }
        // DuckDuckGo is free — always available as a fallback
        tools.push(
          { type: 'duckduckgo', operation: 'duckduckgo_search', params: {}, usageControl: 'auto' },
        )


        const apiKey = decryptedEnv.ANTHROPIC_API_KEY
        if (!apiKey) {
          controller.enqueue(
            encodeSSE({
              type: 'delta',
              content:
                'No ANTHROPIC_API_KEY found. Please add it in **Settings → Secrets** and refresh.',
            })
          )
          controller.enqueue(encodeSSE({ type: 'done' }))
          controller.close()
          return
        }

        const ctx = buildMinimalContext({
          workflowId: `home-${workspaceId}`,
          workspaceId,
          executionId,
          userId,
          environmentVariables: decryptedEnv,
          abortSignal: abortController.signal,
        })

        const block = buildAgentBlock()

        // Build a capability summary from the actual tool types present
        const blockTypes = new Set(tools.map((t) => t.type).filter(Boolean))
        const BLOCK_TYPE_LABELS: Record<string, string> = {
          outlook: 'Outlook email (read, send, draft, forward)',
          outlook_calendar: 'Outlook Calendar (list, create, update, delete events)',
          gmail_v2: 'Gmail (read, send, draft, search)',
          google_calendar_v2: 'Google Calendar (list, create, update, delete events)',
          google_drive: 'Google Drive (list, read, upload files)',
          google_sheets_v2: 'Google Sheets (read, write, append)',
          google_docs: 'Google Docs (read, create, append)',
          slack: 'Slack (send messages, read channels)',
          notion_v2: 'Notion (pages and databases)',
          github_v2: 'GitHub (repos, issues, pull requests)',
          jira: 'Jira (issues)',
          linear_v2: 'Linear (issues)',
          asana: 'Asana (tasks)',
          hubspot: 'HubSpot (contacts, deals)',
          posthog: 'PostHog (analytics queries, feature flags, insights, event capture)',
          tavily: 'Web Search (search the internet, extract content from URLs)',
          serper: 'Google Search (search Google for web pages, LinkedIn profiles, company info, etc.)',
          duckduckgo: 'DuckDuckGo (quick web lookups and instant answers)',
        }
        const capabilityList = [...blockTypes]
          .map((bt) => BLOCK_TYPE_LABELS[bt as string] ?? bt)
          .join('\n- ')

        const now = new Date()
        const localeDateStr = now.toLocaleDateString('en-US', {
          timeZone: timezone,
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
        const localeTimeStr = now.toLocaleTimeString('en-US', {
          timeZone: timezone,
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short',
        })
        const timezoneInfo = `\n\nCurrent date and time: ${localeDateStr}, ${localeTimeStr}${timezone ? `. User's timezone: ${timezone}` : ''}. Always display dates and times in the user's local timezone unless they ask otherwise.`

        // Retrieve long-term memories and knowledge base context in parallel
        // Skip expensive KB search for trivial messages (greetings, short confirmations)
        const latestUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || ''
        const wordCount = latestUserMessage.trim().split(/\s+/).length
        const isTrivial = wordCount <= 4 && /^(hi|hey|hello|thanks|thank you|ok|yes|no|sure|good|great|bye|sup|yo|what's up)\b/i.test(latestUserMessage.trim())

        if (!isTrivial) {
          emitStatus('Searching your knowledge base and memories...')
        }

        const [mem0Facts, kbContext, existingTables] = await Promise.all([
          searchMemories(userId, latestUserMessage),
          isTrivial ? Promise.resolve('') : searchKnowledgeBases(userId, workspaceId, latestUserMessage),
          db
            .select({
              name: userTableDefinitions.name,
              description: userTableDefinitions.description,
              schema: userTableDefinitions.schema,
              rowCount: userTableDefinitions.rowCount,
            })
            .from(userTableDefinitions)
            .where(
              and(
                eq(userTableDefinitions.workspaceId, workspaceId),
                isNull(userTableDefinitions.archivedAt)
              )
            ),
        ])
        const longTermMemoryBlock = mem0Facts
          ? `\n\nHere is what you remember about this user from previous conversations:\n${mem0Facts}\n\nUse these memories naturally in your responses. If the user corrects any of these facts, acknowledge the correction.`
          : ''
        const knowledgeBaseBlock = kbContext
          ? `\n\nRelevant information from the user's knowledge base documents:\n${kbContext}\n\nUse this information to answer the user's questions. Cite the source document name when referencing this information.`
          : ''

        const connectInstruction = `\n\nIf the user asks to connect, add, link, or set up any app or service, respond naturally and include [[CONNECT:serviceId]] on its own line, where serviceId is one of: outlook, google-email, slack, google-calendar, notion, github, jira, linear, google-drive, google-sheets, hubspot, asana, posthog. Example: "Sure, let's connect Slack!\n[[CONNECT:slack]]"`

        const memoryInstruction = `\n\nYou have persistent memory across conversations. You can remember things the user tells you (preferences, names, facts) and recall them in future conversations. When the user asks you to remember something, confirm that you will remember it. You do NOT need any special tools for this — your conversation history is automatically preserved.`

        const scheduleInstruction = `\n\nYou can create scheduled/recurring tasks for the user. When the user asks you to schedule something (e.g., "send me a daily report", "check my email every morning", "remind me every Monday"), respond naturally describing what you'll set up and include a [[SCHEDULE:json]] marker on its own line with these fields:
- title: short name for the task
- prompt: detailed instruction for the AI to execute each time (be specific — include what to do, what tools to use, and who to send results to if applicable)
- cronExpression: standard 5-field cron expression (minute hour day-of-month month day-of-week)
- timezone: user's timezone (use "${timezone || 'UTC'}")
- lifecycle: "persistent" (runs forever) or "until_complete" (stops when done)

Common cron examples: "0 9 * * *" = daily at 9am, "0 9 * * 1" = every Monday 9am, "*/30 * * * *" = every 30 minutes, "0 8 1 * *" = 1st of each month at 8am.

Example: "I'll set up a daily email digest for you at 9am!\n[[SCHEDULE:{\\"title\\":\\"Daily Email Digest\\",\\"prompt\\":\\"Check the user's inbox for new emails from the last 24 hours. Summarize the important ones and send a digest email to the user.\\",\\"cronExpression\\":\\"0 9 * * *\\",\\"timezone\\":\\"America/New_York\\",\\"lifecycle\\":\\"persistent\\"}]]"`

        // Build existing tables context
        const existingTablesBlock = existingTables.length > 0
          ? `\n\nThe user has the following existing tables:\n${existingTables.map((t) => {
              const cols = (t.schema as { columns: TableColumn[] })?.columns || []
              const colNames = cols.map((c) => c.name).join(', ')
              return `- "${t.name}" (${t.rowCount} rows) — columns: ${colNames}${t.description ? ` — ${t.description}` : ''}`
            }).join('\n')}`
          : ''

        const tableInstruction = `\n\nYou can create data tables for the user. When the user asks you to create a table, spreadsheet, tracker, or any structured data store, respond naturally describing what you'll create and include a [[TABLE:json]] marker on its own line with these fields:
- name: table name using snake_case (letters, numbers, underscores only, must start with a letter or underscore)
- description: optional description of the table's purpose
- columns: array of column definitions, each with: name (snake_case), type ("string", "number", "boolean", "date", or "json"), and optionally required (true/false)
- rows: optional array of initial data rows (objects with column names as keys)

Example: "I'll create a sales leads tracker for you!\n[[TABLE:{\\"name\\":\\"sales_leads\\",\\"description\\":\\"Track potential sales leads and their status\\",\\"columns\\":[{\\"name\\":\\"company\\",\\"type\\":\\"string\\",\\"required\\":true},{\\"name\\":\\"contact_name\\",\\"type\\":\\"string\\"},{\\"name\\":\\"email\\",\\"type\\":\\"string\\"},{\\"name\\":\\"deal_size\\",\\"type\\":\\"number\\"},{\\"name\\":\\"status\\",\\"type\\":\\"string\\"},{\\"name\\":\\"next_followup\\",\\"type\\":\\"date\\"}],\\"rows\\":[{\\"company\\":\\"Acme Corp\\",\\"contact_name\\":\\"John Smith\\",\\"email\\":\\"john@acme.com\\",\\"deal_size\\":50000,\\"status\\":\\"Discovery\\"}]}]]"

You can also ADD ROWS to an existing table. When the user asks you to add more data to an existing table, use [[ADD_ROWS:json]] with these fields:
- table: the exact snake_case name of the existing table
- rows: array of row objects (keys must match the table's column names)

Example: "I'll add those new leads to your table!\n[[ADD_ROWS:{\\"table\\":\\"sales_leads\\",\\"rows\\":[{\\"company\\":\\"NewCo\\",\\"contact_name\\":\\"Jane Doe\\",\\"email\\":\\"jane@newco.com\\",\\"deal_size\\":75000,\\"status\\":\\"Prospecting\\"}]}]]"

IMPORTANT: When adding rows, you MUST include the actual data in the [[ADD_ROWS:...]] marker. Do NOT say you will add data without including it — each message is independent, you cannot "work on it" between messages. Always produce the data in the same response.${existingTablesBlock}`

        const hasWebSearch = blockTypes.has('serper') || blockTypes.has('tavily') || blockTypes.has('duckduckgo')
        const capabilityGuardrail = hasWebSearch
          ? `\n\nCRITICAL RULES:
- You have web search tools available. USE THEM to find real information (LinkedIn profiles, company websites, etc.) instead of making up data. When the user asks you to find LinkedIn URLs or other web data, use your search tools to look them up.
- When searching for a person's LinkedIn, use a query like: site:linkedin.com "FirstName LastName" "Company". Include the actual URL from the search results.
- Each response is self-contained. You have NO background processing — you cannot "work on something" between messages. Everything you produce must be in the current response.
- When you cannot find real data via search, be transparent about which entries are real vs. not found. Never fabricate URLs — either find them or mark them as "not found".
- For large batches (e.g., finding LinkedIn URLs for 100+ leads), work through as many as you can in a single response. If you run out of space, tell the user how many you completed and that they can ask you to continue with the rest.`
          : `\n\nCRITICAL RULES:
- You do NOT have internet access. You cannot browse the web, search Google, look up LinkedIn profiles, visit URLs, or fetch live data. Do not promise to "search for" or "look up" information you cannot access.
- Each response is self-contained. You have NO background processing — you cannot "work on something" between messages. Everything you produce must be in the current response.
- If the user asks you to find real-time data (e.g., LinkedIn URLs, live stock prices, current news), be honest: explain that you don't have web access and suggest they connect a relevant service or provide the data themselves.
- When generating data (leads, contacts, etc.), be transparent that the data is AI-generated/synthetic, not sourced from the internet. If you add columns like URLs or social links, clearly state the values are placeholders unless the user provides real data.`

        const systemPrompt = tools.length > 0
          ? `You are a helpful AI assistant with access to the following connected services. Use the available tools proactively to answer the user's questions and complete tasks.\n\nAvailable capabilities:\n- ${capabilityList}\n\nIMPORTANT: The services listed above are CURRENTLY CONNECTED and authorized. You have working access tokens for all of them. Do NOT tell the user that a listed service is "not connected" or "needs authorization" — it is already connected. If a tool call fails, retry or report the specific error, but never claim the service is unavailable when it is listed above. Ignore any prior conversation messages that suggested a service was not connected — the connection status above reflects the CURRENT state.${longTermMemoryBlock}${knowledgeBaseBlock}${timezoneInfo}${connectInstruction}${memoryInstruction}${scheduleInstruction}${tableInstruction}${capabilityGuardrail}\n\nBe concise and helpful.`
          : `You are a helpful AI assistant. The user has not connected any external services yet. Encourage them to connect apps to enable email, calendar, and other integrations.${longTermMemoryBlock}${knowledgeBaseBlock}${timezoneInfo}${connectInstruction}${memoryInstruction}${scheduleInstruction}${tableInstruction}${capabilityGuardrail}`

        const conversationId = clientConversationId || `home-agent-${workspaceId}-${userId}`

        const selectedModel = model || selectModel(latestUserMessage, tools.length > 0, !!kbContext)
        logger.info(`[${requestId}] Model selected: ${selectedModel}`, {
          latestMessageLength: latestUserMessage.length,
          hasTools: tools.length > 0,
          hasKbContext: !!kbContext,
        })

        const inputs: AgentInputs = {
          model: selectedModel,
          systemPrompt,
          messages: messages as Message[],
          tools,
          memoryType: 'sliding_window_tokens',
          slidingWindowTokens: '32000',
          conversationId,
          apiKey,
        }

        emitStatus(selectedModel === FAST_MODEL ? 'Generating response...' : 'Thinking deeply...')

        const handler = new AgentBlockHandler()
        const result = await handler.execute(ctx, block, inputs)

        let fullResponse = ''

        if (result && typeof result === 'object' && 'stream' in result && (result as StreamingExecution).stream) {
          // Streaming response — pipe chunks as SSE events
          const streamingResult = result as StreamingExecution
          const reader = streamingResult.stream.getReader()
          const decoder = new TextDecoder()

          try {
            while (true) {
              if (abortController.signal.aborted) break
              const { done, value } = await reader.read()
              if (done) break
              const chunk = decoder.decode(value, { stream: true })
              fullResponse += chunk
              controller.enqueue(encodeSSE({ type: 'delta', content: chunk }))
            }
          } finally {
            reader.releaseLock()
          }
        } else if (result && typeof result === 'object' && 'content' in result) {
          // Non-streaming response — send full content
          fullResponse = String(result.content || '')
          controller.enqueue(encodeSSE({ type: 'delta', content: fullResponse }))
        }

        // Auto-create any schedules the agent proposed
        if (fullResponse.includes('[[SCHEDULE:')) {
          await createSchedulesFromResponse(fullResponse, workspaceId, userId, requestId)
          controller.enqueue(encodeSSE({ type: 'schedule_created' }))
        }

        // Auto-create any tables the agent proposed
        if (fullResponse.includes('[[TABLE:')) {
          await createTablesFromResponse(fullResponse, workspaceId, userId, requestId)
          controller.enqueue(encodeSSE({ type: 'table_created' }))
        }

        // Auto-add rows to existing tables
        if (fullResponse.includes('[[ADD_ROWS:')) {
          const addedCount = await addRowsFromResponse(fullResponse, workspaceId, userId, requestId)
          if (addedCount > 0) {
            controller.enqueue(encodeSSE({ type: 'table_created' }))
          }
        }

        // Store conversation in mem0 for long-term fact extraction (fire and forget)
        if (fullResponse && latestUserMessage) {
          addConversationMemory(userId, [
            { role: 'user', content: latestUserMessage },
            { role: 'assistant', content: fullResponse },
          ]).catch((err) => logger.error(`[${requestId}] mem0 storage error:`, err))
        }

        controller.enqueue(encodeSSE({ type: 'done' }))
        controller.close()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Execution error'
        logger.error(`[${requestId}] Home agent error:`, error)
        controller.enqueue(encodeSSE({ type: 'error', error: message }))
        controller.close()
      }
    },
    cancel() {
      abortController.abort()
    },
  })

  return new Response(stream, { headers: SSE_HEADERS })
}
