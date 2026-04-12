import Image from 'next/image'
import Link from 'next/link'
import { FooterCTA } from '@/app/(landing)/components/footer/footer-cta'

const LINK_CLASS =
  'text-sm text-[var(--landing-text-muted)] transition-colors hover:text-[var(--landing-text)]'

interface FooterItem {
  label: string
  href: string
}

const PRODUCT_LINKS: FooterItem[] = [
  { label: 'Pricing', href: '/#pricing' },
  { label: 'Integrations', href: '/#integrations' },
  { label: 'Use Cases', href: '/#use-cases' },
  { label: 'FAQ', href: '/#faq' },
]

const LEGAL_LINKS: FooterItem[] = [
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy' },
]

function FooterColumn({ title, items }: { title: string; items: FooterItem[] }) {
  return (
    <div>
      <h3 className='mb-4 font-medium text-[var(--landing-text)] text-sm'>{title}</h3>
      <div className='flex flex-col gap-2.5'>
        {items.map(({ label, href }) => (
          <Link key={label} href={href} className={LINK_CLASS}>
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}

interface FooterProps {
  hideCTA?: boolean
}

export default function Footer({ hideCTA }: FooterProps) {
  return (
    <footer
      role='contentinfo'
      className={`bg-[var(--landing-bg)] pb-10 font-[430] font-season text-sm${hideCTA ? ' pt-10' : ''}`}
    >
      {!hideCTA && <FooterCTA />}
      <div className='relative px-[1.6vw] sm:px-8 lg:px-16'>
        <div
          aria-hidden='true'
          className='absolute top-0 left-0 z-20 hidden h-px w-[calc(4rem+4px)] bg-[var(--landing-bg-elevated)] lg:block'
        />
        <div
          aria-hidden='true'
          className='absolute top-0 right-0 z-20 hidden h-px w-[calc(4rem+4px)] bg-[var(--landing-bg-elevated)] lg:block'
        />
        <div
          aria-hidden='true'
          className='absolute bottom-0 left-0 z-20 hidden h-px w-[calc(4rem+4px)] bg-[var(--landing-bg-elevated)] lg:block'
        />
        <div
          aria-hidden='true'
          className='absolute right-0 bottom-0 z-20 hidden h-px w-[calc(4rem+4px)] bg-[var(--landing-bg-elevated)] lg:block'
        />
        <div className='relative z-10 border border-[var(--landing-bg-elevated)] px-6 pt-10 pb-8 sm:px-10 sm:pt-12 sm:pb-10'>
          <nav
            aria-label='Footer navigation'
            itemScope
            itemType='https://schema.org/SiteNavigationElement'
            className='relative z-[1] grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-3'
          >
            <div className='flex flex-col gap-6'>
              <Link href='/' aria-label='Neato_Pilot home'>
                <Image
                  src='/logo/sim-landing.svg'
                  alt='Neato_Pilot'
                  width={160}
                  height={26}
                  className='h-[26.4px] w-auto'
                />
              </Link>
              <p className='max-w-[200px] text-[13px] text-[var(--landing-text-muted)] leading-[150%]'>
                Your AI workforce, ready to deploy.
              </p>
            </div>

            <FooterColumn title='Product' items={PRODUCT_LINKS} />
            <FooterColumn title='Legal' items={LEGAL_LINKS} />
          </nav>
        </div>
      </div>
    </footer>
  )
}
