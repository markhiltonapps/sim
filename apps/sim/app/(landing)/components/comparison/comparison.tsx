import { Badge } from '@/components/emcn'

type Status = 'yes' | 'no' | 'partial'

interface ComparisonRow {
  feature: string
  neato: Status
  zapier: Status
  n8n: Status
}

const ROWS: ComparisonRow[] = [
  { feature: 'Visual workflow builder', neato: 'yes', zapier: 'yes', n8n: 'partial' },
  { feature: 'Multi-LLM agent support', neato: 'yes', zapier: 'no', n8n: 'no' },
  { feature: 'Built-in knowledge base (RAG)', neato: 'yes', zapier: 'no', n8n: 'no' },
  { feature: 'Inline data tables', neato: 'yes', zapier: 'no', n8n: 'no' },
  { feature: 'Real-time collaboration', neato: 'yes', zapier: 'no', n8n: 'no' },
  { feature: 'Custom code execution', neato: 'yes', zapier: 'partial', n8n: 'yes' },
  { feature: 'Deploy as API / chat / form', neato: 'yes', zapier: 'no', n8n: 'partial' },
  { feature: 'Open source / self-host', neato: 'yes', zapier: 'no', n8n: 'yes' },
] as const

function StatusCell({ status }: { status: Status }) {
  if (status === 'yes') {
    return (
      <svg className='h-5 w-5 text-[#00F701]' viewBox='0 0 20 20' fill='currentColor' aria-label='Yes'>
        <path
          fillRule='evenodd'
          d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
          clipRule='evenodd'
        />
      </svg>
    )
  }
  if (status === 'partial') {
    return (
      <svg className='h-5 w-5 text-[#FFCC02]' viewBox='0 0 20 20' fill='currentColor' aria-label='Partial'>
        <path
          fillRule='evenodd'
          d='M4 10a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z'
          clipRule='evenodd'
        />
      </svg>
    )
  }
  return (
    <svg className='h-5 w-5 text-[#555]' viewBox='0 0 20 20' fill='currentColor' aria-label='No'>
      <path
        fillRule='evenodd'
        d='M4 10a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z'
        clipRule='evenodd'
      />
    </svg>
  )
}

export default function Comparison() {
  return (
    <section
      id='comparison'
      aria-labelledby='comparison-heading'
      className='bg-[var(--landing-bg)] pt-[60px] pb-[60px] md:pt-[100px] md:pb-[100px]'
    >
      <div className='px-4 sm:px-8 md:px-16'>
        <div className='flex flex-col items-center text-center'>
          <Badge
            variant='blue'
            size='md'
            dot
            className='font-season text-[11px] uppercase tracking-[0.08em]'
            style={{ color: '#FFCC02', backgroundColor: 'rgba(255,204,2,0.1)' }}
          >
            Why Neato_Pilot
          </Badge>
          <h2
            id='comparison-heading'
            className='mt-4 font-[430] font-season text-[28px] text-white leading-[110%] tracking-[-0.02em] sm:text-[36px] lg:text-[44px]'
          >
            AI-native, not just automation
          </h2>
          <p className='mt-3 max-w-lg font-season text-[15px] text-[var(--landing-text-muted)] leading-[150%]'>
            Traditional automation tools bolt AI on as an afterthought. Neato_Pilot is built from the
            ground up for intelligent agents.
          </p>
        </div>

        <div className='mx-auto mt-10 max-w-3xl overflow-x-auto'>
          <table className='w-full border-collapse'>
            <thead>
              <tr className='border-b border-[var(--landing-bg-elevated)]'>
                <th
                  scope='col'
                  className='py-3 pr-4 text-left font-season text-[13px] font-[430] text-[var(--landing-text-muted)]'
                >
                  Feature
                </th>
                <th
                  scope='col'
                  className='px-4 py-3 text-center font-season text-[13px] font-[500] text-white'
                >
                  Neato_Pilot
                </th>
                <th
                  scope='col'
                  className='px-4 py-3 text-center font-season text-[13px] font-[430] text-[var(--landing-text-muted)]'
                >
                  Zapier / Make
                </th>
                <th
                  scope='col'
                  className='px-4 py-3 text-center font-season text-[13px] font-[430] text-[var(--landing-text-muted)]'
                >
                  n8n
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.feature} className='border-b border-[var(--landing-bg-elevated)]'>
                  <th
                    scope='row'
                    className='py-3.5 pr-4 text-left font-season text-[14px] font-[430] text-[var(--landing-text)]'
                  >
                    {row.feature}
                  </th>
                  <td className='px-4 py-3.5'>
                    <div className='flex justify-center'>
                      <StatusCell status={row.neato} />
                    </div>
                  </td>
                  <td className='px-4 py-3.5'>
                    <div className='flex justify-center'>
                      <StatusCell status={row.zapier} />
                    </div>
                  </td>
                  <td className='px-4 py-3.5'>
                    <div className='flex justify-center'>
                      <StatusCell status={row.n8n} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
