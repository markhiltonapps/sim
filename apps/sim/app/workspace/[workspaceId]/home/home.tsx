'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createLogger } from '@sim/logger'
import { useQueryClient } from '@tanstack/react-query'
import { Plug } from 'lucide-react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { usePostHog } from 'posthog-js/react'
import { PanelLeft } from '@/components/emcn/icons'
import { Button } from '@/components/emcn'
import { useSession } from '@/lib/auth/auth-client'
import { isTruthy, getEnv } from '@/lib/core/config/env'
import type { OAuthProvider } from '@/lib/oauth'
import { getProviderIdFromServiceId } from '@/lib/oauth/utils'
import {
  LandingPromptStorage,
  type LandingWorkflowSeed,
  LandingWorkflowSeedStorage,
} from '@/lib/core/utils/browser-storage'
import { captureEvent } from '@/lib/posthog/client'
import { persistImportedWorkflow } from '@/lib/workflows/operations/import-export'
import { useChatHistory, useMarkTaskRead } from '@/hooks/queries/tasks'
import { connectedServicesKeys, useConnectedServices } from '@/hooks/queries/home-agent'
import { scheduleKeys } from '@/hooks/queries/schedules'
import { tableKeys } from '@/hooks/queries/tables'
import type { ChatContext } from '@/stores/panel'
import {
  AgentChat,
  ConnectAppsModal,
  MothershipChat,
  MothershipView,
  TemplatePrompts,
  UserInput,
} from './components'
import { OAuthModal } from '@/app/workspace/[workspaceId]/components/oauth-modal'
import { getMothershipUseChatOptions, useAgentChat, useChat, useMothershipResize } from './hooks'
import type { FileAttachmentForApi, MothershipResource, MothershipResourceType } from './types'

const NANGO_ENABLED = isTruthy(getEnv('NEXT_PUBLIC_NANGO_ENABLED'))

const logger = createLogger('Home')

interface HomeProps {
  chatId?: string
}

