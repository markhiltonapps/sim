import { db } from '@sim/db'
import { copilotChats } from '@sim/db/schema'
import { createLogger } from '@sim/logger'
import { and, eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { getEffectiveDecryptedEnv } from '@/lib/environment/utils'

export const maxDuration = 3600

const logger = createLogger('LocalCopilotBackend')

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
} as const

function sseEvent(data: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)
}

/**
 * Load conversation history from the local DB for the given chatId,
 * excluding the current message (which is saved to DB before orchestration starts).
 * Returns messages in Claude API format.
 */
async function loadConversationHistory(
  chatId: string,
  userId: string,
  currentMessageId?: string
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  try {
    const [chat] = await db
      .select({ messages: copilotChats.messages })
      .from(copilotChats)
      .where(and(eq(copilotChats.id, chatId), eq(copilotChats.userId, userId)))
      .limit(1)

    if (!chat?.messages) return []

    const msgs = Array.isArray(chat.messages) ? chat.messages : []
    return msgs
      .filter(
        (m: unknown) =>
          m &&
          typeof m === 'object' &&
          (m as Record<string, unknown>).role &&
          (m as Record<string, unknown>).content &&
          // Exclude the current user message — it's appended separately
          (currentMessageId
            ? (m as Record<string, unknown>).id !== currentMessageId
            : true)
      )
      .map((m: unknown) => {
        const msg = m as Record<string, unknown>
        return {
          role: (msg.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
          content: String(msg.content),
        }
      })
  } catch (error) {
    logger.warn('Failed to load conversation history', {
      chatId,
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}

/**
 * POST /api/mothership
 *
 * Local dev replacement for the copilot.sim.ai Go backend.
 * Activated by setting SIM_AGENT_API_URL=http://localhost:3000 in .env.
 *
 * Accepts the same payload the orchestrator sends to the Go backend,
 * fetches the user's ANTHROPIC_API_KEY from their secrets, and streams
 * Claude responses back as SSE events in the format the orchestrator expects.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      message,
      userId,
      workspaceId,
      chatId,
      messageId,
      context,
      workspaceContext,
    }: {
      message?: string
      userId?: string
      workspaceId?: string
      chatId?: string
      messageId?: string
      context?: Array<{ type: string; content: string }>
      workspaceContext?: string
    } = body

    if (!message || !userId) {
      return NextResponse.json({ error: 'Missing message or userId' }, { status: 400 })
    }

    const decryptedEnv = await getEffectiveDecryptedEnv(userId, workspaceId)
    const apiKey = decryptedEnv?.ANTHROPIC_API_KEY

    if (!apiKey) {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            sseEvent({
              type: 'content',
              data:
                'No ANTHROPIC_API_KEY found. Please add it in **Settings → Secrets** and refresh.',
            })
          )
          controller.enqueue(sseEvent({ type: 'done', data: { response: {} } }))
          controller.close()
        },
      })
      return new Response(stream, { headers: SSE_HEADERS })
    }

    // Build system prompt from workspace context and attached contexts
    const systemParts: string[] = ['You are a helpful AI assistant.']
    if (workspaceContext) {
      systemParts.push(`\nWorkspace context:\n${workspaceContext}`)
    }
    if (Array.isArray(context) && context.length > 0) {
      const contextText = context.map((c) => c.content).join('\n\n')
      systemParts.push(`\nAdditional context:\n${contextText}`)
    }
    const systemPrompt = systemParts.join('\n')

    // Load prior conversation turns from DB, excluding the current message
    const history = chatId ? await loadConversationHistory(chatId, userId, messageId) : []
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...history,
      { role: 'user', content: message },
    ]

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: 'claude-opus-4-6',
              max_tokens: 8096,
              system: systemPrompt,
              messages,
              stream: true,
            }),
          })

          if (!anthropicRes.ok) {
            const errorText = await anthropicRes.text().catch(() => '')
            controller.enqueue(
              sseEvent({
                type: 'error',
                data: { message: `Anthropic API error ${anthropicRes.status}: ${errorText}` },
              })
            )
            controller.close()
            return
          }

          const reader = anthropicRes.body!.getReader()
          const decoder = new TextDecoder()
          let buf = ''
          let inputTokens = 0
          let outputTokens = 0

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buf += decoder.decode(value, { stream: true })
            const lines = buf.split('\n')
            buf = lines.pop() || ''

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const raw = line.slice(6).trim()
              if (raw === '[DONE]') continue
              try {
                const evt = JSON.parse(raw)
                if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
                  controller.enqueue(
                    sseEvent({ type: 'content', data: evt.delta.text as string })
                  )
                } else if (evt.type === 'message_start' && evt.message?.usage) {
                  inputTokens = (evt.message.usage.input_tokens as number) || 0
                } else if (evt.type === 'message_delta' && evt.usage) {
                  outputTokens = (evt.usage.output_tokens as number) || 0
                }
              } catch {
                // ignore malformed chunks
              }
            }
          }

          // Claude Opus 4.6 pricing per million tokens (approximate)
          const inputCostPer1M = 15
          const outputCostPer1M = 75
          controller.enqueue(
            sseEvent({
              type: 'done',
              data: {
                response: {},
                usage: { input_tokens: inputTokens, output_tokens: outputTokens },
                cost: {
                  input: (inputTokens / 1_000_000) * inputCostPer1M,
                  output: (outputTokens / 1_000_000) * outputCostPer1M,
                  total:
                    (inputTokens / 1_000_000) * inputCostPer1M +
                    (outputTokens / 1_000_000) * outputCostPer1M,
                },
              },
            })
          )
          controller.close()
        } catch (error) {
          logger.error('Streaming error in local copilot backend', { error })
          controller.enqueue(
            sseEvent({
              type: 'error',
              data: { message: error instanceof Error ? error.message : 'Streaming error' },
            })
          )
          controller.close()
        }
      },
    })

    return new Response(stream, { headers: SSE_HEADERS })
  } catch (error) {
    logger.error('Local copilot backend request error', { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
