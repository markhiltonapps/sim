import { useQuery } from '@tanstack/react-query'

export const adminStatsKeys = {
  all: ['adminStats'] as const,
  stats: () => [...adminStatsKeys.all, 'stats'] as const,
}

interface AdminStats {
  totalUsers: number
  newUsersThisWeek: number
  bannedUsers: number
  activeSessions: number
  totalWorkspaces: number
}

async function fetchAdminStats(signal?: AbortSignal): Promise<AdminStats> {
  const response = await fetch('/api/admin/stats', { signal })
  if (!response.ok) throw new Error('Failed to fetch admin stats')
  return response.json()
}

export function useAdminStats() {
  return useQuery({
    queryKey: adminStatsKeys.stats(),
    queryFn: ({ signal }) => fetchAdminStats(signal),
    staleTime: 30 * 1000,
  })
}
