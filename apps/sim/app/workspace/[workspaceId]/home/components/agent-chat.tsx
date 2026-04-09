'use client'

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, Calendar, Check, Plug, Table2, User } from 'lucide-react'
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
    <div className='my-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface-1)] p-3'>
      <div className='flex items-start gap-2'>
        <Calendar className='mt-0.5 h-[14px] w-[14px] flex-shrink-0 text-[var(--text-secondary)]' />
        <div className='flex-1 min-w-0'>
          <p className='text-[12px] font-medium text-[var(--text-primary)]'>{payload.title}</p>
          <p className='mt-0.5 text-[11px] text-[var(--text-secondary)]'>
            {describeCron(payload.cronExpression)}
            {payload.timezone && payload.timezone !== 'UTC' ? ` (${payload.timezone})` : ''}
          </p>
        </div>
      </div>

      <div className='mt-2 flex items-center gap-2'>
        <span className='inline-flex items-center gap-1.5 text-[11px] text-green-600'>
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
    <div className='my-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface-1)] p-3'>
      <div className='flex items-start gap-2'>
        <Table2 className='mt-0.5 h-[14px] w-[14px] flex-shrink-0 text-[var(--text-secondary)]' />
        <div className='flex-1 min-w-0'>
          <p className='text-[12px] font-medium text-[var(--text-primary)]'>{payload.name}</p>
          <p className='mt-0.5 text-[11px] text-[var(--text-secondary)]'>
            {payload.columns.length} column{payload.columns.length !== 1 ? 's' : ''}
            {payload.rows && payload.rows.length > 0
              ? ` · ${payload.rows.length} row${payload.rows.length !== 1 ? 's' : ''}`
              : ''}
          </p>
        </div>
      </div>

      <div className='mt-2 flex items-center gap-2'>
        <span className='inline-flex items-center gap-1.5 text-[11px] text-green-600'>
          <Check className='h-[10px] w-[10px]' />
          Table created
        </span>
      </div>
    </div>
  )
}

interface AgentChatProps {
  messages: AgentChatMessage[]
  isSending: boolean
  onSubmit: (text: string) => void
  onStopGeneration: () => void
  onConnectService?: (serviceId: string) => void
  connectedServices: ConnectedService[]
  userId?: string
}

const MARKDOWN_COMPONENTS: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  p: ({ children }) => <p className='mb-1 last:mb-0 leading-relaxed'>{children}</p>,
  strong: ({ children }) => <strong className='font-semibold'>{children}</strong>,
  em: ({ children }) => <em className='italic'>{children}</em>,
  ul: ({ children }) => (
    <ul className='my-1 space-y-0.5 pl-4' style={{ listStyleType: 'disc' }}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className='my-1 space-y-0.5 pl-4' style={{ listStyleType: 'decimal' }}>
      {children}
    </ol>
  ),
  li: ({ children }) => <li style={{ display: 'list-item' }}>{children}</li>,
  code: ({ children, className }) => {
    const isBlock = className?.startsWith('language-')
    if (isBlock) {
      return (
        <pre className='my-2 overflow-x-auto rounded-[6px] bg-black/10 px-3 py-2 font-mono text-[12px]'>
          <code>{children}</code>
        </pre>
      )
    }
    return (
      <code className='rounded bg-black/10 px-1 py-0.5 font-mono text-[0.9em]'>{children}</code>
    )
  },
  h1: ({ children }) => <h1 className='mb-1 mt-2 text-[15px] font-semibold'>{children}</h1>,
  h2: ({ children }) => <h2 className='mb-1 mt-2 text-[14px] font-semibold'>{children}</h2>,
  h3: ({ children }) => <h3 className='mb-1 mt-1 text-[13px] font-semibold'>{children}</h3>,
  blockquote: ({ children }) => (
    <blockquote className='my-1 border-l-2 border-current/30 pl-3 opacity-80'>{children}</blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className='underline opacity-80 hover:opacity-100'
      target='_blank'
      rel='noopener noreferrer'
    >
      {children}
    </a>
  ),
}

const REMARK_PLUGINS = [remarkGfm]

