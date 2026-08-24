import { PostForm } from '@/components/posts/post-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewPostPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Create Topic</h1>
        <p className="mt-1 text-sm text-slate-500">New topics always start as Open and assign you as the latest performer.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Topic Details</CardTitle>
          <CardDescription>Post text can stay empty until the topic moves forward.</CardDescription>
        </CardHeader>
        <CardContent>
          <PostForm mode="create" />
        </CardContent>
      </Card>
    </div>
  )
}
