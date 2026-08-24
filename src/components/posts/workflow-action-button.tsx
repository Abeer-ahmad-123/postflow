'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import {
  changeStatusFormAction,
} from '@/app/(frontend)/(app)/posts/actions'
import { notifyActionHistoryRefresh } from '@/components/posts/realtime-action-history'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { initialActionState, type ActionState } from '@/lib/forms/actionState'
import {
  requiresConfirmation,
  statusLabels,
  workflowActionLabels,
  type PostStatus,
} from '@/lib/workflow/postWorkflow'

export function WorkflowActionButton({
  disabledReason,
  postId,
  status,
}: {
  disabledReason?: string
  postId: string
  status: PostStatus
}) {
  const router = useRouter()
  const toastKey = useRef('')
  const [open, setOpen] = useState(false)
  const action = changeStatusFormAction.bind(null, postId)
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, initialActionState)
  const label = workflowActionLabels[status] || statusLabels[status]
  const confirm = requiresConfirmation(status)

  useEffect(() => {
    if (!state.message || toastKey.current === `${state.ok}:${state.message}`) {
      return
    }

    toastKey.current = `${state.ok}:${state.message}`

    if (state.ok) {
      toast.success(state.message)
      notifyActionHistoryRefresh(postId)
      router.refresh()
      window.setTimeout(() => setOpen(false), 0)
    } else {
      toast.error(state.message)
    }
  }, [postId, router, state])

  if (disabledReason) {
    return (
      <div className="space-y-1">
        <Button disabled title={disabledReason} type="button" variant={status === 'open' ? 'secondary' : 'default'}>
          {label}
        </Button>
        <p className="max-w-44 text-xs leading-5 text-slate-500">{disabledReason}</p>
      </div>
    )
  }

  if (!confirm) {
    return (
      <form action={formAction}>
        <input name="status" type="hidden" value={status} />
        <Button disabled={pending} type="submit" variant={status === 'open' ? 'secondary' : 'default'}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {label}
        </Button>
      </form>
    )
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button type="button" variant={status === 'declined' ? 'destructive' : 'default'}>
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {status === 'declined' ? 'Decline this topic?' : 'Mark this post as posted?'}
          </DialogTitle>
          <DialogDescription>
            This workflow action will update the latest performer and append a permanent audit record.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input name="status" type="hidden" value={status} />
          <div className="space-y-2">
            <Label htmlFor={`comment-${status}`}>Comment</Label>
            <Textarea
              id={`comment-${status}`}
              name="comment"
              placeholder="Optional context for the action history."
            />
          </div>
          {state.message && !state.ok ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button disabled={pending} type="submit" variant={status === 'declined' ? 'destructive' : 'default'}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
