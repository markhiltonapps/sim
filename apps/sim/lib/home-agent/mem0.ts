import { createLogger } from '@sim/logger'
import MemoryClient from 'mem0ai'

const logger = createLogger('Mem0')

let client: MemoryClient | null = null

function getClient(): MemoryClient | null {
  if (client) return client
  const apiKey = process.env.MEM0_API_KEY
  if (!apiKey) {
    logger.warn('MEM0_API_KEY not set — long-term memory disabled')
    return null
  }
  client = new MemoryClient({ apiKey })
  return client
}

/**
 * Extracts and stores facts from conversation messages.
 * Called after each agent response completes.
 */
export async function addConversationMemory(
  userId: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<void> {
  const mem0 = getClient()
  if (!mem0) return

  try {
    await mem0.add(messages, { user_id: userId })
    logger.info('Stored conversation memories', { userId, messageCount: messages.length })
  } catch (err) {
    logger.error('Failed to store memories in mem0:', err)
  }
}

/**
 * Searches for memories relevant to the user's current message.
 * Returns a formatted string to inject into the system prompt.
 */
export async function searchMemories(userId: string, query: string): Promise<string> {
  const mem0 = getClient()
  if (!mem0) return ''

  try {
    const results = await mem0.search(query, {
      user_id: userId,
      limit: 10,
    })

    if (!results || !Array.isArray(results) || results.length === 0) {
      return ''
    }

    const facts = results
      .map((r: { memory?: string }) => r.memory)
      .filter(Boolean)

    if (facts.length === 0) return ''

    logger.info('Retrieved memories from mem0', { userId, factCount: facts.length })
    return facts.filter((f): f is string => typeof f === 'string').map((f) => `- ${f}`).join('\n')
  } catch (err) {
    logger.error('Failed to search mem0:', err)
    return ''
  }
}
