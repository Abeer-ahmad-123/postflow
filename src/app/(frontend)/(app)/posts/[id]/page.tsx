import { ExternalLink, Pencil } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'

import { AddPostCommentForm } from '@/components/posts/add-post-comment-form'
import { PostComments } from '@/components/posts/post-comments'
import { PostTextProvider } from '@/components/posts/post-text-state'
import { RealtimeActionHistory } from '@/components/posts/realtime-action-history'
import { WorkflowActions } from '@/components/posts/workflow-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { requireCurrentUser } from '@/lib/auth/getCurrentUser'
import { getPayloadClient } from '@/lib/payload/getPayloadClient'
import { editPostPath, postRouteSegment } from '@/lib/posts/postLinks'
import { getPostActionHistory, getPostByRouteParam } from '@/lib/posts/postQueries'
import { canEditPostContent } from '@/lib/workflow/postWorkflow'
import { formatDateTime, userName } from '@/lib/utils'
import type { Post } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayloadClient()
  const currentUser = await requireCurrentUser(payload)

  const post = await getPostByRouteParam({
    depth: 1,
    payload,
    routeParam: id,
  })

  if (!post) {
    notFound()
  }

  if (id !== postRouteSegment(post)) {
    redirect(`/posts/${postRouteSegment(post)}`)
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
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={post.status} />
            {editable ? (
              <Button asChild size="sm" variant="outline">
                <Link href={editPostPath(post)}>
                  <Pencil className="h-4 w-4" />
                  Edit Post
                </Link>
              </Button>
            ) : null}
          </div>
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
                <div className="border-t border-slate-100 pt-5">
                  <AddPostCommentForm postId={String(post.id)} />
                  <Suspense fallback={<p className="pt-4 text-sm text-slate-500">Loading comments...</p>}>
                    <PostCommentThread
                      currentUserId={currentUser.id}
                      post={post}
                    />
                  </Suspense>
                </div>
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

async function PostCommentThread({
  currentUserId,
  post,
}: {
  currentUserId: number | string
  post: Post
}) {
  const payload = await getPayloadClient()
  const historyActions = await getPostActionHistory({ payload, post })
  const comments = historyActions.filter((action) => action.comment?.trim())

  return <PostComments comments={comments} currentUserId={currentUserId} postId={String(post.id)} />
}
