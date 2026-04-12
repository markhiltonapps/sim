'use client'

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AlertCircle, Bot, Calendar, Check, Plus, Plug, Table2, User } from 'lucide-react'
import { useParams } from 'next/navigation'
import { createLogger } from '@sim/logger'
import { cn } from '@/lib/core/utils/cn'
import type { AgentChatMessage } from '@/app/workspace/[workspaceId]/home/hooks/use-agent-chat'
import type { ConnectedService } from '@/hooks/queries/home-agent'
import { UserInput } from './user-input'

const logger = createLogger('AgentChat')

const SERVICE_LABELS: Record<string, string> = {
  outlook: 'Outlook',
  'google-email': 'Gmail',
  slack: 'Slack',
  'google-calendar': 'Google Calendar',
  notion: 'Notion',
  github: 'GitHub',
  jira: 'Jira',
  linear: 'Linear',
  'google-drive': 'Google Drive',
  'google-sheets': 'Google Sheets',
  hubspot: 'HubSpot',
  asana: 'Asana',
  posthog: 'PostHog',
}

const CONNECT_MARKER_RE = /\[\[CONNECT:([^\]]+)\]\]/g
const SCHEDULE_MARKER_RE = /\[\[SCHEDULE:([\s\S]*?)\]\]/g
const TABLE_MARKER_RE = /\[\[TABLE:([\s\S]*?)\]\]/g
const ADD_ROWS_MARKER_RE = /\[\[ADD_ROWS:([\s\S]*?)\]\]/g

interface SchedulePayload {
  title: string
  prompt: string
  cronExpression: string
  timezone?: string
  lifecycle?: 'persistent' | 'until_complete'
  maxRuns?: number
}

function parseSchedulePayload(raw: string): SchedulePayload | null {
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.title === 'string' && typeof parsed.cronExpression === 'string') {
      return parsed as SchedulePayload
    }
  } catch {
    // Try to recover from partially-escaped JSON
    try {
      const cleaned = raw.replace(/\\"/g, '"').replace(/\\\\"/g, '\\"')
      const parsed = JSON.parse(cleaned)
      if (parsed && typeof parsed.title === 'string' && typeof parsed.cronExpression === 'string') {
        return parsed as SchedulePayload
      }
    } catch {
      // Not recoverable
    }
  }
  return null
}

const CRON_LABELS: Record<string, string> = {
  '* * * * *': 'Every minute',
  '*/5 * * * *': 'Every 5 minutes',
  '*/15 * * * *': 'Every 15 minutes',
  '*/30 * * * *': 'Every 30 minutes',
  '0 * * * *': 'Every hour',
}

function describeCron(expr: string): string {
  if (CRON_LABELS[expr]) return CRON_LABELS[expr]

  const parts = expr.split(' ')
  if (parts.length !== 5) return expr

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const formatTime = (h: string, m: string) => {
    const hr = parseInt(h, 10)
    const min = m.padStart(2, '0')
    if (hr === 0) return `12:${min} AM`
    if (hr < 12) return `${hr}:${min} AM`
    if (hr === 12) return `12:${min} PM`
    return `${hr - 12}:${min} PM`
  }

  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*' && hour !== '*' && minute !== '*') {
    return `Daily at ${formatTime(hour, minute)}`
  }

  if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*' && hour !== '*' && minute !== '*') {
    const days = dayOfWeek.split(',').map((d) => dayNames[parseInt(d, 10)] ?? d)
    return `Every ${days.join(', ')} at ${formatTime(hour, minute)}`
  }

  if (dayOfMonth !== '*' && month === '*' && dayOfWeek === '*' && hour !== '*' && minute !== '*') {
    return `Monthly on day ${dayOfMonth} at ${formatTime(hour, minute)}`
  }

  return expr
}

