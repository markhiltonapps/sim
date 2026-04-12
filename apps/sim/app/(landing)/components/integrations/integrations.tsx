import type { SVGProps } from 'react'
import { Badge } from '@/components/emcn'
import {
  AirtableIcon,
  ConfluenceIcon,
  DiscordIcon,
  FirecrawlIcon,
  GeminiIcon,
  GithubIcon,
  GmailIcon,
  GoogleCalendarIcon,
  GoogleDriveIcon,
  GoogleSheetsIcon,
  HubspotIcon,
  JiraIcon,
  LinearIcon,
  MicrosoftTeamsIcon,
  MistralIcon,
  NotionIcon,
  OpenAIIcon,
  OutlookIcon,
  PineconeIcon,
  SalesforceIcon,
  SlackIcon,
  StripeIcon,
  SupabaseIcon,
  TelegramIcon,
  WhatsAppIcon,
} from '@/components/icons'

interface IntegrationItem {
  name: string
  icon: React.ComponentType<SVGProps<SVGSVGElement>>
}

interface IntegrationCategory {
  label: string
  items: IntegrationItem[]
}

const CATEGORIES: IntegrationCategory[] = [
  {
    label: 'Communication',
    items: [
      { name: 'Slack', icon: SlackIcon },
      { name: 'Gmail', icon: GmailIcon },
      { name: 'Microsoft Teams', icon: MicrosoftTeamsIcon },
      { name: 'Discord', icon: DiscordIcon },
      { name: 'WhatsApp', icon: WhatsAppIcon },
      { name: 'Telegram', icon: TelegramIcon },
      { name: 'Outlook', icon: OutlookIcon },
    ],
  },
  {
    label: 'Productivity',
    items: [
      { name: 'Notion', icon: NotionIcon },
      { name: 'Confluence', icon: ConfluenceIcon },
      { name: 'Airtable', icon: AirtableIcon },
      { name: 'Google Drive', icon: GoogleDriveIcon },
      { name: 'Google Sheets', icon: GoogleSheetsIcon },
      { name: 'Google Calendar', icon: GoogleCalendarIcon },
      { name: 'Jira', icon: JiraIcon },
      { name: 'Linear', icon: LinearIcon },
      { name: 'GitHub', icon: GithubIcon },
    ],
  },
  {
    label: 'Data & AI',
    items: [
      { name: 'OpenAI', icon: OpenAIIcon },
      { name: 'Gemini', icon: GeminiIcon },
      { name: 'Mistral', icon: MistralIcon },
      { name: 'Supabase', icon: SupabaseIcon },
      { name: 'Pinecone', icon: PineconeIcon },
      { name: 'Firecrawl', icon: FirecrawlIcon },
      { name: 'HubSpot', icon: HubspotIcon },
      { name: 'Salesforce', icon: SalesforceIcon },
      { name: 'Stripe', icon: StripeIcon },
    ],
  },
] as const

export default function Integrations() {
  return (
    <section
      id='integrations'
      aria-labelledby='integrations-heading'
      className='bg-[var(--landing-bg)] pt-[60px] pb-[60px] md:pt-[100px] md:pb-[100px]'
    >
      <div className='px-4 sm:px-8 md:px-16'>
        <div className='flex flex-col items-center text-center'>
          <Badge
            variant='blue'
            size='md'
            dot
            className='font-season text-[11px] uppercase tracking-[0.08em]'
            style={{ color: '#FA4EDF', backgroundColor: 'rgba(250,78,223,0.1)' }}
          >
            Integrations
          </Badge>
          <h2
            id='integrations-heading'
            className='mt-4 font-[430] font-season text-[28px] text-white leading-[110%] tracking-[-0.02em] sm:text-[36px] lg:text-[44px]'
          >
            Connect your entire stack
          </h2>
          <p className='mt-3 max-w-lg font-season text-[15px] text-[var(--landing-text-muted)] leading-[150%]'>
            190+ integrations — plug in the tools your team already uses.
          </p>
        </div>

        <div className='mx-auto mt-10 flex max-w-4xl flex-col gap-8'>
          {CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <p className='mb-3 font-season text-[11px] uppercase tracking-[0.08em] text-[var(--landing-text-muted)]'>
                {cat.label}
              </p>
              <div className='flex flex-wrap gap-2'>
                {cat.items.map(({ name, icon: Icon }) => (
                  <div
                    key={name}
                    className='flex items-center gap-2 rounded-[5px] border border-[var(--landing-bg-elevated)] bg-[var(--landing-bg-card)] px-3 py-2'
                  >
                    <Icon className='h-4 w-4 flex-shrink-0' />
                    <span className='font-season text-[13px] text-[var(--landing-text-muted)]'>
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className='mt-8 text-center font-season text-[13px] text-[var(--landing-text-muted)]'>
          Don&apos;t see yours? Use the HTTP block, webhooks, or MCP protocol to connect anything.
        </p>
      </div>
    </section>
  )
}
