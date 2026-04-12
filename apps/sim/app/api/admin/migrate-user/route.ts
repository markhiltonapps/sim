/**
 * POST /api/admin/migrate-user
 *
 * One-time endpoint to transfer all data from the anonymous local user
 * to the real ADMIN_EMAIL user. Updates all foreign key references.
 *
 * Body: { "fromUserId": "00000000-...", "toEmail": "mark.hilton@..." }
 */

import { createLogger } from '@sim/logger'
import { NextResponse } from 'next/server'
import { env } from '@/lib/core/config/env'

const logger = createLogger('MigrateUser')

const TABLES_WITH_USER_ID = [
  { table: 'chat', column: 'user_id' },
  { table: 'copilot_chats', column: 'user_id' },
  { table: 'copilot_feedback', column: 'user_id' },
  { table: 'copilot_runs', column: 'user_id' },
  { table: 'custom_tools', column: 'user_id' },
  { table: 'environment', column: 'user_id' },
  { table: 'form', column: 'user_id' },
  { table: 'knowledge_base', column: 'user_id' },
  { table: 'permissions', column: 'user_id' },
  { table: 'settings', column: 'user_id' },
  { table: 'skill', column: 'user_id' },
  { table: 'usage_log', column: 'user_id' },
  { table: 'user_stats', column: 'user_id' },
  { table: 'workflow', column: 'user_id' },
  { table: 'workflow_checkpoints', column: 'user_id' },
  { table: 'workflow_folder', column: 'user_id' },
  { table: 'workspace_files', column: 'user_id' },
  { table: 'credential_member', column: 'user_id' },
  { table: 'credential_set_member', column: 'user_id' },
  { table: 'pending_credential_draft', column: 'user_id' },
  { table: 'permission_group_member', column: 'user_id' },
  { table: 'api_key', column: 'user_id' },
  { table: 'member', column: 'user_id' },
] as const

const TABLES_WITH_CREATED_BY = [
  { table: 'credential', column: 'created_by' },
  { table: 'credential_set', column: 'created_by' },
  { table: 'mcp_servers', column: 'created_by' },
  { table: 'user_table_definitions', column: 'created_by' },
  { table: 'user_table_rows', column: 'created_by' },
  { table: 'workflow_deployment_version', column: 'created_by' },
  { table: 'workflow_mcp_server', column: 'created_by' },
  { table: 'workspace_byok_keys', column: 'created_by' },
  { table: 'workspace_notification_subscription', column: 'created_by' },
  { table: 'a2a_agent', column: 'created_by' },
  { table: 'api_key', column: 'created_by' },
  { table: 'permission_group', column: 'created_by' },
] as const

const TABLES_WITH_OWNER_ID = [
  { table: 'workspace', column: 'owner_id' },
] as const

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { fromUserId, toEmail } = body

    if (!fromUserId || !toEmail) {
      return NextResponse.json(
        { error: 'Missing fromUserId or toEmail in request body' },
        { status: 400 }
      )
    }

    const { Pool } = require('pg') as typeof import('pg')
    const pool = new Pool({ connectionString: env.DATABASE_URL })

    try {
      const userResult = await pool.query(
        'SELECT id FROM "user" WHERE email = $1',
        [toEmail.toLowerCase()]
      )

      if (userResult.rows.length === 0) {
        await pool.end()
        return NextResponse.json(
          { error: `No user found with email ${toEmail}. Sign up first.` },
          { status: 404 }
        )
      }

      const toUserId = userResult.rows[0].id
      const results: { table: string; column: string; rowsUpdated: number }[] = []

      const allTables = [
        ...TABLES_WITH_USER_ID,
        ...TABLES_WITH_CREATED_BY,
        ...TABLES_WITH_OWNER_ID,
      ]

      for (const { table, column } of allTables) {
        try {
          const res = await pool.query(
            `UPDATE "${table}" SET "${column}" = $1 WHERE "${column}" = $2`,
            [toUserId, fromUserId]
          )
          if (res.rowCount && res.rowCount > 0) {
            results.push({ table, column, rowsUpdated: res.rowCount })
            logger.info(`Migrated ${res.rowCount} rows in ${table}.${column}`)
          }
        } catch (err) {
          logger.warn(`Skipped ${table}.${column}`, {
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }

      await pool.end()

      logger.info('User data migration complete', {
        fromUserId,
        toUserId,
        toEmail,
        tablesUpdated: results.length,
      })

      return NextResponse.json({
        success: true,
        fromUserId,
        toUserId,
        toEmail,
        migrations: results,
      })
    } catch (err) {
      await pool.end()
      throw err
    }
  } catch (error) {
    logger.error('Migration failed', { error })
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 })
  }
}
