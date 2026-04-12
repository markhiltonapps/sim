'use client'

import { useCallback, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  Ban,
  Check,
  Copy,
  Eye,
  Key,
  LogOut,
  MoreHorizontal,
  Search,
  Shield,
  ShieldOff,
  Trash2,
} from 'lucide-react'
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input as EmcnInput,
  Label,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Skeleton,
  Switch,
  toast,
} from '@/components/emcn'
import { useSession } from '@/lib/auth/auth-client'
import { cn } from '@/lib/core/utils/cn'
import { useAdminStats } from '@/hooks/queries/admin-stats'
import {
  useAdminUsers,
  useBanUser,
  useDeleteUser,
  useImpersonateUser,
  useResetUserPassword,
  useRevokeUserSessions,
  useSetUserRole,
  useUnbanUser,
} from '@/hooks/queries/admin-users'
import type { AdminUser } from '@/hooks/queries/admin-users'
import { useGeneralSettings, useUpdateGeneralSetting } from '@/hooks/queries/general-settings'
import { useImportWorkflow } from '@/hooks/queries/workflows'

const PAGE_SIZE = 20 as const

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const special = '!@#$%&*'
  let password = ''
  const array = new Uint8Array(14)
  crypto.getRandomValues(array)
  for (let i = 0; i < 12; i++) {
    password += chars[array[i] % chars.length]
  }
  password += special[array[12] % special.length]
  password += special[array[13] % special.length]
  return password
}

interface StatCardProps {
  label: string
  value: number | undefined
  loading: boolean
}

function StatCard({ label, value, loading }: StatCardProps) {
  return (
    <div className='flex flex-col gap-1 rounded-[8px] border border-[var(--border-secondary)] px-4 py-3'>
      <span className='text-[12px] text-[var(--text-tertiary)]'>{label}</span>
      {loading ? (
        <Skeleton className='h-[28px] w-[48px]' />
      ) : (
        <span className='text-[22px] font-semibold text-[var(--text-primary)]'>{value ?? 0}</span>
      )}
    </div>
  )
}

interface UserActionsMenuProps {
  user: AdminUser
  currentUserId: string | undefined
  isAdmin: boolean
  onImpersonate: (userId: string) => void
  onResetPassword: (user: AdminUser) => void
  onRevokeSessions: (user: AdminUser) => void
  onToggleRole: (user: AdminUser) => void
  onToggleBan: (user: AdminUser) => void
  onDelete: (user: AdminUser) => void
  isPending: boolean
}

