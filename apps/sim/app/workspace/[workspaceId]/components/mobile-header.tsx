'use client'

import { useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Menu } from 'lucide-react'
import { getBrandConfig } from '@/ee/whitelabeling'
import { Sim } from '@/components/emcn/icons'
import { useSidebarStore } from '@/stores/sidebar/store'

export function MobileHeader() {
  const brand = getBrandConfig()
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const setMobileOpen = useSidebarStore((state) => state.setMobileOpen)

  const handleToggle = useCallback(() => {
    setMobileOpen(true)
  }, [setMobileOpen])

  return (
    <div className='flex h-[48px] shrink-0 items-center gap-3 border-b border-[var(--border)] px-3 md:hidden'>
      <button
        type='button'
        onClick={handleToggle}
        className='flex h-[36px] w-[36px] items-center justify-center rounded-lg hover:bg-[var(--surface-hover)]'
        aria-label='Open sidebar'
      >
        <Menu className='h-5 w-5 text-[var(--text-icon)]' />
      </button>
      <Link href={`/workspace/${workspaceId}/home`} className='flex items-center gap-2'>
        {brand.logoUrl ? (
          <Image
            src={brand.logoUrl}
            alt={brand.name}
            width={20}
            height={20}
            className='h-5 w-5 object-contain'
            unoptimized
          />
        ) : (
          <Sim className='h-5 w-5' />
        )}
        <span className='font-semibold text-[var(--text-body)] text-sm'>{brand.name}</span>
      </Link>
    </div>
  )
}
