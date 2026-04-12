import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

interface ComposioConnection {
  id: string
  app: string
  status: string
  connectedAt: string
}

export const composioKeys = {
  all: ['composio'] as const,
  connections: () => [...composioKeys.all, 'connections'] as const,
}

export function useComposioConnections() {
  return useQuery({
    queryKey: composioKeys.connections(),
    queryFn: async ({ signal }) => {
      const res = await fetch('/api/composio/connections', { signal })
      if (!res.ok) throw new Error('Failed to fetch connections')
      const data = (await res.json()) as { connections: ComposioConnection[] }
      return data.connections
    },
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  })
}

export function useComposioConnect() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ app, redirectUrl }: { app: string; redirectUrl?: string }) => {
      const res = await fetch('/api/composio/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app, redirectUrl }),
      })
      if (!res.ok) {
        const err = (await res.json()) as { error: string }
        throw new Error(err.error || 'Failed to initiate connection')
      }
      return res.json() as Promise<{
        redirectUrl: string | null
        connectedAccountId: string
        status: string
      }>
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: composioKeys.connections() })
    },
  })
}

export function useComposioDisconnect() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ connectedAccountId }: { connectedAccountId: string }) => {
      const res = await fetch('/api/composio/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectedAccountId }),
      })
      if (!res.ok) {
        const err = (await res.json()) as { error: string }
        throw new Error(err.error || 'Failed to disconnect')
      }
      return res.json() as Promise<{ success: boolean }>
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: composioKeys.connections() })
    },
  })
}
