'use client'

import { createElement, useCallback, useMemo, useState } from 'react'
import { createLogger } from '@sim/logger'
import { Loader2, Search } from 'lucide-react'
import { Badge, Button } from '@/components/emcn'
import { Input } from '@/components/ui'
import {
  AirtableIcon,
  AsanaIcon,
  AttioIcon,
  CalendlyIcon,
  ConfluenceIcon,
  DiscordIcon,
  GithubIcon,
  GmailIcon,
  GoogleCalendarIcon,
  GoogleDocsIcon,
  GoogleDriveIcon,
  GoogleSheetsIcon,
  GoogleSlidesIcon,
  GoogleTasksIcon,
  HubspotIcon,
  IntercomIcon,
  JiraIcon,
  LinearIcon,
  LinkedInIcon,
  MailchimpIcon,
  MicrosoftExcelIcon,
  MicrosoftOneDriveIcon,
  MicrosoftTeamsIcon,
  NotionIcon,
  OutlookIcon,
  PipedriveIcon,
  RedditIcon,
  SalesforceIcon,
  SendgridIcon,
  SlackIcon,
  StripeIcon,
  SupabaseIcon,
  TelegramIcon,
  TrelloIcon,
  TwilioIcon,
  TypeformIcon,
  WhatsAppIcon,
  ZendeskIcon,
  ZoomIcon,
} from '@/components/icons'
import {
  useComposioConnect,
  useComposioConnections,
  useComposioDisconnect,
} from '@/hooks/queries/composio-connections'

const logger = createLogger('ComposioApps')

interface ComposioAppConfig {
  appName: string
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>> | null
  category: string
}

