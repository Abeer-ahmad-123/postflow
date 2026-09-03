import { CheckCheck, Send } from 'lucide-react'
import Link from 'next/link'

import { ReadyForLeoTable } from '@/components/posts/ready-for-leo-table'
import { getPayloadClient } from '@/lib/payload/getPayloadClient'
import { parsePage } from '@/lib/posts/postQueries'
import { cn } from '@/lib/utils'
import type { PostStatus } from '@/lib/workflow/postWorkflow'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<Record<string, string | string[] | undefined>>
type ReadyForLeoStatus = Extract<PostStatus, 'posted' | 'ready'>

const readyForLeoTabs: {
  href: string
  icon: typeof CheckCheck
  label: string
  status: ReadyForLeoStatus
}[] = [
  {
    href: '/ready-for-leo',
    icon: CheckCheck,
    label: 'Ready',
    status: 'ready',
  },
  {
    href: '/ready-for-leo?status=posted',
    icon: Send,
    label: 'Posted',
    status: 'posted',
  },
]

function parseReadyForLeoStatus(value?: string): ReadyForLeoStatus {
  return value === 'posted' ? 'posted' : 'ready'
}

export default async function ReadyForLeoPage({ searchParams }: { searchParams: SearchParams }) {
  const rawParams = await searchParams
  const page = parsePage(typeof rawParams.page === 'string' ? rawParams.page : undefined)
  const activeStatus = parseReadyForLeoStatus(typeof rawParams.status === 'string' ? rawParams.status : undefined)
  const ActiveIcon = activeStatus === 'posted' ? Send : CheckCheck
  const payload = await getPayloadClient()
  const posts = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: 10,
    overrideAccess: true,
    page,
    sort: '-updatedAt',
    where: {
      status: {
        equals: activeStatus,
      },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-normal text-slate-950">
            <ActiveIcon className="h-6 w-6 text-teal-600" />
            Ready for Leo
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {activeStatus === 'posted'
              ? 'Posts that have already been posted and can be restored to ready.'
              : 'Posts that are ready for final posting.'}
          </p>
        </div>
        <nav
          aria-label="Ready for Leo views"
          className="inline-flex w-full rounded-lg border border-slate-200 bg-white p-1 sm:w-auto"
        >
          {readyForLeoTabs.map((tab) => {
            const TabIcon = tab.icon
            const active = tab.status === activeStatus

            return (
              <Link
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors sm:flex-none',
                  active
                    ? 'bg-slate-950 text-white'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
                )}
                href={tab.href}
                key={tab.status}
              >
                <TabIcon className="h-4 w-4" />
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <ReadyForLeoTable
        docs={posts.docs}
        hasNextPage={posts.hasNextPage}
        hasPrevPage={posts.hasPrevPage}
        page={posts.page || 1}
        status={activeStatus}
        totalPages={posts.totalPages}
      />
    </div>
  )
}
