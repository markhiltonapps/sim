import { Skeleton } from '@/components/emcn'

export function PageLoadingSkeleton() {
  return (
    <div className='flex h-full flex-col'>
      <div className='flex items-center justify-between border-b border-[var(--border)] px-6 py-3'>
        <div className='flex items-center gap-3'>
          <Skeleton className='h-[14px] w-[14px] rounded-sm' />
          <Skeleton className='h-[16px] w-[120px] rounded-sm' />
        </div>
        <Skeleton className='h-[28px] w-[80px] rounded-md' />
      </div>
      <div className='flex items-center gap-2 border-b border-[var(--border)] px-6 py-2.5'>
        <Skeleton className='h-[14px] w-[14px] rounded-sm' />
        <Skeleton className='h-[14px] w-[200px] rounded-sm' />
      </div>
      <div className='flex-1 p-6'>
        <div className='flex flex-col gap-3'>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className='h-[40px] w-full rounded-md' />
          ))}
        </div>
      </div>
    </div>
  )
}
