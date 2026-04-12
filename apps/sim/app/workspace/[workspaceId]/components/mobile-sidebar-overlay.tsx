'use client'

import { useCallback, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/core/utils/cn'
import { MobileSidebarProvider } from '@/app/workspace/[workspaceId]/components/mobile-sidebar-context'
import { Sidebar } from '@/app/workspace/[workspaceId]/w/components/sidebar/sidebar'
import { useSidebarStore } from '@/stores/sidebar/store'

export function MobileSidebarOverlay() {
  const isMobileOpen = useSidebarStore((state) => state.isMobileOpen)
  const setMobileOpen = useSidebarStore((state) => state.setMobileOpen)
  const pathname = usePathname()

  const handleClose = useCallback(() => {
    setMobileOpen(false)
  }, [setMobileOpen])

  /** Close the drawer on route change */
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname, setMobileOpen])

  /** Lock body scroll when open */
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileOpen])

  return (
    <div className='md:hidden'>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-200',
          isMobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={handleClose}
        aria-hidden='true'
      />
      {/* Drawer */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[280px] bg-[var(--surface-1)] shadow-overlay transition-transform duration-200 ease-out',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className='mobile-sidebar-drawer h-full'>
          <MobileSidebarProvider>
            <Sidebar />
          </MobileSidebarProvider>
        </div>
      </div>
    </div>
  )
}