const THINKING_MESSAGES = [
  'Thinking...',
  'Working on it...',
  'Processing...',
  'Searching...',
  'Gathering info...',
  'Almost there...',
  'Analyzing...',
  'Putting it together...',
] as const

function ThinkingIndicator() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % THINKING_MESSAGES.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <span className='inline-flex items-center gap-2 text-[var(--text-secondary)]'>
      <span className='flex gap-[3px]'>
        <span className='h-[4px] w-[4px] animate-bounce rounded-full bg-current [animation-delay:0ms]' />
        <span className='h-[4px] w-[4px] animate-bounce rounded-full bg-current [animation-delay:150ms]' />
        <span className='h-[4px] w-[4px] animate-bounce rounded-full bg-current [animation-delay:300ms]' />
      </span>
      <span className='text-[12px] italic transition-opacity duration-300'>{THINKING_MESSAGES[index]}</span>
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
        <div key={`${keyPrefix}-conn-${i}`} className='mt-2'>
          <button
            type='button'
            onClick={() => onConnectService?.(part)}
            className='inline-flex items-center gap-2 rounded-[8px] border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-[12px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-3)]'
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

    // Split on SCHEDULE markers
    const scheduleParts = tableSegment.split(SCHEDULE_MARKER_RE)
    return scheduleParts.map((segment, si) => {
      if (si % 2 === 1) {
        const payload = parseSchedulePayload(segment)
        if (payload && workspaceId) {
          return <ScheduleCard key={`sched-${ti}-${si}`} payload={payload} workspaceId={workspaceId} />
        }
        return null
      }

      return renderTextWithConnectMarkers(segment, onConnectService, `${ti}-${si}`)
    })
  })
}

export function AgentChat({
  messages,
  isSending,
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
    <div className='flex h-full flex-col'>
      {/* Messages area */}
      <div className='flex-1 overflow-y-auto px-4 py-4'>
        {messages.length === 0 ? (
          <div className='flex h-full flex-col items-center justify-center gap-3 text-center'>
            <div className='flex h-[40px] w-[40px] items-center justify-center rounded-full bg-[var(--surface-5)]'>
              <Bot className='h-[20px] w-[20px] text-[var(--text-secondary)]' />
            </div>
            <div>
              <p className='text-[14px] font-medium text-[var(--text-primary)]'>Agent ready</p>
              {connectedServices.length > 0 ? (
                <p className='mt-1 text-[12px] text-[var(--text-secondary)]'>
                  Connected to{' '}
                  {connectedServices.map((s) => s.displayName || s.providerId).join(', ')}
                </p>
              ) : (
                <p className='mt-1 text-[12px] text-[var(--text-secondary)]'>
                  Connect apps to give the agent access to your services
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className='mx-auto flex max-w-[680px] flex-col gap-4'>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <div
                  className={cn(
                    'flex h-[28px] w-[28px] flex-shrink-0 items-center justify-center rounded-full',
                    message.role === 'user'
                      ? 'bg-[var(--text-primary)] text-[var(--surface-1)]'
                      : 'bg-[var(--surface-5)] text-[var(--text-secondary)]'
                  )}
                >
                  {message.role === 'user' ? (
                    <User className='h-[14px] w-[14px]' />
                  ) : (
                    <Bot className='h-[14px] w-[14px]' />
                  )}
                </div>
                <div
                  className={cn(
                    'max-w-[85%] rounded-[12px] px-3 py-2 text-[13px] leading-relaxed',
                    message.role === 'user'
                      ? 'bg-[var(--text-primary)] text-[var(--surface-1)]'
                      : 'bg-[var(--surface-3)] text-[var(--text-primary)]'
                  )}
                >
                  {message.role === 'assistant' && message.content ? (
                    renderAssistantContent(message.content, onConnectService, workspaceId)
                  ) : message.role === 'assistant' && !message.content && isSending ? (
                    <ThinkingIndicator />
                  ) : (
                    message.content || ''
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className='border-t border-[var(--border)] px-4 py-3'>
        <div className='mx-auto max-w-[680px]'>
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
  )
}