export function Home({ chatId }: HomeProps = {}) {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialResourceId = searchParams.get('resource')
  const { data: session } = useSession()
  const posthog = usePostHog()
  const posthogRef = useRef(posthog)
  const [initialPrompt, setInitialPrompt] = useState('')
  const hasCheckedLandingStorageRef = useRef(false)
  const initialViewInputRef = useRef<HTMLDivElement>(null)
  const templateRef = useRef<HTMLDivElement>(null)
  const baseInputHeightRef = useRef<number | null>(null)

  const queryClient = useQueryClient()
  const [isInputEntering, setIsInputEntering] = useState(false)
  const [isAgentMode, setIsAgentMode] = useState(false)
  const [isAgentModeHydrated, setIsAgentModeHydrated] = useState(false)

  useEffect(() => {
    if (!NANGO_ENABLED) {
      setIsAgentModeHydrated(true)
      return
    }
    try {
      if (localStorage.getItem('sim:agentMode') === 'true') {
        setIsAgentMode(true)
      }
    } catch {}
    setIsAgentModeHydrated(true)
  }, [])
  const [isConnectAppsOpen, setIsConnectAppsOpen] = useState(false)
  const [inlineConnectServiceId, setInlineConnectServiceId] = useState<string | null>(null)

  const setAgentMode = useCallback((value: boolean) => {
    setIsAgentMode(value)
    try { localStorage.setItem('sim:agentMode', String(value)) } catch {}
  }, [])

  const handleConnectFromChat = useCallback((serviceId: string) => {
    setInlineConnectServiceId(serviceId)
  }, [])

  const handleInlineConnectClose = useCallback(() => {
    setInlineConnectServiceId(null)
    queryClient.invalidateQueries({ queryKey: connectedServicesKeys.list(workspaceId) })
  }, [queryClient, workspaceId])

  const { data: connectedServices = [] } = useConnectedServices(
    NANGO_ENABLED ? workspaceId : undefined
  )
  const connectedProviderIds = new Set(connectedServices.map((s) => s.providerId))
  const hasConnectedServices = connectedServices.length > 0

  // Auto-enable agent mode once the user has connected at least one service
  useEffect(() => {
    if (NANGO_ENABLED && hasConnectedServices && !isAgentMode) {
      setAgentMode(true)
    }
  }, [hasConnectedServices]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleScheduleCreated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() })
  }, [queryClient])

  const handleTableCreated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: tableKeys.lists() })
  }, [queryClient])

  const agentChat = useAgentChat({ workspaceId, onScheduleCreated: handleScheduleCreated, onTableCreated: handleTableCreated })

  const createWorkflowFromLandingSeed = useCallback(
    async (seed: LandingWorkflowSeed) => {
      try {
        const result = await persistImportedWorkflow({
          content: seed.workflowJson,
          filename: `${seed.workflowName}.json`,
          workspaceId,
          nameOverride: seed.workflowName,
          descriptionOverride: seed.workflowDescription || 'Imported from landing template',
          colorOverride: seed.color,
          createWorkflow: async ({ name, description, color, workspaceId }) => {
            const response = await fetch('/api/workflows', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name,
                description,
                color,
                workspaceId,
                deduplicate: true,
              }),
            })

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}))
              throw new Error(errorData.error || 'Failed to create workflow')
            }

            return response.json()
          },
        })

        if (result?.workflowId) {
          window.location.href = `/workspace/${workspaceId}/w/${result.workflowId}`
          return
        }

        logger.warn('Landing workflow seed did not produce a workflow', {
          templateId: seed.templateId,
        })
      } catch (error) {
        logger.error('Error creating workflow from landing workflow seed:', error)
      }
    },
    [workspaceId]
  )

  useEffect(() => {
    if (hasCheckedLandingStorageRef.current) return
    hasCheckedLandingStorageRef.current = true

    const workflowSeed = LandingWorkflowSeedStorage.consume()
    if (workflowSeed) {
      logger.info('Retrieved landing page workflow seed, creating workflow in workspace')
      void createWorkflowFromLandingSeed(workflowSeed)
      return
    }

    // const templateId = LandingTemplateStorage.consume()
    // if (templateId) {
    //   logger.info('Retrieved landing page template, redirecting to template detail')
    //   router.replace(`/workspace/${workspaceId}/templates/${templateId}?use=true`)
    //   return
    // }

    const prompt = LandingPromptStorage.consume()
    if (prompt) {
      logger.info('Retrieved landing page prompt, populating home input')
      setInitialPrompt(prompt)
    }
  }, [createWorkflowFromLandingSeed, workspaceId, router])

  const wasSendingRef = useRef(false)

  useChatHistory(chatId)
  const { mutate: markRead } = useMarkTaskRead(workspaceId)

  const { mothershipRef, handleResizePointerDown, clearWidth } = useMothershipResize()

  const [isResourceCollapsed, setIsResourceCollapsed] = useState(true)
  const [skipResourceTransition, setSkipResourceTransition] = useState(false)
  const isResourceCollapsedRef = useRef(isResourceCollapsed)
  isResourceCollapsedRef.current = isResourceCollapsed

  const collapseResource = useCallback(() => {
    clearWidth()
    setIsResourceCollapsed(true)
  }, [clearWidth])

  const expandResource = useCallback(() => {
    setIsResourceCollapsed(false)
  }, [])

  const handleResourceEvent = useCallback(() => {
    if (isResourceCollapsedRef.current) {
      setIsResourceCollapsed(false)
    }
  }, [])

  const {
    messages,
    isSending,
    isReconnecting,
    sendMessage,
    stopGeneration,
    resolvedChatId,
    resources,
    activeResourceId,
    setActiveResourceId,
    addResource,
    removeResource,
    reorderResources,
    messageQueue,
    removeFromQueue,
    sendNow,
    editQueuedMessage,
    streamingFile,
    genericResourceData,
  } = useChat(
    workspaceId,
    chatId,
    getMothershipUseChatOptions({
      onResourceEvent: handleResourceEvent,
      initialActiveResourceId: initialResourceId,
    })
  )

  const [editingInputValue, setEditingInputValue] = useState('')
  const [prevChatId, setPrevChatId] = useState(chatId)
  const clearEditingValue = useCallback(() => setEditingInputValue(''), [])

  // Clear editing value when navigating to a different chat (guarded render-phase update)
  if (chatId !== prevChatId) {
    setPrevChatId(chatId)
    setEditingInputValue('')
  }

  const handleEditQueuedMessage = useCallback(
    (id: string) => {
      const msg = editQueuedMessage(id)
      if (msg) {
        setEditingInputValue(msg.content)
      }
    },
    [editQueuedMessage]
  )

  useEffect(() => {
    const url = new URL(window.location.href)
    if (activeResourceId) {
      url.searchParams.set('resource', activeResourceId)
    } else {
      url.searchParams.delete('resource')
    }
    url.hash = ''
    window.history.replaceState(null, '', url.toString())
  }, [activeResourceId])

  useEffect(() => {
    wasSendingRef.current = false
    if (resolvedChatId) markRead(resolvedChatId)
  }, [resolvedChatId, markRead])

  useEffect(() => {
    if (wasSendingRef.current && !isSending && resolvedChatId) {
      markRead(resolvedChatId)
    }
    wasSendingRef.current = isSending
  }, [isSending, resolvedChatId, markRead])

  useEffect(() => {
    if (!(resources.length > 0 && isResourceCollapsedRef.current)) return
    setIsResourceCollapsed(false)
    setSkipResourceTransition(true)
    const id = requestAnimationFrame(() => setSkipResourceTransition(false))
    return () => cancelAnimationFrame(id)
  }, [resources])

  useEffect(() => {
    posthogRef.current = posthog
  }, [posthog])

  const handleStopGeneration = useCallback(() => {
    captureEvent(posthogRef.current, 'task_generation_aborted', {
      workspace_id: workspaceId,
      view: 'mothership',
    })
    stopGeneration()
  }, [stopGeneration, workspaceId])

  const handleSubmit = useCallback(
    (text: string, fileAttachments?: FileAttachmentForApi[], contexts?: ChatContext[]) => {
      const trimmed = text.trim()
      if (!trimmed && !(fileAttachments && fileAttachments.length > 0)) return

      captureEvent(posthogRef.current, 'task_message_sent', {
        workspace_id: workspaceId,
        has_attachments: !!(fileAttachments && fileAttachments.length > 0),
        has_contexts: !!(contexts && contexts.length > 0),
        is_new_task: !chatId,
      })

      if (initialViewInputRef.current) {
        setIsInputEntering(true)
      }

      sendMessage(trimmed || 'Analyze the attached file(s).', fileAttachments, contexts)
    },
    [sendMessage, workspaceId, chatId]
  )

  useEffect(() => {
    const handler = (e: Event) => {
      const message = (e as CustomEvent<{ message: string }>).detail?.message
      if (message) sendMessage(message)
    }
    window.addEventListener('mothership-send-message', handler)
    return () => window.removeEventListener('mothership-send-message', handler)
  }, [sendMessage])

  const handleContextAdd = useCallback(
    (context: ChatContext) => {
      let resourceType: MothershipResourceType | null = null
      let resourceId: string | null = null
      const resourceTitle: string = context.label

      switch (context.kind) {
        case 'workflow':
        case 'current_workflow':
          resourceType = 'workflow'
          resourceId = context.workflowId
          break
        case 'knowledge':
          if (context.knowledgeId) {
            resourceType = 'knowledgebase'
            resourceId = context.knowledgeId
          }
          break
        case 'table':
          if (context.tableId) {
            resourceType = 'table'
            resourceId = context.tableId
          }
          break
        case 'file':
          if (context.fileId) {
            resourceType = 'file'
            resourceId = context.fileId
          }
          break
        default:
          break
      }

      if (resourceType && resourceId) {
        const resource: MothershipResource = {
          type: resourceType,
          id: resourceId,
          title: resourceTitle,
        }
        addResource(resource)
        handleResourceEvent()
      }
    },
    [addResource, handleResourceEvent]
  )

  const hasMessages = messages.length > 0

  useEffect(() => {
    if (hasMessages) return
    const input = initialViewInputRef.current
    const templates = templateRef.current
    if (!input || !templates) return

    const ro = new ResizeObserver((entries) => {
      const height = entries[0].contentRect.height
      if (baseInputHeightRef.current === null) baseInputHeightRef.current = height
      const delta = Math.max(0, (height - baseInputHeightRef.current) / 2)
      templates.style.marginTop = delta > 0 ? `calc(-30vh + ${delta}px)` : ''
    })
    ro.observe(input)
    return () => ro.disconnect()
  }, [hasMessages])

  if (!isAgentModeHydrated) {
    return <div className='h-full bg-[var(--bg)]' />
  }

  if (!hasMessages && !chatId && (!isAgentMode || agentChat.messages.length === 0)) {
    return (
      <>
        <div className='h-full overflow-y-auto bg-[var(--bg)] [scrollbar-gutter:stable_both-edges]'>
          <div className='flex min-h-full flex-col items-center justify-center px-3 pb-[2vh] sm:px-6'>
            <h1
              data-tour='home-greeting'
              className='mb-4 max-w-[42rem] text-balance font-[430] font-season text-[24px] text-[var(--text-primary)] tracking-[-0.02em] sm:mb-6 sm:text-[32px]'
            >
              What should we get done
              {session?.user?.name ? `, ${session.user.name.split(' ')[0]}` : ''}?
            </h1>
            <div ref={initialViewInputRef} className='w-full' data-tour='home-chat-input'>
              {isAgentMode ? (
                <UserInput
                  defaultValue={initialPrompt}
                  onSubmit={(text) => agentChat.sendMessage(text)}
                  isSending={agentChat.isSending}
                  onStopGeneration={agentChat.stopGeneration}
                  userId={session?.user?.id}
                  isInitialView
                />
              ) : (
                <UserInput
                  defaultValue={initialPrompt}
                  onSubmit={handleSubmit}
                  isSending={isSending}
                  onStopGeneration={handleStopGeneration}
                  userId={session?.user?.id}
                  onContextAdd={handleContextAdd}
                />
              )}
            </div>

            {/* Agent mode toggle + Connect Apps */}
            {NANGO_ENABLED && (
              <div className='mt-3 flex flex-wrap items-center justify-center gap-2'>
                <button
                  type='button'
                  onClick={() => setAgentMode(!isAgentMode)}
                  className={`flex h-[28px] items-center gap-1.5 rounded-full px-3 text-[12px] transition-colors ${
                    isAgentMode
                      ? 'bg-[var(--text-primary)] text-[var(--surface-1)]'
                      : 'bg-[var(--surface-3)] text-[var(--text-secondary)] hover:bg-[var(--surface-4)]'
                  }`}
                >
                  <Plug className='h-[10px] w-[10px]' />
                  {isAgentMode ? 'Agent mode' : 'Use agent'}
                </button>
                {hasConnectedServices && (
                  <span className='text-[11px] text-[var(--text-secondary)]'>
                    {connectedServices.length} app{connectedServices.length !== 1 ? 's' : ''} connected
                  </span>
                )}
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={() => setIsConnectAppsOpen(true)}
                  className='h-[28px] px-2 text-[11px] text-[var(--text-secondary)]'
                >
                  Connect apps
                </Button>
              </div>
            )}
          </div>
          <div
            ref={templateRef}
            data-tour='home-templates'
            className='-mt-[15vh] mx-auto w-full max-w-[68rem] px-3 pb-8 sm:-mt-[30vh] sm:px-6 lg:px-10'
          >
            {!isAgentMode && <TemplatePrompts onSelect={handleSubmit} />}
          </div>
        </div>

        {NANGO_ENABLED && (
          <ConnectAppsModal
            isOpen={isConnectAppsOpen}
            onClose={() => setIsConnectAppsOpen(false)}
            workspaceId={workspaceId}
            connectedProviderIds={connectedProviderIds}
          />
        )}
      </>
    )
  }

  // Agent mode chat view
  if (isAgentMode) {
    return (
      <>
        <div className='relative flex h-full flex-col bg-[#F8FAFC] font-manrope'>
          {/* Agent mode header */}
          <div className='flex items-center justify-between border-b border-[#E2E8F0] bg-white px-3 py-2 shadow-sm sm:px-5 sm:py-2.5'>
            <div className='flex items-center gap-2 sm:gap-3'>
              <div className='flex h-[28px] w-[28px] items-center justify-center rounded-lg bg-[#3F51B5]'>
                <Plug className='h-[13px] w-[13px] text-white' />
              </div>
              <div className='flex flex-col'>
                <span className='text-[13px] font-semibold tracking-[-0.01em] text-[#0F172A]'>Agent Mode</span>
                {connectedServices.length > 0 && (
                  <span className='hidden text-[11px] text-[#94A3B8] sm:block'>
                    {connectedServices.map((s) => s.displayName || s.providerId).join(' · ')}
                  </span>
                )}
              </div>
            </div>
            <div className='flex items-center gap-1 sm:gap-2'>
              {NANGO_ENABLED && (
                <button
                  type='button'
                  onClick={() => setIsConnectAppsOpen(true)}
                  className='flex h-[30px] items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-2 text-[12px] font-medium text-[#475569] transition-colors hover:bg-[#F1F5F9] sm:px-3'
                >
                  <Plug className='h-[11px] w-[11px]' />
                  <span className='hidden sm:inline'>Connect Apps</span>
                  <span className='sm:hidden'>Apps</span>
                </button>
              )}
              <button
                type='button'
                onClick={() => {
                  setAgentMode(false)
                  agentChat.clearMessages()
                }}
                className='flex h-[30px] items-center rounded-lg px-2 text-[12px] font-medium text-[#94A3B8] transition-colors hover:text-[#475569] sm:px-3'
              >
                Exit
              </button>
            </div>
          </div>

          <div className='flex-1 overflow-hidden'>
            <AgentChat
              messages={agentChat.messages}
              isSending={agentChat.isSending}
              statusMessage={agentChat.statusMessage}
              onSubmit={(text) => agentChat.sendMessage(text)}
              onStopGeneration={agentChat.stopGeneration}
              onConnectService={NANGO_ENABLED ? handleConnectFromChat : undefined}
              connectedServices={connectedServices}
              userId={session?.user?.id}
            />
          </div>
        </div>

        {NANGO_ENABLED && (
          <ConnectAppsModal
            isOpen={isConnectAppsOpen}
            onClose={() => setIsConnectAppsOpen(false)}
            workspaceId={workspaceId}
            connectedProviderIds={connectedProviderIds}
          />
        )}

        {NANGO_ENABLED && inlineConnectServiceId && (
          <OAuthModal
            isOpen
            onClose={handleInlineConnectClose}
            provider={getProviderIdFromServiceId(inlineConnectServiceId) as OAuthProvider}
            serviceId={inlineConnectServiceId}
            mode='connect'
            workspaceId={workspaceId}
            credentialCount={connectedProviderIds.size}
            knowledgeBaseId='home-agent'
          />
        )}
      </>
    )
  }

  return (
    <>
      <div className='relative flex h-full flex-col bg-[var(--bg)] md:flex-row'>
        <div className='flex h-full min-w-0 flex-1 flex-col md:min-w-[320px]'>
          <MothershipChat
            messages={messages}
            isSending={isSending}
            isReconnecting={isReconnecting}
            onSubmit={handleSubmit}
            onStopGeneration={handleStopGeneration}
            messageQueue={messageQueue}
            onRemoveQueuedMessage={removeFromQueue}
            onSendQueuedMessage={sendNow}
            onEditQueuedMessage={handleEditQueuedMessage}
            userId={session?.user?.id}
            chatId={resolvedChatId}
            onContextAdd={handleContextAdd}
            editValue={editingInputValue}
            onEditValueConsumed={clearEditingValue}
            animateInput={isInputEntering}
            onInputAnimationEnd={isInputEntering ? () => setIsInputEntering(false) : undefined}
            initialScrollBlocked={resources.length > 0 && isResourceCollapsed}
          />
        </div>

        {/* Resize handle — zero-width flex child whose absolute child straddles the border */}
        {!isResourceCollapsed && (
          <div className='relative z-20 hidden w-0 flex-none md:block'>
            <div
              className='absolute inset-y-0 left-[-4px] w-[8px] cursor-ew-resize'
              role='separator'
              aria-orientation='vertical'
              aria-label='Resize resource panel'
              onPointerDown={handleResizePointerDown}
            />
          </div>
        )}

        <div className='hidden md:contents'>
          <MothershipView
            ref={mothershipRef}
            workspaceId={workspaceId}
            chatId={resolvedChatId}
            resources={resources}
            activeResourceId={activeResourceId}
            onSelectResource={setActiveResourceId}
            onAddResource={addResource}
            onRemoveResource={removeResource}
            onReorderResources={reorderResources}
            onCollapse={collapseResource}
            isCollapsed={isResourceCollapsed}
            streamingFile={streamingFile}
            genericResourceData={genericResourceData}
            className={skipResourceTransition ? '!transition-none' : undefined}
          />
        </div>

        {isResourceCollapsed && (
          <div className='absolute top-[8.5px] right-[16px] hidden md:block'>
            <button
              type='button'
              onClick={expandResource}
              className='flex h-[30px] w-[30px] items-center justify-center rounded-[8px] hover-hover:bg-[var(--surface-active)]'
              aria-label='Expand resource view'
            >
              <PanelLeft className='h-[16px] w-[16px] text-[var(--text-icon)]' />
            </button>
          </div>
        )}
      </div>

      {NANGO_ENABLED && (
        <ConnectAppsModal
          isOpen={isConnectAppsOpen}
          onClose={() => setIsConnectAppsOpen(false)}
          workspaceId={workspaceId}
          connectedProviderIds={connectedProviderIds}
        />
      )}
    </>
  )
}
