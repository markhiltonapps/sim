'use client'

import { useCallback, useState } from 'react'
import { Check, Plus, Zap } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Modal, ModalBody, ModalContent, ModalHeader } from '@/components/emcn'
import type { OAuthProvider } from '@/lib/oauth'
import { getProviderIdFromServiceId } from '@/lib/oauth/utils'
import { OAuthModal } from '@/app/workspace/[workspaceId]/components/oauth-modal'
import { connectedServicesKeys } from '@/hooks/queries/home-agent'

interface ServiceConfig {
  serviceId: string
  name: string
  description: string
  color: string
}

const FEATURED_SERVICES: ServiceConfig[] = [
  {
    serviceId: 'outlook',
    name: 'Outlook',
    description: 'Read and send emails',
    color: '#0078D4',
  },
  {
    serviceId: 'google-email',
    name: 'Gmail',
    description: 'Read and send emails',
    color: '#EA4335',
  },
  {
    serviceId: 'slack',
    name: 'Slack',
    description: 'Send messages and read channels',
    color: '#4A154B',
  },
  {
    serviceId: 'google-calendar',
    name: 'Google Calendar',
    description: 'View and create calendar events',
    color: '#4285F4',
  },
  {
    serviceId: 'notion',
    name: 'Notion',
    description: 'Read and create pages',
    color: '#000000',
  },
  {
    serviceId: 'github',
    name: 'GitHub',
    description: 'Manage repos and issues',
    color: '#24292E',
  },
  {
    serviceId: 'jira',
    name: 'Jira',
    description: 'Track and manage issues',
    color: '#0052CC',
  },
  {
    serviceId: 'linear',
    name: 'Linear',
    description: 'Manage issues and projects',
    color: '#5E6AD2',
  },
  {
    serviceId: 'google-drive',
    name: 'Google Drive',
    description: 'Access and manage files',
    color: '#0F9D58',
  },
  {
    serviceId: 'google-sheets',
    name: 'Google Sheets',
    description: 'Read and write spreadsheets',
    color: '#0F9D58',
  },
  {
    serviceId: 'hubspot',
    name: 'HubSpot',
    description: 'Access CRM data',
    color: '#FF7A59',
  },
  {
    serviceId: 'asana',
    name: 'Asana',
    description: 'Manage tasks and projects',
    color: '#F06A6A',
  },
  {
    serviceId: 'posthog',
    name: 'PostHog',
    description: 'Analytics, feature flags, insights',
    color: '#F54E00',
  },
]

interface ConnectAppsModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  connectedProviderIds: Set<string>
}

export function ConnectAppsModal({
  isOpen,
  onClose,
  workspaceId,
  connectedProviderIds,
}: ConnectAppsModalProps) {
  const queryClient = useQueryClient()
  const [connectingServiceId, setConnectingServiceId] = useState<string | null>(null)
  const [oauthModalService, setOauthModalService] = useState<ServiceConfig | null>(null)
  const [credentialCount, setCredentialCount] = useState(0)

  const handleConnect = useCallback(
    (service: ServiceConfig) => {
      setCredentialCount(connectedProviderIds.size)
      setOauthModalService(service)
      setConnectingServiceId(service.serviceId)
    },
    [connectedProviderIds.size]
  )

  const handleOAuthModalClose = useCallback(() => {
    setOauthModalService(null)
    setConnectingServiceId(null)
    // Refetch the connected services so the UI updates
    queryClient.invalidateQueries({
      queryKey: connectedServicesKeys.list(workspaceId),
    })
  }, [queryClient, workspaceId])

  return (
    <>
      <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <ModalContent size='lg'>
          <ModalHeader>
            <div className='flex items-center gap-2'>
              <Zap className='h-[16px] w-[16px] text-[var(--text-primary)]' />
              Connect Apps
            </div>
          </ModalHeader>
          <ModalBody>
            <p className='mb-4 text-[13px] text-[var(--text-secondary)]'>
              Connect your apps and services so your AI agent can read emails, check calendars,
              manage tasks, and more — right from the home page chat.
            </p>
            <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
              {FEATURED_SERVICES.map((service) => {
                const isConnected = connectedProviderIds.has(service.serviceId)
                const isConnecting = connectingServiceId === service.serviceId

                return (
                  <div
                    key={service.serviceId}
                    className='flex items-center justify-between rounded-[8px] border border-[var(--border)] p-3'
                  >
                    <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                      <span className='truncate text-[13px] font-medium text-[var(--text-primary)]'>
                        {service.name}
                      </span>
                      <span className='truncate text-[11px] text-[var(--text-secondary)]'>
                        {service.description}
                      </span>
                    </div>
                    <div className='ml-2 flex shrink-0 items-center gap-1.5'>
                      {isConnected && (
                        <div className='flex h-[20px] w-[20px] items-center justify-center rounded-full bg-[var(--color-success-subtle)]'>
                          <Check className='h-[10px] w-[10px] text-[var(--color-success)]' />
                        </div>
                      )}
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => handleConnect(service)}
                        disabled={isConnecting}
                        className='h-[26px] px-2 text-[11px]'
                      >
                        <Plus className='h-[10px] w-[10px]' />
                        {isConnected ? 'Reconnect' : 'Connect'}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>

      {oauthModalService && (
        <OAuthModal
          isOpen={Boolean(oauthModalService)}
          onClose={handleOAuthModalClose}
          provider={getProviderIdFromServiceId(oauthModalService.serviceId) as OAuthProvider}
          serviceId={oauthModalService.serviceId}
          mode='connect'
          workspaceId={workspaceId}
          credentialCount={credentialCount}
          knowledgeBaseId='home-agent'
        />
      )}
    </>
  )
}
