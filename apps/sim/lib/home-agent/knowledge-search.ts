import { createLogger } from '@sim/logger'
import { getKnowledgeBases } from '@/lib/knowledge/service'
import { generateSearchEmbedding } from '@/lib/knowledge/embeddings'
import {
  getQueryStrategy,
  handleVectorOnlySearch,
  getDocumentNamesByIds,
} from '@/app/api/knowledge/search/utils'

const logger = createLogger('HomeAgentKB')

/**
 * Searches all knowledge bases in a workspace for content relevant to the user's query.
 * Returns a formatted string to inject into the system prompt.
 */
export async function searchKnowledgeBases(
  userId: string,
  workspaceId: string,
  query: string
): Promise<string> {
  try {
    const knowledgeBases = await getKnowledgeBases(userId, workspaceId, 'active')

    if (knowledgeBases.length === 0) {
      return ''
    }

    const kbIds = knowledgeBases.map((kb) => kb.id)

    logger.info('Searching knowledge bases for home agent', {
      userId,
      workspaceId,
      kbCount: kbIds.length,
      kbNames: knowledgeBases.map((kb) => kb.name),
    })

    const queryEmbedding = await generateSearchEmbedding(query, undefined, workspaceId)
    const queryVector = JSON.stringify(queryEmbedding)

    const strategy = getQueryStrategy(kbIds.length, 5)

    const results = await handleVectorOnlySearch({
      knowledgeBaseIds: kbIds,
      topK: 5,
      queryVector,
      distanceThreshold: strategy.distanceThreshold,
    })

    if (results.length === 0) {
      return ''
    }

    const documentIds = results.map((r) => r.documentId)
    const documentNames = await getDocumentNamesByIds(documentIds)

    const chunks = results.map((r) => {
      const docName = documentNames[r.documentId] || 'Unknown document'
      const similarity = (1 - r.distance).toFixed(2)
      return `[Source: ${docName} (relevance: ${similarity})]\n${r.content}`
    })

    logger.info('Retrieved knowledge base context for home agent', {
      userId,
      resultCount: results.length,
      sources: [...new Set(Object.values(documentNames))],
    })

    return chunks.join('\n\n---\n\n')
  } catch (err) {
    logger.error('Failed to search knowledge bases for home agent:', err)
    return ''
  }
}
