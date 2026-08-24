import { ExternalLink } from 'lucide-react'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { PostForm } from '@/components/posts/post-form'
import { PostTextProvider } from '@/components/posts/post-text-state'
import { RealtimeActionHistory } from '@/components/posts/realtime-action-history'
import { WorkflowActions } from '@/components/posts/workflow-actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { getPayloadClient } from '@/lib/payload/getPayloadClient'
import { getPostActionHistory } from '@/lib/posts/postQueries'
import { canEditPostContent } from '@/lib/workflow/postWorkflow'
import { formatDateTime, userName } from '@/lib/utils'
import type { Post } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayloadClient()

  const post = await payload.findByID({
    collection: 'posts',
    depth: 1,
    disableErrors: true,
    id,
    overrideAccess: true,
  })

  if (!post) {
    notFound()
  }

  const editable = canEditPostContent(post.status)

  return (
    <PostTextProvider initialPostText={post.postText}>
      <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-normal text-slate-950">{post.topicName}</h1>
          <a
            className="mt-2 inline-flex max-w-full items-center gap-1 truncate text-sm text-slate-500 hover:text-slate-950"
            href={post.topicLink}
            rel="noreferrer"
            target="_blank"
          >
            <span className="truncate">{post.topicLink}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </a>
        </div>
        <StatusBadge status={post.status} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Topic</CardTitle>
              <CardDescription>Original topic details and creation metadata.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Created At</p>
                <p className="mt-1 text-sm text-slate-950">{formatDateTime(post.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Updated At</p>
                <p className="mt-1 text-sm text-slate-950">{formatDateTime(post.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Post</CardTitle>
              <CardDescription>Post content and the latest workflow performer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {post.postText?.trim() || 'No post content has been added.'}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Current Status</p>
                  <div className="mt-1">
                    <StatusBadge status={post.status} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Performed By</p>
                  <p className="mt-1 text-sm text-slate-950">{userName(post.performedBy)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Updated At</p>
                  <p className="mt-1 text-sm text-slate-950">{formatDateTime(post.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Edit Content</CardTitle>
              <CardDescription>Editable while Open, Review, or Proof Read.</CardDescription>
            </CardHeader>
            <CardContent>
              {editable ? (
                <PostForm mode="edit" post={post} />
              ) : (
                <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  Posted and declined records are finalized.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workflow</CardTitle>
              <CardDescription>Only valid transitions are shown.</CardDescription>
            </CardHeader>
            <CardContent>
              <WorkflowActions postId={String(post.id)} postText={post.postText} status={post.status} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Action History</CardTitle>
              <CardDescription>Permanent audit trail for this topic/post.</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<p className="py-6 text-sm text-slate-500">Loading history...</p>}>
                <PostActionHistory post={post} />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </PostTextProvider>
  )
}

async function PostActionHistory({ post }: { post: Post }) {
  const payload = await getPayloadClient()
  const historyActions = await getPostActionHistory({ payload, post })
  const historyKey = historyActions.map((action) => action.id).join(':')

  return <RealtimeActionHistory initialActions={historyActions} key={historyKey} postId={String(post.id)} />
}
