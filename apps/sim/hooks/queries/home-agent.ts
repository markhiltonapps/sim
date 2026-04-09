'use client'

import { useQuery } from '@tanstack/react-query'

export interface ConnectedService {
  credentialId: string
  providerId: string
  displayName: string | null
}

export const connectedServicesKeys = {
  all: ['connected-services'] as const,
  lists: () => [...connectedServicesKeys.all, 'list'] as const,
  list: (workspaceId?: string) => [...connectedServicesKeys.lists(), workspaceId ?? ''] as const,
}

async function fetchConnectedServices(workspaceId: string): Promise<ConnectedService[]> {
  const response = await fetch(
    `/api/home/connected-services?workspaceId=${encodeURIComponent(workspaceId)}`
  )
  if (!response.ok) {
    throw new Error('Failed to fetch connected services')
  }
  const data = (await response.json()) as { services: ConnectedService[] }
  return data.services ?? []
}

export function useConnectedServices(workspaceId?: string) {
  return useQuery({
    queryKey: connectedServicesKeys.list(workspaceId),
    queryFn: ({ signal: _signal }) => fetchConnectedServices(workspaceId as string),
    enabled: Boolean(workspaceId),
    staleTime: 60 * 1000,
  })
}
