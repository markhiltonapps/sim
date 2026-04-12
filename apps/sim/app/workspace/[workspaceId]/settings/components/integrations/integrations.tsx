'use client'

import { useState } from 'react'
import { cn } from '@/lib/core/utils/cn'
import { ComposioApps } from '@/app/workspace/[workspaceId]/settings/components/integrations/composio-apps'
import { IntegrationsManager } from '@/app/workspace/[workspaceId]/settings/components/integrations/integrations-manager'

const TABS = [
  { id: 'credentials', label: 'Credentials' },
  { id: 'composio', label: 'App Connections' },
] as const

type TabId = (typeof TABS)[number]['id']

export function Integrations() {
  const [activeTab, setActiveTab] = useState<TabId>('credentials')

  return (
    <div className='flex h-full min-h-0 flex-col gap-4'>
      <div className='flex items-center gap-1 border-[var(--border)] border-b'>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type='button'
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'relative px-3 pb-2 pt-1 font-medium text-[13px] transition-colors',
              activeTab === tab.id
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className='absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[var(--text-primary)]' />
            )}
          </button>
        ))}
      </div>

      <div className='min-h-0 flex-1'>
        {activeTab === 'credentials' ? <IntegrationsManager /> : <ComposioApps />}
      </div>
    </div>
  )
}
