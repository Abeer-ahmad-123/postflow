'use client'

import { Loader2, MessageSquarePlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

import { addCommentFormAction } from '@/app/(frontend)/(app)/posts/actions'
import { notifyActionHistoryRefresh } from '@/components/posts/realtime-action-history'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { initialActionState, type ActionState } from '@/lib/forms/actionState'

export function AddPostCommentForm({ postId }: { postId: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const toastKey = useRef('')
  const action = addCommentFormAction.bind(null, postId)
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, initialActionState)

  useEffect(() => {
    if (!state.message || toastKey.current === `${state.ok}:${state.message}`) {
      return
    }

    toastKey.current = `${state.ok}:${state.message}`

    if (state.ok) {
      formRef.current?.reset()
      toast.success(state.message)
      notifyActionHistoryRefresh(postId)
      router.refresh()
    } else {
      toast.error(state.message)
    }
  }, [postId, router, state])

  return (
    <form action={formAction} className="space-y-3" ref={formRef}>
      <div className="space-y-2">
        <Label className="sr-only" htmlFor={`post-comment-${postId}`}>
          Comment
        </Label>
        <Textarea
          className="min-h-20 resize-none rounded-lg border-slate-200 bg-white"
          id={`post-comment-${postId}`}
          maxLength={800}
          name="comment"
          placeholder="Add a comment..."
          required
        />
      </div>
      {state.message && !state.ok ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
      ) : null}
      <div className="flex justify-end">
        <Button disabled={pending} size="sm" type="submit" variant="outline">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
          Comment
        </Button>
      </div>
    </form>
  )
}
