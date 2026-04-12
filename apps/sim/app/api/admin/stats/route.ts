/**
 * GET /api/admin/stats
 *
 * Returns platform-level statistics for the admin dashboard.
 * Requires an authenticated admin session.
 */

import { db } from '@sim/db'
import { session, user, workspace } from '@sim/db/schema'
import { createLogger } from '@sim/logger'
import { and, count, eq, gte } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

const logger = createLogger('AdminStats')

export async function GET() {
  try {
    const currentSession = await getSession()
    if (!currentSession?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [currentUser] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, currentSession.user.id))
      .limit(1)

    if (currentUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [totalResult, newThisWeekResult, bannedResult, activeSessionsResult, totalWorkspacesResult] =
      await Promise.all([
        db.select({ count: count() }).from(user),
        db
          .select({ count: count() })
          .from(user)
          .where(gte(user.createdAt, oneWeekAgo)),
        db
          .select({ count: count() })
          .from(user)
          .where(eq(user.banned, true)),
        db
          .select({ count: count() })
          .from(session)
          .where(gte(session.expiresAt, now)),
        db.select({ count: count() }).from(workspace),
      ])

    return NextResponse.json({
      totalUsers: totalResult[0]?.count ?? 0,
      newUsersThisWeek: newThisWeekResult[0]?.count ?? 0,
      bannedUsers: bannedResult[0]?.count ?? 0,
      activeSessions: activeSessionsResult[0]?.count ?? 0,
      totalWorkspaces: totalWorkspacesResult[0]?.count ?? 0,
    })
  } catch (error) {
    logger.error('Failed to fetch admin stats', { error })
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