function ScheduleCard({ payload }: { payload: SchedulePayload; workspaceId: string }) {
  return (
    <div className='my-2.5 rounded-lg border border-[#E2E8F0] bg-white p-3.5 shadow-sm'>
      <div className='flex items-start gap-2.5'>
        <div className='flex h-[24px] w-[24px] items-center justify-center rounded-md bg-[#3F51B5]/10'>
          <Calendar className='h-[12px] w-[12px] flex-shrink-0 text-[#3F51B5]' />
        </div>
        <div className='flex-1 min-w-0'>
          <p className='text-[12px] font-semibold text-[#0F172A]'>{payload.title}</p>
          <p className='mt-0.5 text-[11px] text-[#94A3B8]'>
            {describeCron(payload.cronExpression)}
            {payload.timezone && payload.timezone !== 'UTC' ? ` (${payload.timezone})` : ''}
          </p>
        </div>
      </div>

      <div className='mt-2.5 flex items-center gap-2'>
        <span className='inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/10 px-2 py-0.5 text-[11px] font-medium text-[#10B981]'>
          <Check className='h-[10px] w-[10px]' />
          Schedule created
        </span>
      </div>
    </div>
  )
}

interface TablePayload {
  name: string
  description?: string
  columns: Array<{ name: string; type: string; required?: boolean }>
  rows?: Array<Record<string, unknown>>
}

function parseTablePayload(raw: string): TablePayload | null {
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.name === 'string' && Array.isArray(parsed.columns)) {
      return parsed as TablePayload
    }
  } catch {
    try {
      const cleaned = raw.replace(/\\"/g, '"').replace(/\\\\"/g, '\\"')
      const parsed = JSON.parse(cleaned)
      if (parsed && typeof parsed.name === 'string' && Array.isArray(parsed.columns)) {
        return parsed as TablePayload
      }
    } catch {
      // Not recoverable
    }
  }
  return null
}

function TableCard({ payload }: { payload: TablePayload }) {
  return (
    <div className='my-2.5 rounded-lg border border-[#E2E8F0] bg-white p-3.5 shadow-sm'>
      <div className='flex items-start gap-2.5'>
        <div className='flex h-[24px] w-[24px] items-center justify-center rounded-md bg-[#3F51B5]/10'>
          <Table2 className='h-[12px] w-[12px] flex-shrink-0 text-[#3F51B5]' />
        </div>
        <div className='flex-1 min-w-0'>
          <p className='text-[12px] font-semibold text-[#0F172A]'>{payload.name}</p>
          <p className='mt-0.5 text-[11px] text-[#94A3B8]'>
            {payload.columns.length} column{payload.columns.length !== 1 ? 's' : ''}
            {payload.rows && payload.rows.length > 0
              ? ` · ${payload.rows.length} row${payload.rows.length !== 1 ? 's' : ''}`
              : ''}
          </p>
        </div>
      </div>

      <div className='mt-2.5 flex items-center gap-2'>
        <span className='inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/10 px-2 py-0.5 text-[11px] font-medium text-[#10B981]'>
          <Check className='h-[10px] w-[10px]' />
          Table created
        </span>
      </div>
    </div>
  )
}

interface AddRowsPayload {
  table: string
  rows: Array<Record<string, unknown>>
}

function parseAddRowsPayload(raw: string): AddRowsPayload | null {
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.table === 'string' && Array.isArray(parsed.rows)) {
      return parsed as AddRowsPayload
    }
  } catch {
    try {
      const cleaned = raw.replace(/\\"/g, '"').replace(/\\\\"/g, '\\"')
      const parsed = JSON.parse(cleaned)
      if (parsed && typeof parsed.table === 'string' && Array.isArray(parsed.rows)) {
        return parsed as AddRowsPayload
      }
    } catch {
      // Not recoverable
    }
  }
  return null
}

