'use client'

import { Loader2, Save } from 'lucide-react'
import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

import {
  createTopicFormAction,
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
  const toastKey = useRef('')
  const submittedPostText = useRef('')
  const { setCurrentPostText, setSavedPostText } = usePostTextState(
    props.mode === 'edit' ? props.post.postText : undefined,
  )
  const action =
    props.mode === 'edit' ? updatePostFormAction.bind(null, String(props.post.id)) : createTopicFormAction
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, initialActionState)

  useEffect(() => {
    if (!state.message || toastKey.current === `${state.ok}:${state.message}:${state.id || ''}`) {
      return
    }

    toastKey.current = `${state.ok}:${state.message}:${state.id || ''}`

    if (state.ok) {
      if (props.mode === 'edit') {
        setCurrentPostText?.(submittedPostText.current)
        setSavedPostText?.(submittedPostText.current)
      }

      toast.success(state.message)
    } else {
      toast.error(state.message)
    }
  }, [props.mode, setCurrentPostText, setSavedPostText, state])

  const post = props.mode === 'edit' ? props.post : undefined

  return (
    <form
      action={formAction}
      className="space-y-5"
      onSubmit={(event) => {
        submittedPostText.current = String(new FormData(event.currentTarget).get('postText') || '')
      }}
    >
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
          onChange={(event) => setCurrentPostText?.(event.target.value)}
          placeholder="Draft content can be added now or later."
        />
        <p className="text-xs text-slate-500">Optional for open and declined topics. Required before review, proof read, or posted.</p>
      </div>
      {state.message && !state.ok ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
      ) : null}
      <Button disabled={pending} type="submit">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {props.mode === 'create' ? 'Create Topic' : 'Save Changes'}
      </Button>
    </form>
  )
}
