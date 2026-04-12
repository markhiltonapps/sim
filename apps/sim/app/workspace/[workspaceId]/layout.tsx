import { ToastProvider } from '@/components/emcn'
import { NavTour } from '@/app/workspace/[workspaceId]/components/product-tour'
import { ImpersonationBanner } from '@/app/workspace/[workspaceId]/impersonation-banner'
import { GlobalCommandsProvider } from '@/app/workspace/[workspaceId]/providers/global-commands-provider'
import { ProviderModelsLoader } from '@/app/workspace/[workspaceId]/providers/provider-models-loader'
import { SettingsLoader } from '@/app/workspace/[workspaceId]/providers/settings-loader'
import { WorkspacePermissionsProvider } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { WorkspaceScopeSync } from '@/app/workspace/[workspaceId]/providers/workspace-scope-sync'
import { MobileHeader } from '@/app/workspace/[workspaceId]/components/mobile-header'
import { MobileSidebarOverlay } from '@/app/workspace/[workspaceId]/components/mobile-sidebar-overlay'
import { Sidebar } from '@/app/workspace/[workspaceId]/w/components/sidebar/sidebar'

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <SettingsLoader />
      <ProviderModelsLoader />
      <GlobalCommandsProvider>
        <div className='flex h-screen w-full flex-col overflow-hidden bg-[var(--surface-1)]'>
          <ImpersonationBanner />
          <WorkspacePermissionsProvider>
            <WorkspaceScopeSync />
            {/* Mobile header — visible only on small screens */}
            <MobileHeader />
            <div className='flex min-h-0 flex-1'>
              {/* Desktop sidebar — hidden on mobile */}
              <div className='hidden shrink-0 md:block' suppressHydrationWarning>
                <Sidebar />
              </div>
              {/* Mobile sidebar overlay drawer */}
              <MobileSidebarOverlay />
              <div className='flex min-w-0 flex-1 flex-col p-0 md:p-[8px] md:pl-0'>
                <div className='flex-1 overflow-hidden md:rounded-[8px] md:border md:border-[var(--border)] bg-[var(--bg)]'>
                  {children}
                </div>
              </div>
            </div>
            <NavTour />
          </WorkspacePermissionsProvider>
        </div>
      </GlobalCommandsProvider>
    </ToastProvider>
  )
}