function AddRowsCard({ payload }: { payload: AddRowsPayload }) {
  return (
    <div className='my-2.5 rounded-lg border border-[#E2E8F0] bg-white p-3.5 shadow-sm'>
      <div className='flex items-start gap-2.5'>
        <div className='flex h-[24px] w-[24px] items-center justify-center rounded-md bg-[#3F51B5]/10'>
          <Plus className='h-[12px] w-[12px] flex-shrink-0 text-[#3F51B5]' />
        </div>
        <div className='flex-1 min-w-0'>
          <p className='text-[12px] font-semibold text-[#0F172A]'>{payload.table}</p>
          <p className='mt-0.5 text-[11px] text-[#94A3B8]'>
            {payload.rows.length} row{payload.rows.length !== 1 ? 's' : ''} added
          </p>
        </div>
      </div>

      <div className='mt-2.5 flex items-center gap-2'>
        <span className='inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/10 px-2 py-0.5 text-[11px] font-medium text-[#10B981]'>
          <Check className='h-[10px] w-[10px]' />
          Rows added to table
        </span>
      </div>
    </div>
  )
}

interface AgentChatProps {
  messages: AgentChatMessage[]
  isSending: boolean
  statusMessage?: string | null
  onSubmit: (text: string) => void
  onStopGeneration: () => void
  onConnectService?: (serviceId: string) => void
  connectedServices: ConnectedService[]
  userId?: string
}

const MARKDOWN_COMPONENTS: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  p: ({ children }) => <p className='mb-1.5 last:mb-0 leading-[1.65] text-[#475569]'>{children}</p>,
  strong: ({ children }) => <strong className='font-semibold text-[#0F172A]'>{children}</strong>,
  em: ({ children }) => <em className='italic'>{children}</em>,
  ul: ({ children }) => (
    <ul className='my-1.5 space-y-1 pl-5' style={{ listStyleType: 'none' }}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className='my-1.5 space-y-1 pl-5' style={{ listStyleType: 'decimal' }}>
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className='relative pl-1' style={{ display: 'list-item' }}>
      {children}
    </li>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.startsWith('language-')
    if (isBlock) {
      return (
        <pre className='my-2.5 max-w-full overflow-x-auto rounded-lg bg-[#0F172A] px-3 py-2.5 font-mono text-[11px] sm:px-4 sm:py-3 sm:text-[12px] text-[#E2E8F0]'>
          <code>{children}</code>
        </pre>
      )
    }
    return (
      <code className='break-all rounded-md bg-[#F1F5F9] px-1.5 py-0.5 font-mono text-[0.88em] text-[#3F51B5]'>{children}</code>
    )
  },
  h1: ({ children }) => <h1 className='mb-1.5 mt-3 text-[15px] font-bold tracking-[-0.01em] text-[#0F172A]'>{children}</h1>,
  h2: ({ children }) => <h2 className='mb-1 mt-2.5 text-[14px] font-semibold tracking-[-0.01em] text-[#0F172A]'>{children}</h2>,
  h3: ({ children }) => <h3 className='mb-1 mt-2 text-[13px] font-semibold text-[#0F172A]'>{children}</h3>,
  blockquote: ({ children }) => (
    <blockquote className='my-2 border-l-[3px] border-[#3F51B5]/30 pl-3 text-[#64748B]'>{children}</blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className='font-medium text-[#3F51B5] underline decoration-[#3F51B5]/30 underline-offset-2 hover:decoration-[#3F51B5]'
      target='_blank'
      rel='noopener noreferrer'
    >
      {children}
    </a>
  ),
}

const REMARK_PLUGINS = [remarkGfm]

function ThinkingIndicator({ statusMessage }: { statusMessage?: string | null }) {
  return (
    <span className='inline-flex items-center gap-2.5 text-[#94A3B8]'>
      <span className='flex gap-[3px]'>
        <span className='h-[5px] w-[5px] animate-bounce rounded-full bg-[#3F51B5] [animation-delay:0ms]' />
        <span className='h-[5px] w-[5px] animate-bounce rounded-full bg-[#3F51B5] [animation-delay:150ms]' />
        <span className='h-[5px] w-[5px] animate-bounce rounded-full bg-[#3F51B5] [animation-delay:300ms]' />
      </span>
      <span className='text-[12px] font-medium italic tracking-wide transition-opacity duration-300'>
        {statusMessage || 'Thinking...'}
      </span>
    </span>
  )
}