const COMPOSIO_APPS: ComposioAppConfig[] = [
  // Google
  { appName: 'gmail', label: 'Gmail', icon: GmailIcon, category: 'Google' },
  { appName: 'googlecalendar', label: 'Google Calendar', icon: GoogleCalendarIcon, category: 'Google' },
  { appName: 'googledrive', label: 'Google Drive', icon: GoogleDriveIcon, category: 'Google' },
  { appName: 'googlesheets', label: 'Google Sheets', icon: GoogleSheetsIcon, category: 'Google' },
  { appName: 'googledocs', label: 'Google Docs', icon: GoogleDocsIcon, category: 'Google' },
  { appName: 'googleslides', label: 'Google Slides', icon: GoogleSlidesIcon, category: 'Google' },
  { appName: 'googletasks', label: 'Google Tasks', icon: GoogleTasksIcon, category: 'Google' },
  // Microsoft
  { appName: 'outlook', label: 'Outlook', icon: OutlookIcon, category: 'Microsoft' },
  { appName: 'microsoftteams', label: 'Microsoft Teams', icon: MicrosoftTeamsIcon, category: 'Microsoft' },
  { appName: 'onedrive', label: 'OneDrive', icon: MicrosoftOneDriveIcon, category: 'Microsoft' },
  { appName: 'excel', label: 'Excel', icon: MicrosoftExcelIcon, category: 'Microsoft' },
  // Communication
  { appName: 'slack', label: 'Slack', icon: SlackIcon, category: 'Communication' },
  { appName: 'discord', label: 'Discord', icon: DiscordIcon, category: 'Communication' },
  { appName: 'whatsapp', label: 'WhatsApp', icon: WhatsAppIcon, category: 'Communication' },
  { appName: 'telegram', label: 'Telegram', icon: TelegramIcon, category: 'Communication' },
  { appName: 'twilio', label: 'Twilio', icon: TwilioIcon, category: 'Communication' },
  { appName: 'zoom', label: 'Zoom', icon: ZoomIcon, category: 'Communication' },
  { appName: 'intercom', label: 'Intercom', icon: IntercomIcon, category: 'Communication' },
  // Dev & PM
  { appName: 'github', label: 'GitHub', icon: GithubIcon, category: 'Dev & PM' },
  { appName: 'jira', label: 'Jira', icon: JiraIcon, category: 'Dev & PM' },
  { appName: 'linear', label: 'Linear', icon: LinearIcon, category: 'Dev & PM' },
  { appName: 'notion', label: 'Notion', icon: NotionIcon, category: 'Dev & PM' },
  { appName: 'confluence', label: 'Confluence', icon: ConfluenceIcon, category: 'Dev & PM' },
  { appName: 'trello', label: 'Trello', icon: TrelloIcon, category: 'Dev & PM' },
  { appName: 'asana', label: 'Asana', icon: AsanaIcon, category: 'Dev & PM' },
  { appName: 'airtable', label: 'Airtable', icon: AirtableIcon, category: 'Dev & PM' },
  // CRM & Sales
  { appName: 'hubspot', label: 'HubSpot', icon: HubspotIcon, category: 'CRM & Sales' },
  { appName: 'salesforce', label: 'Salesforce', icon: SalesforceIcon, category: 'CRM & Sales' },
  { appName: 'pipedrive', label: 'Pipedrive', icon: PipedriveIcon, category: 'CRM & Sales' },
  { appName: 'attio', label: 'Attio', icon: AttioIcon, category: 'CRM & Sales' },
  // Social & Marketing
  { appName: 'linkedin', label: 'LinkedIn', icon: LinkedInIcon, category: 'Social & Marketing' },
  { appName: 'reddit', label: 'Reddit', icon: RedditIcon, category: 'Social & Marketing' },
  { appName: 'mailchimp', label: 'Mailchimp', icon: MailchimpIcon, category: 'Social & Marketing' },
  { appName: 'typeform', label: 'Typeform', icon: TypeformIcon, category: 'Social & Marketing' },
  { appName: 'sendgrid', label: 'SendGrid', icon: SendgridIcon, category: 'Social & Marketing' },
  // Storage & Data
  { appName: 'supabase', label: 'Supabase', icon: SupabaseIcon, category: 'Storage & Data' },
  // Business
  { appName: 'stripe', label: 'Stripe', icon: StripeIcon, category: 'Business' },
  { appName: 'calendly', label: 'Calendly', icon: CalendlyIcon, category: 'Business' },
  { appName: 'zendesk', label: 'Zendesk', icon: ZendeskIcon, category: 'Business' },
] as const

const CATEGORIES = [
  'Google',
  'Microsoft',
  'Communication',
  'Dev & PM',
  'CRM & Sales',
  'Social & Marketing',
  'Storage & Data',
  'Business',
] as const

