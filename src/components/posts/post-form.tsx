'use client'

import { Loader2, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { FormEvent, useActionState, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import {
  updatePostFormAction,
} from '@/app/(frontend)/(app)/posts/actions'
import { usePostTextState } from '@/components/posts/post-text-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { initialActionState, type ActionState } from '@/lib/forms/actionState'
import type { Post } from '@/payload-types'

type PostFormProps =
  | {
      mode: 'create'
      post?: never
    }
  | {
      mode: 'edit'
      post: Post
    }

export function PostForm(props: PostFormProps) {
  if (props.mode === 'create') {
    return <CreatePostForm />
  }

  return <EditPostForm post={props.post} />
}

function CreatePostForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setPending(true)

    const formData = new FormData(event.currentTarget)
    const response = await fetch('/api/posts', {
      body: JSON.stringify({
        postText: String(formData.get('postText') || ''),
        topicLink: String(formData.get('topicLink') || ''),
        topicName: String(formData.get('topicName') || ''),
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
    const result = (await response.json().catch(() => null)) as
      | {
          href?: string
          id?: string
          message?: string
          ok?: boolean
        }
      | null

    if (!response.ok || !result?.ok || !result.id) {
      const message = result?.message || 'Unable to create topic. Please try again.'
      setPending(false)
      setError(message)
      toast.error(message)
      return
    }

    toast.success(result.message || 'Topic created.')
    router.replace(result.href || `/posts/${result.id}`)
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <PostFormFields />
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <Button disabled={pending} type="submit">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Create Topic
      </Button>
    </form>
  )
}

function EditPostForm({ post }: { post: Post }) {
  const router = useRouter()
  const toastKey = useRef('')
  const submittedPostText = useRef('')
  const { setCurrentPostText, setSavedPostText } = usePostTextState(post.postText)
  const action = updatePostFormAction.bind(null, String(post.id))
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, initialActionState)

  useEffect(() => {
    if (!state.message || toastKey.current === `${state.ok}:${state.message}:${state.id || ''}`) {
      return
    }

    toastKey.current = `${state.ok}:${state.message}:${state.id || ''}`

    if (state.ok) {
      setCurrentPostText?.(submittedPostText.current)
      setSavedPostText?.(submittedPostText.current)

      toast.success(state.message)
      if (state.href) {
        router.replace(state.href)
      }
    } else {
      toast.error(state.message)
    }
  }, [router, setCurrentPostText, setSavedPostText, state])

  return (
    <form
      action={formAction}
      className="space-y-5"
      onSubmit={(event) => {
        submittedPostText.current = String(new FormData(event.currentTarget).get('postText') || '')
      }}
    >
      <PostFormFields onPostTextChange={setCurrentPostText} post={post} />
      {state.message && !state.ok ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
      ) : null}
      <Button disabled={pending} type="submit">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Changes
      </Button>
    </form>
  )
}

function PostFormFields({
  onPostTextChange,
  post,
}: {
  onPostTextChange?: (postText: string) => void
  post?: Post
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="topicName">Topic Name</Label>
        <Input
          defaultValue={post?.topicName}
          id="topicName"
          maxLength={180}
          name="topicName"
          placeholder="Next.js 16 Features"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="topicLink">Topic Link</Label>
        <Input
          defaultValue={post?.topicLink}
          id="topicLink"
          name="topicLink"
          placeholder="https://example.com/article"
          required
          type="url"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="postText">Post Text</Label>
        <Textarea
          defaultValue={post?.postText || ''}
          id="postText"
          name="postText"
          onChange={(event) => onPostTextChange?.(event.target.value)}
          placeholder="Draft content can be added now or later."
        />
        <p className="text-xs text-slate-500">Optional for open and declined topics. Required before review, ready, or posted.</p>
      </div>
    </>
  )
}
