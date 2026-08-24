import { cn } from '@/lib/utils'

export function PostflowLogo({
  className,
  compact = false,
  markClassName,
}: {
  className?: string
  compact?: boolean
  markClassName?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-3 text-slate-950', className)}>
      <span
        className={cn(
          'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 shadow-sm',
          markClassName,
        )}
      >
        <svg aria-hidden="true" className="h-7 w-7" fill="none" viewBox="0 0 64 64">
          <rect height="30" rx="8" stroke="#5EEAD4" strokeWidth="5" width="36" x="10" y="12" />
          <path d="M22 25h12M22 34h18" stroke="#F8FAFC" strokeLinecap="round" strokeWidth="5" />
          <path
            d="M39 30h8c4.4 0 8 3.6 8 8v2c0 4.4-3.6 8-8 8H26"
            stroke="#FBBF24"
            strokeLinecap="round"
            strokeWidth="5"
          />
          <path d="m31 40-7 8 7 8" stroke="#FBBF24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
        </svg>
      </span>
      {!compact ? <span className="text-lg font-semibold tracking-normal">Postflow</span> : null}
    </span>
  )
}
