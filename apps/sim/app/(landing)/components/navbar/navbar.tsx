'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useSession } from '@/lib/auth/auth-client'
import { cn } from '@/lib/core/utils/cn'
import { trackLandingCta } from '@/app/(landing)/landing-analytics'
import { getBrandConfig } from '@/ee/whitelabeling'

interface NavLink {
  label: string
  href: string
}

const NAV_LINKS: NavLink[] = [{ label: 'Pricing', href: '/#pricing' }]

const LOGO_CELL = 'flex items-center pl-5 lg:pl-16 pr-5'
const LINK_CELL = 'flex items-center px-3.5'

interface NavbarProps {
  logoOnly?: boolean
  blogPosts?: unknown[]
}

export default function Navbar({ logoOnly = false }: NavbarProps) {
  const brand = getBrandConfig()
  const searchParams = useSearchParams()
  const { data: session, isPending: isSessionPending } = useSession()
  const isAuthenticated = Boolean(session?.user?.id)
  const isBrowsingHome = searchParams.has('home')
  const useHomeLinks = isAuthenticated || isBrowsingHome
  const logoHref = useHomeLinks ? '/?home' : '/'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = () => {
      if (mq.matches) setMobileMenuOpen(false)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <nav
      aria-label='Primary navigation'
      className='relative flex h-[58px] border-[var(--landing-bg-elevated)] border-b-[1px] bg-[var(--landing-bg)] font-[430] font-season text-[var(--landing-text)] text-sm'
      itemScope
      itemType='https://schema.org/SiteNavigationElement'
    >
      <Link href={logoHref} className={LOGO_CELL} aria-label={`${brand.name} home`} itemProp='url'>
        <span itemProp='name' className='sr-only'>
          {brand.name}
        </span>
        {brand.logoUrl ? (
          <Image
            src={brand.logoUrl}
            alt={`${brand.name} Logo`}
            width={71}
            height={22}
            className='h-[22px] w-auto object-contain'
            priority
            unoptimized
          />
        ) : (
          <Image
            src='/logo/sim-landing.svg'
            alt='Neato_Pilot'
            width={160}
            height={22}
            className='h-[22px] w-auto'
            priority
          />
        )}
      </Link>

      {!logoOnly && (
        <>
          <ul className='mt-[0.75px] hidden lg:flex'>
            {NAV_LINKS.map(({ label, href: rawHref }) => {
              const href =
                useHomeLinks && rawHref.startsWith('/#') ? `/?home${rawHref.slice(1)}` : rawHref
              return (
                <li key={label} className='group flex'>
                  <Link
                    href={href}
                    itemProp='url'
                    className={cn(
                      LINK_CELL,
                      'h-[30px] self-center rounded-[5px] transition-colors duration-200 group-hover:bg-[var(--landing-bg-elevated)]'
                    )}
                    aria-label={label}
                  >
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className='hidden flex-1 lg:block' />

          <div
            className={cn(
              'hidden items-center gap-2 pr-16 pl-5 lg:flex',
              isSessionPending && 'invisible'
            )}
          >
            {isAuthenticated ? (
              <Link
                href='/workspace'
                className='inline-flex h-[30px] items-center gap-[7px] rounded-[5px] border border-[var(--white)] bg-[var(--white)] px-[9px] text-[13.5px] text-black transition-colors hover:border-[#E0E0E0] hover:bg-[#E0E0E0]'
                aria-label='Go to app'
                onClick={() =>
                  trackLandingCta({
                    label: 'Go to App',
                    section: 'navbar',
                    destination: '/workspace',
                  })
                }
              >
                Go to App
              </Link>
            ) : (
              <>
                <Link
                  href='/login'
                  className='inline-flex h-[30px] items-center rounded-[5px] border border-[var(--landing-border-strong)] px-[9px] text-[13.5px] text-[var(--landing-text)] transition-colors hover:bg-[var(--landing-bg-elevated)]'
                  aria-label='Log in'
                  onClick={() =>
                    trackLandingCta({ label: 'Log in', section: 'navbar', destination: '/login' })
                  }
                >
                  Log in
                </Link>
                <Link
                  href='/signup'
                  className='inline-flex h-[30px] items-center gap-[7px] rounded-[5px] border border-[var(--white)] bg-[var(--white)] px-2.5 text-[13.5px] text-black transition-colors hover:border-[#E0E0E0] hover:bg-[#E0E0E0]'
                  aria-label='Get started with Neato_Pilot'
                  onClick={() =>
                    trackLandingCta({
                      label: 'Get started',
                      section: 'navbar',
                      destination: '/signup',
                    })
                  }
                >
                  Get started
                </Link>
              </>
            )}
          </div>

          <div className='flex flex-1 items-center justify-end pr-5 lg:hidden'>
            <button
              type='button'
              className='flex h-[32px] w-[32px] items-center justify-center rounded-[5px] transition-colors hover:bg-[var(--landing-bg-elevated)]'
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              <MobileMenuIcon open={mobileMenuOpen} />
            </button>
          </div>

          <div
            className={cn(
              'fixed inset-x-0 top-[58px] bottom-0 z-50 flex flex-col overflow-y-auto bg-[var(--landing-bg)] font-[430] font-season text-sm transition-all duration-200 lg:hidden',
              mobileMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'
            )}
          >
            <ul className='flex flex-col'>
              {NAV_LINKS.map(({ label, href: rawHref }) => {
                const href =
                  useHomeLinks && rawHref.startsWith('/#') ? `/?home${rawHref.slice(1)}` : rawHref
                return (
                  <li key={label} className='border-[var(--landing-border)] border-b'>
                    <Link
                      href={href}
                      className='flex items-center px-5 py-3.5 text-[var(--landing-text)] transition-colors active:bg-[var(--landing-bg-elevated)]'
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {label}
                    </Link>
                  </li>
                )
              })}
            </ul>

            <div
              className={cn('mt-auto flex flex-col gap-2.5 p-5', isSessionPending && 'invisible')}
            >
              {isAuthenticated ? (
                <Link
                  href='/workspace'
                  className='flex h-[32px] items-center justify-center rounded-[5px] border border-[var(--white)] bg-[var(--white)] text-[14px] text-black transition-colors active:bg-[#E0E0E0]'
                  onClick={() => {
                    trackLandingCta({
                      label: 'Go to App',
                      section: 'navbar',
                      destination: '/workspace',
                    })
                    setMobileMenuOpen(false)
                  }}
                  aria-label='Go to app'
                >
                  Go to App
                </Link>
              ) : (
                <>
                  <Link
                    href='/login'
                    className='flex h-[32px] items-center justify-center rounded-[5px] border border-[var(--landing-border-strong)] text-[14px] text-[var(--landing-text)] transition-colors active:bg-[var(--landing-bg-elevated)]'
                    onClick={() => {
                      trackLandingCta({ label: 'Log in', section: 'navbar', destination: '/login' })
                      setMobileMenuOpen(false)
                    }}
                    aria-label='Log in'
                  >
                    Log in
                  </Link>
                  <Link
                    href='/signup'
                    className='flex h-[32px] items-center justify-center rounded-[5px] border border-[var(--white)] bg-[var(--white)] text-[14px] text-black transition-colors active:bg-[#E0E0E0]'
                    onClick={() => {
                      trackLandingCta({
                        label: 'Get started',
                        section: 'navbar',
                        destination: '/signup',
                      })
                      setMobileMenuOpen(false)
                    }}
                    aria-label='Get started with Neato_Pilot'
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </nav>
  )
}

function MobileMenuIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width='14' height='14' viewBox='0 0 14 14' fill='none'>
        <path
          d='M1 1L13 13M13 1L1 13'
          stroke='currentColor'
          strokeWidth='1.5'
          strokeLinecap='round'
        />
      </svg>
    )
  }
  return (
    <svg width='16' height='12' viewBox='0 0 16 12' fill='none'>
      <path
        d='M0 1H16M0 6H16M0 11H16'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
    </svg>
  )
}