function UserActionsMenu({
  user: u,
  currentUserId,
  isAdmin,
  onImpersonate,
  onResetPassword,
  onRevokeSessions,
  onToggleRole,
  onToggleBan,
  onDelete,
  isPending,
}: UserActionsMenuProps) {
  const isSelf = u.id === currentUserId

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='active'
          className='h-[28px] w-[28px] p-0'
          disabled={isPending}
        >
          <MoreHorizontal className='h-[14px] w-[14px]' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[180px]'>
        {!isSelf && isAdmin && (
          <DropdownMenuItem onClick={() => onImpersonate(u.id)}>
            <Eye className='mr-2 h-[14px] w-[14px]' />
            Impersonate
          </DropdownMenuItem>
        )}
        {!isSelf && (
          <DropdownMenuItem onClick={() => onResetPassword(u)}>
            <Key className='mr-2 h-[14px] w-[14px]' />
            Reset password
          </DropdownMenuItem>
        )}
        {!isSelf && (
          <DropdownMenuItem onClick={() => onRevokeSessions(u)}>
            <LogOut className='mr-2 h-[14px] w-[14px]' />
            Revoke sessions
          </DropdownMenuItem>
        )}
        {!isSelf && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onToggleRole(u)}>
              {u.role === 'admin' ? (
                <>
                  <ShieldOff className='mr-2 h-[14px] w-[14px]' />
                  Demote to user
                </>
              ) : (
                <>
                  <Shield className='mr-2 h-[14px] w-[14px]' />
                  Promote to admin
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleBan(u)}>
              {u.banned ? (
                <>
                  <Check className='mr-2 h-[14px] w-[14px]' />
                  Unban user
                </>
              ) : (
                <>
                  <Ban className='mr-2 h-[14px] w-[14px]' />
                  Ban user
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className='text-[var(--text-error)]'
              onClick={() => onDelete(u)}
            >
              <Trash2 className='mr-2 h-[14px] w-[14px]' />
              Delete user
            </DropdownMenuItem>
          </>
        )}
        {isSelf && (
          <DropdownMenuItem disabled>
            <span className='text-[var(--text-tertiary)]'>No actions (this is you)</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function Admin() {
  const params = useParams()
  const workspaceId = params?.workspaceId as string
  const { data: session } = useSession()

  const { data: settings } = useGeneralSettings()
  const updateSetting = useUpdateGeneralSetting()
  const importWorkflow = useImportWorkflow()

  const { data: stats, isLoading: statsLoading } = useAdminStats()

  const setUserRole = useSetUserRole()
  const banUser = useBanUser()
  const unbanUser = useUnbanUser()
  const impersonateUser = useImpersonateUser()
  const resetPassword = useResetUserPassword()
  const deleteUser = useDeleteUser()
  const revokeSessions = useRevokeUserSessions()

  const [workflowId, setWorkflowId] = useState('')
  const [usersOffset, setUsersOffset] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const [resetPasswordUser, setResetPasswordUser] = useState<AdminUser | null>(null)
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [passwordCopied, setPasswordCopied] = useState(false)

  const [deleteTargetUser, setDeleteTargetUser] = useState<AdminUser | null>(null)

  const [banTargetUser, setBanTargetUser] = useState<AdminUser | null>(null)
  const [banReason, setBanReason] = useState('')

  const [impersonatingUserId, setImpersonatingUserId] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)

  const {
    data: usersData,
    isLoading: usersLoading,
    error: usersError,
  } = useAdminUsers(usersOffset, PAGE_SIZE, searchQuery)

  const handleSearch = useCallback(() => {
    setUsersOffset(0)
    setSearchQuery(searchInput.trim())
  }, [searchInput])

  const totalPages = useMemo(
    () => Math.ceil((usersData?.total ?? 0) / PAGE_SIZE),
    [usersData?.total]
  )
  const currentPage = useMemo(() => Math.floor(usersOffset / PAGE_SIZE) + 1, [usersOffset])

  const handleSuperUserModeToggle = useCallback(
    async (checked: boolean) => {
      if (checked !== settings?.superUserModeEnabled && !updateSetting.isPending) {
        await updateSetting.mutateAsync({ key: 'superUserModeEnabled', value: checked })
      }
    },
    [settings?.superUserModeEnabled, updateSetting.isPending]
  )

  const handleImport = useCallback(() => {
    if (!workflowId.trim()) return
    importWorkflow.mutate(
      { workflowId: workflowId.trim(), targetWorkspaceId: workspaceId },
      { onSuccess: () => setWorkflowId('') }
    )
  }, [workflowId, workspaceId])

  const handleImpersonate = useCallback(
    (userId: string) => {
      if (session?.user?.role !== 'admin') {
        toast.error('Only admins can impersonate users.')
        return
      }
      setImpersonatingUserId(userId)
      impersonateUser.mutate(
        { userId },
        {
          onError: () => {
            setImpersonatingUserId(null)
            toast.error('Failed to impersonate user.')
          },
          onSuccess: () => {
            window.location.assign('/workspace')
          },
        }
      )
    },
    [session?.user?.role]
  )

  const handleOpenResetPassword = useCallback((u: AdminUser) => {
    const pw = generateTempPassword()
    setGeneratedPassword(pw)
    setPasswordCopied(false)
    setResetPasswordUser(u)
  }, [])

  const handleConfirmResetPassword = useCallback(() => {
    if (!resetPasswordUser || !generatedPassword) return
    resetPassword.mutate(
      { userId: resetPasswordUser.id, newPassword: generatedPassword },
      {
        onSuccess: () => {
          toast.success(`Password reset for ${resetPasswordUser.email}`)
        },
        onError: () => {
          toast.error('Failed to reset password.')
          setResetPasswordUser(null)
        },
      }
    )
  }, [resetPasswordUser, generatedPassword])

  const handleCopyPassword = useCallback(async () => {
    await navigator.clipboard.writeText(generatedPassword)
    setPasswordCopied(true)
    toast.success('Password copied to clipboard')
  }, [generatedPassword])

  const handleRevokeSessions = useCallback((u: AdminUser) => {
    revokeSessions.mutate(
      { userId: u.id },
      {
        onSuccess: () => toast.success(`All sessions revoked for ${u.email}`),
        onError: () => toast.error('Failed to revoke sessions.'),
      }
    )
  }, [])

  const handleToggleRole = useCallback((u: AdminUser) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin'
    setUserRole.mutate(
      { userId: u.id, role: newRole as 'user' | 'admin' },
      {
        onSuccess: () =>
          toast.success(`${u.email} is now ${newRole === 'admin' ? 'an admin' : 'a user'}`),
        onError: () => toast.error('Failed to update role.'),
      }
    )
  }, [])

  const handleOpenBan = useCallback((u: AdminUser) => {
    if (u.banned) {
      unbanUser.mutate(
        { userId: u.id },
        {
          onSuccess: () => toast.success(`${u.email} has been unbanned`),
          onError: () => toast.error('Failed to unban user.'),
        }
      )
    } else {
      setBanTargetUser(u)
      setBanReason('')
    }
  }, [])

  const handleConfirmBan = useCallback(() => {
    if (!banTargetUser) return
    banUser.mutate(
      {
        userId: banTargetUser.id,
        ...(banReason.trim() ? { banReason: banReason.trim() } : {}),
      },
      {
        onSuccess: () => {
          toast.success(`${banTargetUser.email} has been banned`)
          setBanTargetUser(null)
          setBanReason('')
        },
        onError: () => toast.error('Failed to ban user.'),
      }
    )
  }, [banTargetUser, banReason])

  const handleOpenDelete = useCallback((u: AdminUser) => {
    setDeleteTargetUser(u)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTargetUser) return
    deleteUser.mutate(
      { userId: deleteTargetUser.id },
      {
        onSuccess: () => {
          toast.success(`${deleteTargetUser.email} has been deleted`)
          setDeleteTargetUser(null)
        },
        onError: () => toast.error('Failed to delete user.'),
      }
    )
  }, [deleteTargetUser])

  const pendingUserIds = useMemo(() => {
    const ids = new Set<string>()
    if (setUserRole.isPending && (setUserRole.variables as { userId?: string })?.userId)
      ids.add((setUserRole.variables as { userId: string }).userId)
    if (banUser.isPending && (banUser.variables as { userId?: string })?.userId)
      ids.add((banUser.variables as { userId: string }).userId)
    if (unbanUser.isPending && (unbanUser.variables as { userId?: string })?.userId)
      ids.add((unbanUser.variables as { userId: string }).userId)
    if (deleteUser.isPending && (deleteUser.variables as { userId?: string })?.userId)
      ids.add((deleteUser.variables as { userId: string }).userId)
    if (impersonatingUserId) ids.add(impersonatingUserId)
    return ids
  }, [
    setUserRole.isPending,
    setUserRole.variables,
    banUser.isPending,
    banUser.variables,
    unbanUser.isPending,
    unbanUser.variables,
    deleteUser.isPending,
    deleteUser.variables,
    impersonatingUserId,
  ])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className='flex h-full flex-col gap-6'>
      {/* Stats cards */}
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5'>
        <StatCard label='Total Users' value={stats?.totalUsers} loading={statsLoading} />
        <StatCard label='New This Week' value={stats?.newUsersThisWeek} loading={statsLoading} />
        <StatCard label='Active Sessions' value={stats?.activeSessions} loading={statsLoading} />
        <StatCard label='Banned Users' value={stats?.bannedUsers} loading={statsLoading} />
        <StatCard label='Workspaces' value={stats?.totalWorkspaces} loading={statsLoading} />
      </div>

      <div className='h-px bg-[var(--border-secondary)]' />

      {/* Super admin toggle */}
      <div className='flex items-center justify-between'>
        <Label htmlFor='super-user-mode'>Super admin mode</Label>
        <Switch
          id='super-user-mode'
          checked={settings?.superUserModeEnabled ?? false}
          onCheckedChange={handleSuperUserModeToggle}
        />
      </div>

      <div className='h-px bg-[var(--border-secondary)]' />

      {/* User Management */}
      <div className='flex flex-col gap-3'>
        <div className='flex items-center justify-between'>
          <p className='font-medium text-[var(--text-primary)] text-sm'>User Management</p>
          <Button
            variant='active'
            className='h-[30px] px-3 text-[12px]'
            onClick={() => setShowImport((v) => !v)}
          >
            {showImport ? 'Hide Import' : 'Import Workflow'}
          </Button>
        </div>

        {showImport && (
          <div className='flex flex-col gap-2 rounded-[8px] border border-[var(--border-secondary)] p-3'>
            <p className='text-[var(--text-secondary)] text-[12px]'>
              Import a workflow by ID along with its associated copilot chats.
            </p>
            <div className='flex gap-2'>
              <EmcnInput
                value={workflowId}
                onChange={(e) => {
                  setWorkflowId(e.target.value)
                  importWorkflow.reset()
                }}
                placeholder='Enter workflow ID'
                disabled={importWorkflow.isPending}
              />
              <Button
                variant='primary'
                onClick={handleImport}
                disabled={importWorkflow.isPending || !workflowId.trim()}
              >
                {importWorkflow.isPending ? 'Importing...' : 'Import'}
              </Button>
            </div>
            {importWorkflow.error && (
              <p className='text-[var(--text-error)] text-[12px]'>
                {importWorkflow.error.message}
              </p>
            )}
            {importWorkflow.isSuccess && (
              <p className='text-[var(--text-secondary)] text-[12px]'>
                Workflow imported (new ID: {importWorkflow.data.newWorkflowId},{' '}
                {importWorkflow.data.copilotChatsImported ?? 0} copilot chats)
              </p>
            )}
          </div>
        )}

        {/* Search */}
        <div className='flex gap-2'>
          <div className='relative flex-1'>
            <Search className='absolute left-2.5 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[var(--text-tertiary)]' />
            <EmcnInput
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder='Search by email or user ID...'
              className='pl-8'
            />
          </div>
          <Button variant='primary' onClick={handleSearch} disabled={usersLoading}>
            Search
          </Button>
          {searchQuery && (
            <Button
              variant='active'
              onClick={() => {
                setSearchInput('')
                setSearchQuery('')
                setUsersOffset(0)
              }}
            >
              Clear
            </Button>
          )}
        </div>

        {usersError && (
          <p className='text-[var(--text-error)] text-[12px]'>
            {usersError instanceof Error ? usersError.message : 'Failed to fetch users'}
          </p>
        )}

        {/* Users table */}
        {usersLoading && !usersData && (
          <div className='flex flex-col gap-2'>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className='h-[44px] w-full rounded-md' />
            ))}
          </div>
        )}

        {usersData && (
          <>
            <div className='overflow-hidden rounded-[8px] border border-[var(--border-secondary)]'>
              {/* Header */}
              <div className='flex items-center gap-3 border-[var(--border-secondary)] border-b bg-[var(--surface-secondary)] px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]'>
                <span className='w-[180px]'>User</span>
                <span className='flex-1'>Email</span>
                <span className='w-[70px]'>Role</span>
                <span className='w-[70px]'>Status</span>
                <span className='w-[90px]'>Joined</span>
                <span className='w-[36px]' />
              </div>

              {usersData.users.length === 0 && (
                <div className='py-8 text-center text-[var(--text-tertiary)] text-sm'>
                  No users found.
                </div>
              )}

              {usersData.users.map((u) => (
                <div
                  key={u.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 text-[13px]',
                    'border-[var(--border-secondary)] border-b last:border-b-0',
                    'transition-colors hover-hover:bg-[var(--surface-hover)]'
                  )}
                >
                  <span className='w-[180px] truncate font-medium text-[var(--text-primary)]'>
                    {u.name || '—'}
                    {u.id === session?.user?.id && (
                      <span className='ml-1 text-[11px] text-[var(--text-tertiary)]'>(you)</span>
                    )}
                  </span>
                  <span className='flex-1 truncate text-[var(--text-secondary)]'>{u.email}</span>
                  <span className='w-[70px]'>
                    <Badge variant={u.role === 'admin' ? 'blue' : 'gray'}>
                      {u.role || 'user'}
                    </Badge>
                  </span>
                  <span className='w-[70px]'>
                    {u.banned ? (
                      <Badge variant='red'>Banned</Badge>
                    ) : u.emailVerified ? (
                      <Badge variant='green'>Active</Badge>
                    ) : (
                      <Badge variant='amber'>Unverified</Badge>
                    )}
                  </span>
                  <span className='w-[90px] text-[12px] text-[var(--text-tertiary)]'>
                    {formatDate(u.createdAt)}
                  </span>
                  <span className='w-[36px] flex justify-end'>
                    <UserActionsMenu
                      user={u}
                      currentUserId={session?.user?.id}
                      isAdmin={session?.user?.role === 'admin'}
                      onImpersonate={handleImpersonate}
                      onResetPassword={handleOpenResetPassword}
                      onRevokeSessions={handleRevokeSessions}
                      onToggleRole={handleToggleRole}
                      onToggleBan={handleOpenBan}
                      onDelete={handleOpenDelete}
                      isPending={pendingUserIds.has(u.id)}
                    />
                  </span>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className='flex items-center justify-between text-[var(--text-secondary)] text-[12px]'>
              <span>
                {usersData.total} user{usersData.total !== 1 ? 's' : ''}
                {totalPages > 1 && ` — page ${currentPage} of ${totalPages}`}
              </span>
              {totalPages > 1 && (
                <div className='flex gap-1'>
                  <Button
                    variant='active'
                    className='h-[28px] px-2 text-[12px]'
                    onClick={() => setUsersOffset((prev) => prev - PAGE_SIZE)}
                    disabled={usersOffset === 0 || usersLoading}
                  >
                    Previous
                  </Button>
                  <Button
                    variant='active'
                    className='h-[28px] px-2 text-[12px]'
                    onClick={() => setUsersOffset((prev) => prev + PAGE_SIZE)}
                    disabled={usersOffset + PAGE_SIZE >= (usersData?.total ?? 0) || usersLoading}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Reset Password Modal */}
      <Modal open={!!resetPasswordUser} onOpenChange={(open) => !open && setResetPasswordUser(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Reset Password</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div className='flex flex-col gap-3'>
              <p className='text-[13px] text-[var(--text-secondary)]'>
                Set a new temporary password for{' '}
                <span className='font-medium text-[var(--text-primary)]'>
                  {resetPasswordUser?.email}
                </span>
                . Share this password securely with the user and ask them to change it after logging
                in.
              </p>
              <div className='flex items-center gap-2'>
                <EmcnInput
                  value={generatedPassword}
                  onChange={(e) => {
                    setGeneratedPassword(e.target.value)
                    setPasswordCopied(false)
                  }}
                  className='font-mono text-[13px]'
                />
                <Button
                  variant='active'
                  className='h-[36px] w-[36px] flex-shrink-0 p-0'
                  onClick={handleCopyPassword}
                >
                  {passwordCopied ? (
                    <Check className='h-[14px] w-[14px] text-green-600' />
                  ) : (
                    <Copy className='h-[14px] w-[14px]' />
                  )}
                </Button>
              </div>
              {resetPassword.isSuccess && (
                <p className='text-[12px] text-green-600'>
                  Password has been reset. Make sure you copied it before closing.
                </p>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant='active' onClick={() => setResetPasswordUser(null)}>
              {resetPassword.isSuccess ? 'Done' : 'Cancel'}
            </Button>
            {!resetPassword.isSuccess && (
              <Button
                variant='primary'
                onClick={handleConfirmResetPassword}
                disabled={resetPassword.isPending || !generatedPassword.trim()}
              >
                {resetPassword.isPending ? 'Resetting...' : 'Reset Password'}
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Ban User Modal */}
      <Modal open={!!banTargetUser} onOpenChange={(open) => !open && setBanTargetUser(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Ban User</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div className='flex flex-col gap-3'>
              <p className='text-[13px] text-[var(--text-secondary)]'>
                Ban{' '}
                <span className='font-medium text-[var(--text-primary)]'>
                  {banTargetUser?.email}
                </span>
                ? They will be unable to log in or use the platform.
              </p>
              <EmcnInput
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder='Reason for ban (optional)'
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant='active' onClick={() => setBanTargetUser(null)}>
              Cancel
            </Button>
            <Button
              variant='primary'
              className='bg-red-600 hover-hover:bg-red-700'
              onClick={handleConfirmBan}
              disabled={banUser.isPending}
            >
              {banUser.isPending ? 'Banning...' : 'Ban User'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete User Modal */}
      <Modal open={!!deleteTargetUser} onOpenChange={(open) => !open && setDeleteTargetUser(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Delete User</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div className='flex flex-col gap-3'>
              <p className='text-[13px] text-[var(--text-secondary)]'>
                Permanently delete{' '}
                <span className='font-medium text-[var(--text-primary)]'>
                  {deleteTargetUser?.email}
                </span>
                ? This will remove their account, workspaces, workflows, and all associated data.
                This action cannot be undone.
              </p>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant='active' onClick={() => setDeleteTargetUser(null)}>
              Cancel
            </Button>
            <Button
              variant='primary'
              className='bg-red-600 hover-hover:bg-red-700'
              onClick={handleConfirmDelete}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
