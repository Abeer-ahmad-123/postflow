import { StatusBadge } from '@/components/ui/status-badge'
import { formatDateTime, userName } from '@/lib/utils'
import type { PostAction } from '@/payload-types'

export function ActionTimeline({ actions }: { actions: PostAction[] }) {
  if (actions.length === 0) {
    return <p className="py-6 text-sm text-slate-500">No workflow actions have been recorded.</p>
  }

  return (
    <div className="space-y-5">
      {actions.map((action, index) => (
        <div className="relative pl-6" key={action.id}>
          <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-white" />
          {index < actions.length - 1 ? <span className="absolute bottom-[-22px] left-[5px] top-5 w-px bg-slate-200" /> : null}
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-950">{userName(action.performedBy)}</p>
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge status={action.action} />
                <span className="text-sm text-slate-500">{formatDateTime(action.performedAt)}</span>
              </div>
              {action.comment ? (
                <p className="mt-2 truncate text-sm text-slate-600" title={action.comment}>
                  {action.comment}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
