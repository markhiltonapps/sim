import { Badge } from '@/components/emcn'

interface Step {
  number: string
  title: string
  description: string
  color: string
}

const STEPS: Step[] = [
  {
    number: '01',
    title: 'Design',
    description:
      'Drag and drop blocks onto the canvas. Connect agents, tools, conditions, and data sources into a workflow that matches your process.',
    color: '#2ABBF8',
  },
  {
    number: '02',
    title: 'Connect',
    description:
      'Wire in your integrations — Slack, Gmail, HubSpot, databases, and 190+ more. Add your AI model of choice from 16 providers.',
    color: '#00F701',
  },
  {
    number: '03',
    title: 'Deploy',
    description:
      'Go live as an API, chat interface, web form, or scheduled task. Your agents run automatically, log every step, and surface results wherever you need them.',
    color: '#FA4EDF',
  },
] as const

export default function HowItWorks() {
  return (
    <section
      id='how-it-works'
      aria-labelledby='how-it-works-heading'
      className='bg-[var(--landing-bg-section)] pt-[60px] pb-[60px] md:pt-[100px] md:pb-[100px]'
    >
      <div className='px-4 sm:px-8 md:px-16'>
        <div className='flex flex-col items-center text-center'>
          <Badge
            variant='blue'
            size='md'
            dot
            className='font-season text-[11px] uppercase tracking-[0.08em]'
            style={{ color: '#00F701', backgroundColor: 'rgba(0,247,1,0.1)' }}
          >
            How It Works
          </Badge>
          <h2
            id='how-it-works-heading'
            className='mt-4 font-[430] font-season text-[28px] text-[var(--landing-text-dark)] leading-[110%] tracking-[-0.02em] sm:text-[36px] lg:text-[44px]'
          >
            From idea to deployed agent in minutes
          </h2>
        </div>

        <div className='relative mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-6 lg:grid-cols-3'>
          {/* Connector line (desktop only) */}
          <div
            className='absolute top-[52px] right-[16.67%] left-[16.67%] hidden h-px bg-[var(--landing-border-light)] lg:block'
            aria-hidden='true'
          />

          {STEPS.map((step) => (
            <div
              key={step.number}
              className='relative flex flex-col items-center rounded-[8px] border border-[var(--landing-border-light)] bg-white p-6 text-center'
            >
              <div
                className='flex h-[48px] w-[48px] items-center justify-center rounded-full font-season text-[18px] font-[500] text-white'
                style={{ backgroundColor: step.color }}
              >
                {step.number}
              </div>
              <h3 className='mt-4 font-[500] font-season text-[20px] text-[var(--landing-text-dark)] leading-[130%]'>
                {step.title}
              </h3>
              <p className='mt-2 font-season text-[14px] text-[#666] leading-[170%]'>
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
