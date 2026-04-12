import { Badge } from '@/components/emcn'

interface UseCase {
  id: string
  title: string
  description: string
  color: string
}

const USE_CASES: UseCase[] = [
  {
    id: 'customer-support',
    title: 'Customer Support Agent',
    description:
      'Deploy 24/7 support agents that resolve tickets, escalate edge cases, and update your CRM automatically — without human intervention.',
    color: '#2ABBF8',
  },
  {
    id: 'sales-pipeline',
    title: 'Sales Pipeline Automation',
    description:
      'Research prospects, draft outreach emails, enrich contact data, and log activity to HubSpot or Salesforce — all triggered from a single event.',
    color: '#00F701',
  },
  {
    id: 'document-processing',
    title: 'Document Processing',
    description:
      'Extract, classify, and route information from invoices, contracts, and reports. Agents parse, validate, and push structured data where it belongs.',
    color: '#FFCC02',
  },
  {
    id: 'knowledge-assistant',
    title: 'Internal Knowledge Assistant',
    description:
      'Connect your docs, wikis, and knowledge bases. Give your team an agent that answers questions, finds files, and surfaces the right information instantly.',
    color: '#FA4EDF',
  },
] as const

export default function UseCases() {
  return (
    <section
      id='use-cases'
      aria-labelledby='use-cases-heading'
      className='bg-[var(--landing-bg)] pt-[60px] pb-[60px] md:pt-[100px] md:pb-[100px]'
    >
      <div className='px-4 sm:px-8 md:px-16'>
        <div className='flex flex-col items-center text-center'>
          <Badge
            variant='blue'
            size='md'
            dot
            className='font-season text-[11px] uppercase tracking-[0.08em]'
          >
            Use Cases
          </Badge>
          <h2
            id='use-cases-heading'
            className='mt-4 font-[430] font-season text-[28px] text-white leading-[110%] tracking-[-0.02em] sm:text-[36px] lg:text-[44px]'
          >
            What you can build
          </h2>
          <p className='mt-3 max-w-lg font-season text-[15px] text-[var(--landing-text-muted)] leading-[150%]'>
            From customer-facing agents to internal automations, the platform handles it all.
          </p>
        </div>

        <div className='mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2'>
          {USE_CASES.map((uc) => (
            <div
              key={uc.id}
              className='relative overflow-hidden rounded-[8px] border border-[var(--landing-bg-elevated)] bg-[var(--landing-bg-card)] p-6'
            >
              <div
                className='absolute top-0 left-0 h-[3px] w-full'
                style={{ backgroundColor: uc.color }}
                aria-hidden='true'
              />
              <h3 className='mt-1 font-[500] font-season text-[18px] text-white leading-[130%]'>
                {uc.title}
              </h3>
              <p className='mt-2 font-season text-[14px] text-[var(--landing-text-muted)] leading-[170%]'>
                {uc.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
