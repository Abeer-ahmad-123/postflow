import { Activity, ArrowRight, Plus } from 'lucide-react'
import Link from 'next/link'

import { SummaryCards } from '@/components/dashboard/summary-cards'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getDashboardCounts } from '@/lib/posts/postQueries'
import { formatDateTime, userName } from '@/lib/utils'
import { getPayloadClient } from '@/lib/payload/getPayloadClient'
import { statusLabels, type PostStatus } from '@/lib/workflow/postWorkflow'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const payload = await getPayloadClient()

  const [counts, recentPosts, recentActions] = await Promise.all([
    getDashboardCounts({ payload }),
    payload.find({
      collection: 'posts',
      depth: 1,
      limit: 6,
      overrideAccess: true,
      pagination: false,
      select: {
        status: true,
        topicLink: true,
        topicName: true,
      },
      sort: '-updatedAt',
    }),
    payload.find({
      collection: 'post-actions',
      depth: 1,
      limit: 6,
      overrideAccess: true,
      pagination: false,
      select: {
        action: true,
        comment: true,
        performedAt: true,
        performedBy: true,
        post: true,
      },
      sort: '-performedAt',
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Track topic intake, review, proofing, posting, and declines.</p>
        </div>
        <Button asChild>
          <Link href="/posts/new" className='text-white'>
            <Plus className="h-4 w-4" />
            New Topic
          </Link>
        </Button>
      </div>

      <SummaryCards all={counts.all} byStatus={counts.byStatus} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Recent Posts</CardTitle>
            <Button asChild size="sm" variant="outline">
              <Link href="/posts">
                View All
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-slate-100">
              {recentPosts.docs.length === 0 ? (
                <p className="py-8 text-sm text-slate-500">No topics yet.</p>
              ) : (
                recentPosts.docs.map((post) => (
                  <Link
                    className="flex items-center justify-between gap-4 py-3 transition hover:bg-slate-50"
                    href={`/posts/${post.id}`}
                    key={post.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-950">{post.topicName}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{post.topicLink}</p>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={post.status} />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-400" />
              Latest Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActions.docs.length === 0 ? (
                <p className="py-8 text-sm text-slate-500">No workflow actions yet.</p>
              ) : (
                recentActions.docs.map((action) => (
                  <div className="border-l-2 border-slate-200 pl-4" key={action.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-950">{userName(action.performedBy)}</p>
                      <span className="text-xs text-slate-500">{formatDateTime(action.performedAt)}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {statusLabels[action.action as PostStatus]}
                      {' on '}
                      {typeof action.post === 'object' && action.post ? action.post.topicName : 'post'}
                    </p>
                    {action.comment ? <p className="mt-1 text-xs text-slate-500">{action.comment}</p> : null}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
