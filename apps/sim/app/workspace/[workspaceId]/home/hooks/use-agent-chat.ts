'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createLogger } from '@sim/logger'
import { generateId } from '@/lib/core/utils/uuid'

const logger = createLogger('useAgentChat')

const STORAGE_PREFIX = 'sim:agentChat:'

const TABLE_MARKER_RE = /\[\[TABLE:([\s\S]*?)\]\]/g
const SCHEDULE_MARKER_RE = /\[\[SCHEDULE:([\s\S]*?)\]\]/g
const ADD_ROWS_MARKER_RE = /\[\[ADD_ROWS:([\s\S]*?)\]\]/g

const MAX_HISTORY_MESSAGES = 40

/**
 * Compresses conversation history before sending to the API.
 * Strips large TABLE/SCHEDULE JSON markers (already persisted server-side)
 * and limits total message count to prevent token overflow.
 */
function compressHistory(
  messages: Array<{ role: string; content: string }>
): Array<{ role: string; content: string }> {
  // Replace heavy markers with short summaries
  const compressed = messages.map((m) => {
    let content = m.content
    content = content.replace(TABLE_MARKER_RE, (_match, json: string) => {
      try {
        const parsed = JSON.parse(json)
        const name = parsed.name || 'table'
        const rowCount = Array.isArray(parsed.rows) ? parsed.rows.length : 0
        return `[Table "${name}" created with ${rowCount} rows]`
      } catch {
        return '[Table created]'
      }
    })
    content = content.replace(SCHEDULE_MARKER_RE, (_match, json: string) => {
      try {
        const parsed = JSON.parse(json)
        return `[Schedule "${parsed.title || 'task'}" created]`
      } catch {
        return '[Schedule created]'
      }
    })
    content = content.replace(ADD_ROWS_MARKER_RE, (_match, json: string) => {
      try {
        const parsed = JSON.parse(json)
        const table = parsed.table || 'table'
        const rowCount = Array.isArray(parsed.rows) ? parsed.rows.length : 0
        return `[Added ${rowCount} rows to "${table}"]`
      } catch {
        return '[Rows added to table]'
      }
    })
    return { role: m.role, content }
  })

  // Keep only the most recent messages if history is too long
  if (compressed.length > MAX_HISTORY_MESSAGES) {
    return compressed.slice(-MAX_HISTORY_MESSAGES)
  }

  return compressed
}

function loadPersistedMessages(workspaceId: string): AgentChatMessage[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${workspaceId}:messages`)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistMessages(workspaceId: string, messages: AgentChatMessage[]): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${workspaceId}:messages`, JSON.stringify(messages))
  } catch {
    // Storage full or unavailable — non-fatal
  }
}

function getOrCreateConversationId(workspaceId: string): string {
  const key = `${STORAGE_PREFIX}${workspaceId}:conversationId`
  try {
    const existing = localStorage.getItem(key)
    if (existing) return existing
    const newId = generateId()
    localStorage.setItem(key, newId)
    return newId
  } catch {
    return generateId()
  }
}

export interface AgentChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}

export interface UseAgentChatReturn {
  messages: AgentChatMessage[]
  isSending: boolean
  statusMessage: string | null
  sendMessage: (text: string) => Promise<void>
  stopGeneration: () => void
  clearMessages: () => void
}

interface UseAgentChatProps {
  workspaceId: string
  model?: string
  onScheduleCreated?: () => void
  onTableCreated?: () => void
}

export function useAgentChat({ workspaceId, model, onScheduleCreated, onTableCreated }: UseAgentChatProps): UseAgentChatReturn {
  const [messages, setMessages] = useState<AgentChatMessage[]>(() => loadPersistedMessages(workspaceId))
  const [isSending, setIsSending] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const messagesRef = useRef<AgentChatMessage[]>(messages)
  messagesRef.current = messages
  const isSendingRef = useRef(false)
  const conversationIdRef = useRef<string>(getOrCreateConversationId(workspaceId))
  const onScheduleCreatedRef = useRef(onScheduleCreated)
  onScheduleCreatedRef.current = onScheduleCreated
  const onTableCreatedRef = useRef(onTableCreated)
  onTableCreatedRef.current = onTableCreated

  useEffect(() => {
    persistMessages(workspaceId, messages)
  }, [workspaceId, messages])

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    const newId = generateId()
    conversationIdRef.current = newId
    try {
      const key = `${STORAGE_PREFIX}${workspaceId}:conversationId`
      localStorage.setItem(key, newId)
    } catch {}
  }, [workspaceId])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isSendingRef.current) return

      const userMessage: AgentChatMessage = {
        id: generateId(),
        role: 'user',
        content: text.trim(),
        createdAt: Date.now(),
      }

      setMessages((prev) => [...prev, userMessage])
      isSendingRef.current = true
      setIsSending(true)

      const assistantId = generateId()
      const assistantMessage: AgentChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
      }
      setMessages((prev) => [...prev, assistantMessage])

      abortControllerRef.current = new AbortController()

      try {
        // Build conversation history for the API (exclude the empty assistant placeholder)
        const rawHistory = [...messagesRef.current.filter((m) => m.content), userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }))
        const history = compressHistory(rawHistory)

        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

        const response = await fetch('/api/home/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: history,
            workspaceId,
            conversationId: conversationIdRef.current,
            model,
            timezone,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(errorData.error || `Request failed: ${response.status}`)
        }

        if (!response.body) {
          throw new Error('No response body')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const jsonStr = line.slice(6)
            if (!jsonStr || jsonStr === '[DONE]') continue

            try {
              const event = JSON.parse(jsonStr) as { type: string; content?: string; error?: string }

              if (event.type === 'status' && event.content) {
                setStatusMessage(event.content)
              } else if (event.type === 'delta' && event.content) {
                setStatusMessage(null)
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: m.content + event.content } : m
                  )
                )
              } else if (event.type === 'schedule_created') {
                onScheduleCreatedRef.current?.()
              } else if (event.type === 'table_created') {
                onTableCreatedRef.current?.()
              } else if (event.type === 'error') {
                throw new Error(event.error || 'Stream error')
              }
            } catch (parseError) {
              if (parseError instanceof SyntaxError) continue
              throw parseError
            }
          }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          logger.info('Agent chat generation stopped by user')
        } else {
          logger.error('Agent chat error:', error)
          const errorText = error instanceof Error ? error.message : 'An error occurred'
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content || `Error: ${errorText}` }
                : m
            )
          )
        }
      } finally {
        isSendingRef.current = false
        setIsSending(false)
        setStatusMessage(null)
        abortControllerRef.current = null
      }
    },
    [workspaceId, model]
  )

  return { messages, isSending, statusMessage, sendMessage, stopGeneration, clearMessages }
}
