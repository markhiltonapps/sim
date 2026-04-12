/**
 * POST /api/admin/seed
 *
 * One-time admin seeding endpoint. Promotes the ADMIN_EMAIL user to admin role
 * if no admin users exist yet. Returns 409 if admins already exist.
 *
 * Requires the ADMIN_EMAIL env var to be set.
 */

import { db } from '@sim/db'
import { user } from '@sim/db/schema'
import { createLogger } from '@sim/logger'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { env } from '@/lib/core/config/env'

const logger = createLogger('AdminSeed')

export async function POST() {
  const adminEmail = env.ADMIN_EMAIL
  if (!adminEmail) {
    return NextResponse.json(
      { error: 'ADMIN_EMAIL environment variable is not set' },
      { status: 400 }
    )
  }

  try {
    const existingAdmins = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.role, 'admin'))
      .limit(1)

    if (existingAdmins.length > 0) {
      return NextResponse.json(
        { error: 'Admin user already exists. Use the admin panel to manage roles.' },
        { status: 409 }
      )
    }

    const [targetUser] = await db
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(eq(user.email, adminEmail.toLowerCase()))
      .limit(1)

    if (!targetUser) {
      return NextResponse.json(
        { error: `No user found with email ${adminEmail}. Sign up first, then call this endpoint.` },
        { status: 404 }
      )
    }

    await db.update(user).set({ role: 'admin' }).where(eq(user.id, targetUser.id))

    logger.info('Admin user seeded', { email: adminEmail, userId: targetUser.id })

    return NextResponse.json({
      success: true,
      message: `${adminEmail} has been promoted to admin`,
    })
  } catch (error) {
    logger.error('Failed to seed admin user', { error })
    return NextResponse.json({ error: 'Failed to seed admin user' }, { status: 500 })
  }
}
