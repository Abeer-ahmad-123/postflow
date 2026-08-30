import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { PostForm } from '@/components/posts/post-form'
import { PostTextProvider } from '@/components/posts/post-text-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getPayloadClient } from '@/lib/payload/getPayloadClient'
import { editPostPath, postPath, postRouteSegment } from '@/lib/posts/postLinks'
import { getPostByRouteParam } from '@/lib/posts/postQueries'
import { canEditPostContent } from '@/lib/workflow/postWorkflow'

export const dynamic = 'force-dynamic'

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayloadClient()
  const post = await getPostByRouteParam({
    depth: 1,
    payload,
    routeParam: id,
  })

  if (!post) {
    notFound()
  }

  if (id !== postRouteSegment(post)) {
    redirect(editPostPath(post))
  }

  const editable = canEditPostContent(post.status)

  return (
    <PostTextProvider initialPostText={post.postText}>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Edit Post</h1>
            <p className="mt-1 text-sm text-slate-500">{post.topicName}</p>
          </div>
          <Button asChild variant="outline">
            <Link href={postPath(post)}>
              <ArrowLeft className="h-4 w-4" />
              Back to Post
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Post Content</CardTitle>
            <CardDescription>Editable while Open or Review.</CardDescription>
          </CardHeader>
          <CardContent>
            {editable ? (
              <PostForm mode="edit" post={post} />
            ) : (
              <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                Ready, posted, and declined records are finalized.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PostTextProvider>
  )
}