function renderTextWithConnectMarkers(
  text: string,
  onConnectService?: (serviceId: string) => void,
  keyPrefix?: string,
): React.ReactNode {
  const parts = text.split(CONNECT_MARKER_RE)
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      const label = SERVICE_LABELS[part] ?? part
      return (
        <div key={`${keyPrefix}-conn-${i}`} className='mt-2.5'>
          <button
            type='button'
            onClick={() => onConnectService?.(part)}
            className='inline-flex items-center gap-2 rounded-lg border border-[#3F51B5]/20 bg-[#3F51B5]/5 px-3.5 py-2 text-[12px] font-medium text-[#3F51B5] transition-colors hover:bg-[#3F51B5]/10'
          >
            <Plug className='h-[12px] w-[12px]' />
            Connect {label}
          </button>
        </div>
      )
    }
    return part ? (
      <ReactMarkdown key={`${keyPrefix}-md-${i}`} remarkPlugins={REMARK_PLUGINS} components={MARKDOWN_COMPONENTS}>
        {part}
      </ReactMarkdown>
    ) : null
  })
}

function renderAssistantContent(
  content: string,
  onConnectService?: (serviceId: string) => void,
  workspaceId?: string,
): React.ReactNode {
  // Split on TABLE markers first
  const tableParts = content.split(TABLE_MARKER_RE)
  return tableParts.map((tableSegment, ti) => {
    if (ti % 2 === 1) {
      const payload = parseTablePayload(tableSegment)
      if (payload) {
        return <TableCard key={`table-${ti}`} payload={payload} />
      }
      return null
    }

    // Split on ADD_ROWS markers
    const addRowsParts = tableSegment.split(ADD_ROWS_MARKER_RE)
    return addRowsParts.map((addRowsSegment, ari) => {
      if (ari % 2 === 1) {
        const payload = parseAddRowsPayload(addRowsSegment)
        if (payload) {
          return <AddRowsCard key={`addrows-${ti}-${ari}`} payload={payload} />
        }
        return null
      }

      // Split on SCHEDULE markers
      const scheduleParts = addRowsSegment.split(SCHEDULE_MARKER_RE)
      return scheduleParts.map((segment, si) => {
        if (si % 2 === 1) {
          const payload = parseSchedulePayload(segment)
          if (payload && workspaceId) {
            return <ScheduleCard key={`sched-${ti}-${ari}-${si}`} payload={payload} workspaceId={workspaceId} />
          }
          return null
        }

        return renderTextWithConnectMarkers(segment, onConnectService, `${ti}-${ari}-${si}`)
      })
    })
  })
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function isErrorContent(content: string): boolean {
  return content.startsWith('Error:') || content.startsWith('error:')
}

function SystemExceptionCard({ content }: { content: string }) {
  const errorText = content.replace(/^Error:\s*/i, '')
  return (
    <div className='my-1 rounded-lg border border-[#FCA5A5]/40 bg-[#FEF2F2] p-3.5'>
      <div className='flex items-start gap-2.5'>
        <AlertCircle className='mt-0.5 h-[16px] w-[16px] flex-shrink-0 text-[#DC2626]' />
        <div className='flex-1 min-w-0'>
          <p className='text-[12px] font-bold tracking-wide text-[#DC2626]'>SYSTEM EXCEPTION</p>
          <pre className='mt-2 overflow-x-auto rounded-md bg-[#0F172A] px-3 py-2.5 font-mono text-[11px] leading-relaxed text-[#FCA5A5]'>
            {errorText}
          </pre>
        </div>
      </div>
    </div>
  )
}

export function AgentChat({
  messages,
  isSending,
  statusMessage,
  onSubmit,
  onStopGeneration,
  onConnectService,
  connectedServices,
  userId,
}: AgentChatProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className='flex h-full flex-col font-manrope'>
      {/* Messages area */}
      <div className='flex-1 overflow-y-auto px-2.5 py-4 sm:px-4 sm:py-6'>
        {messages.length === 0 ? (
          <div className='flex h-full flex-col items-center justify-center gap-4 px-4 text-center'>
            <div className='flex h-[48px] w-[48px] items-center justify-center rounded-2xl bg-[#3F51B5]/10'>
              <Bot className='h-[24px] w-[24px] text-[#3F51B5]' />
            </div>
            <div>
              <p className='text-[15px] font-semibold tracking-[-0.01em] text-[#0F172A]'>Agent ready</p>
              {connectedServices.length > 0 ? (
                <p className='mt-1.5 text-[12px] text-[#94A3B8]'>
                  Connected to{' '}
                  {connectedServices.map((s) => s.displayName || s.providerId).join(', ')}
                </p>
              ) : (
                <p className='mt-1.5 text-[12px] text-[#94A3B8]'>
                  Connect apps to give the agent access to your services
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className='mx-auto flex max-w-[680px] flex-col gap-4 sm:gap-5'>
            {messages.map((message) => (
              <div key={message.id} className='flex flex-col'>
                {/* Message bubble */}
                <div
                  className={cn(
                    'flex gap-2 sm:gap-3',
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  <div
                    className={cn(
                      'hidden h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-xl sm:flex',
                      message.role === 'user'
                        ? 'bg-[#3F51B5] text-white'
                        : 'bg-[#3F51B5]/10 text-[#3F51B5]'
                    )}
                  >
                    {message.role === 'user' ? (
                      <User className='h-[14px] w-[14px]' />
                    ) : (
                      <Bot className='h-[14px] w-[14px]' />
                    )}
                  </div>
                  <div className='flex min-w-0 max-w-full flex-col sm:max-w-[85%]'>
                    {/* Agent identity label */}
                    {message.role === 'assistant' && message.content && (
                      <div className='mb-1 flex items-center gap-2'>
                        <span className='text-[11px] font-semibold text-[#0F172A]'>Neato_Agent</span>
                        {isSending && messages[messages.length - 1]?.id === message.id && (
                          <span className='rounded-full bg-[#3F51B5]/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-[#3F51B5]'>PROCESSING</span>
                        )}
                      </div>
                    )}
                    <div
                      className={cn(
                        'rounded-xl px-3 py-2.5 text-[13px] leading-relaxed sm:px-4 sm:py-3',
                        message.role === 'user'
                          ? 'rounded-tr-md border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]'
                          : 'rounded-tl-md border border-[#E2E8F0] bg-white text-[#475569] shadow-sm'
                      )}
                    >
                      {message.role === 'assistant' && message.content && isErrorContent(message.content) ? (
                        <SystemExceptionCard content={message.content} />
                      ) : message.role === 'assistant' && message.content ? (
                        renderAssistantContent(message.content, onConnectService, workspaceId)
                      ) : message.role === 'assistant' && !message.content && isSending ? (
                        <ThinkingIndicator statusMessage={statusMessage} />
                      ) : (
                        message.content || ''
                      )}
                    </div>
                  </div>
                </div>
                {/* Timestamp */}
                {message.content && (
                  <div className={cn(
                    'mt-1.5 text-[11px] font-medium tracking-wide text-[#CBD5E1]',
                    message.role === 'user' ? 'text-right sm:pr-[42px]' : 'sm:pl-[42px]'
                  )}>
                    {message.role === 'user' ? 'USER' : 'AGENT'} &middot; {formatTimestamp(message.createdAt)}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Floating command bar */}
      <div className='px-2.5 pb-3 pt-2 sm:px-4 sm:pb-4'>
        <div className='mx-auto max-w-[680px]'>
          <div className='rounded-xl border border-[#E2E8F0] bg-white shadow-sm'>
            <UserInput
              onSubmit={(text) => onSubmit(text)}
              isSending={isSending}
              onStopGeneration={onStopGeneration}
              userId={userId}
              isInitialView={false}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
