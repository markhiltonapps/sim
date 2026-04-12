import { Skeleton } from '@/components/emcn'

/**
 * Skeleton component for admin settings loading state.
 * Matches the layout structure of the Admin component.
 */
export function AdminSkeleton() {
  return (
    <div className='flex h-full flex-col gap-6'>
      {/* Stats cards */}
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5'>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className='flex flex-col gap-1 rounded-[8px] border border-[var(--border-secondary)] px-4 py-3'
          >
            <Skeleton className='h-[12px] w-[80px]' />
            <Skeleton className='h-[28px] w-[48px]' />
          </div>
        ))}
      </div>

      <div className='h-px bg-[var(--border-secondary)]' />

      {/* Super admin toggle */}
      <div className='flex items-center justify-between'>
        <Skeleton className='h-[14px] w-[120px]' />
        <Skeleton className='h-[20px] w-[36px] rounded-full' />
      </div>

      <div className='h-px bg-[var(--border-secondary)]' />

      {/* User management header + search */}
      <div className='flex flex-col gap-3'>
        <div className='flex items-center justify-between'>
          <Skeleton className='h-[14px] w-[120px]' />
          <Skeleton className='h-[30px] w-[120px] rounded-md' />
        </div>

        <div className='flex gap-2'>
          <Skeleton className='h-9 flex-1 rounded-md' />
          <Skeleton className='h-9 w-[80px] rounded-md' />
        </div>

        {/* Table */}
        <div className='overflow-hidden rounded-[8px] border border-[var(--border-secondary)]'>
          <div className='flex items-center gap-3 border-[var(--border-secondary)] border-b bg-[var(--surface-secondary)] px-3 py-2'>
            <Skeleton className='h-[11px] w-[180px]' />
            <Skeleton className='h-[11px] flex-1' />
            <Skeleton className='h-[11px] w-[70px]' />
            <Skeleton className='h-[11px] w-[70px]' />
            <Skeleton className='h-[11px] w-[90px]' />
            <Skeleton className='h-[11px] w-[36px]' />
          </div>

          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className='flex items-center gap-3 border-[var(--border-secondary)] border-b px-3 py-2.5 last:border-b-0'
            >
              <Skeleton className='h-[14px] w-[180px]' />
              <Skeleton className='h-[14px] flex-1' />
              <Skeleton className='h-[20px] w-[50px] rounded-full' />
              <Skeleton className='h-[20px] w-[50px] rounded-full' />
              <Skeleton className='h-[12px] w-[90px]' />
              <Skeleton className='h-[28px] w-[28px] rounded-md' />
            </div>
          ))}
        </div>

        <div className='flex items-center justify-between'>
          <Skeleton className='h-[12px] w-[100px]' />
        </div>
      </div>
    </div>
  )
}