export function ComposioApps() {
  const [searchTerm, setSearchTerm] = useState('')
  const [connectingApp, setConnectingApp] = useState<string | null>(null)
  const [disconnectingApp, setDisconnectingApp] = useState<string | null>(null)

  const { data: connections = [], isLoading } = useComposioConnections()
  const connectMutation = useComposioConnect()
  const disconnectMutation = useComposioDisconnect()

  const connectedApps = useMemo(() => {
    const map = new Map<string, { id: string; status: string }>()
    for (const conn of connections) {
      map.set(conn.app.toLowerCase(), { id: conn.id, status: conn.status })
    }
    return map
  }, [connections])

  const filteredApps = useMemo(() => {
    if (!searchTerm.trim()) return COMPOSIO_APPS
    const q = searchTerm.toLowerCase()
    return COMPOSIO_APPS.filter(
      (app) =>
        app.label.toLowerCase().includes(q) ||
        app.appName.toLowerCase().includes(q) ||
        app.category.toLowerCase().includes(q)
    )
  }, [searchTerm])

  const groupedApps = useMemo(() => {
    const groups = new Map<string, typeof filteredApps>()
    for (const category of CATEGORIES) {
      const apps = filteredApps.filter((a) => a.category === category)
      if (apps.length > 0) groups.set(category, apps)
    }
    return groups
  }, [filteredApps])

  const handleConnect = useCallback(
    async (appName: string) => {
      setConnectingApp(appName)
      try {
        const result = await connectMutation.mutateAsync({
          app: appName,
          redirectUrl: window.location.href,
        })
        if (result.redirectUrl) {
          window.location.href = result.redirectUrl
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to connect'
        logger.error('Failed to connect Composio app', { appName, error: message })
      } finally {
        setConnectingApp(null)
      }
    },
    [connectMutation]
  )

  const handleDisconnect = useCallback(
    async (appName: string) => {
      const conn = connectedApps.get(appName.toLowerCase())
      if (!conn) return
      setDisconnectingApp(appName)
      try {
        await disconnectMutation.mutateAsync({ connectedAccountId: conn.id })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to disconnect'
        logger.error('Failed to disconnect Composio app', { appName, error: message })
      } finally {
        setDisconnectingApp(null)
      }
    },
    [connectedApps, disconnectMutation]
  )

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <Loader2 className='h-5 w-5 animate-spin text-[var(--text-muted)]' />
      </div>
    )
  }

  return (
    <div className='flex h-full flex-col gap-4.5'>
      <div className='flex items-center gap-2 rounded-lg border border-[var(--border)] bg-transparent px-2 py-1.5 transition-colors duration-100 dark:bg-[var(--surface-4)] dark:hover-hover:border-[var(--border-1)] dark:hover-hover:bg-[var(--surface-5)]'>
        <Search
          className='h-[14px] w-[14px] flex-shrink-0 text-[var(--text-tertiary)]'
          strokeWidth={2}
        />
        <Input
          placeholder='Search apps...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className='h-auto flex-1 border-0 bg-transparent p-0 font-base leading-none placeholder:text-[var(--text-tertiary)] focus-visible:ring-0 focus-visible:ring-offset-0'
        />
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto'>
        <div className='flex flex-col gap-5'>
          {[...groupedApps.entries()].map(([category, apps]) => (
            <div key={category}>
              <p className='mb-2 font-medium text-[12px] text-[var(--text-muted)]'>{category}</p>
              <div className='flex flex-col gap-1'>
                {apps.map((app) => {
                  const conn = connectedApps.get(app.appName.toLowerCase())
                  const isConnected = Boolean(conn)
                  const isConnecting = connectingApp === app.appName
                  const isDisconnecting = disconnectingApp === app.appName

                  return (
                    <div
                      key={app.appName}
                      className='flex items-center justify-between gap-3 rounded-lg px-1 py-1.5'
                    >
                      <div className='flex min-w-0 items-center gap-2.5'>
                        <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-[var(--surface-5)]'>
                          {app.icon ? (
                            createElement(app.icon, { className: 'h-4 w-4' })
                          ) : (
                            <span className='font-medium text-[11px] text-[var(--text-tertiary)]'>
                              {app.label.slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <div className='flex min-w-0 items-center gap-2'>
                          <span className='truncate font-medium text-[15px] text-[var(--text-primary)]'>
                            {app.label}
                          </span>
                          {isConnected && (
                            <Badge variant='green' size='sm'>
                              Connected
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className='flex flex-shrink-0 items-center gap-1'>
                        {isConnected ? (
                          <Button
                            variant='ghost'
                            onClick={() => handleDisconnect(app.appName)}
                            disabled={isDisconnecting}
                          >
                            {isDisconnecting ? (
                              <Loader2 className='mr-1.5 h-3 w-3 animate-spin' />
                            ) : null}
                            Disconnect
                          </Button>
                        ) : (
                          <Button
                            variant='default'
                            onClick={() => handleConnect(app.appName)}
                            disabled={isConnecting}
                          >
                            {isConnecting ? (
                              <Loader2 className='mr-1.5 h-3 w-3 animate-spin' />
                            ) : null}
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {groupedApps.size === 0 && (
            <div className='py-4 text-center text-[var(--text-muted)] text-sm'>
              No apps found matching &ldquo;{searchTerm}&rdquo;
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
