'use client'

import { Check, Loader2, Pencil, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import {
  deleteCommentFormAction,
  updateCommentFormAction,
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
import { StatusBadge } from '@/components/ui/status-badge'
import { Textarea } from '@/components/ui/textarea'
import { initialActionState, type ActionState } from '@/lib/forms/actionState'
import { formatDateTime, relationshipID, userName } from '@/lib/utils'
import type { PostAction } from '@/payload-types'

export function PostComments({
  comments,
  currentUserId,
  postId,
}: {
  comments: PostAction[]
  currentUserId: number | string
  postId: string
}) {
  if (comments.length === 0) {
    return <p className="pt-4 text-sm text-slate-500">No comments yet.</p>
  }

  return (
    <div className="mt-5 space-y-4">
      <p className="text-sm font-medium text-slate-950">Comments</p>
      {comments.map((comment) => (
        <PostCommentItem
          comment={comment}
          currentUserId={currentUserId}
          key={comment.id}
          postId={postId}
        />
      ))}
    </div>
  )
}

function PostCommentItem({
  comment,
  currentUserId,
  postId,
}: {
  comment: PostAction
  currentUserId: number | string
  postId: string
}) {
  const commentOwnerId = relationshipID(comment.performedBy)
  const canManage = String(commentOwnerId) === String(currentUserId)
  const authorName = userName(comment.performedBy)
  const [editing, setEditing] = useState(false)

  return (
    <div className="flex gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
        {authorName.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-medium text-slate-950">{authorName}</p>
          <span className="text-xs text-slate-500">{formatDateTime(comment.performedAt)}</span>
          <StatusBadge status={comment.action} />
          {canManage && !editing ? (
            <CommentActions
              actionId={String(comment.id)}
              onEdit={() => setEditing(true)}
              postId={postId}
            />
          ) : null}
        </div>
        {editing ? (
          <EditCommentForm
            actionId={String(comment.id)}
            comment={comment.comment || ''}
            onCancel={() => setEditing(false)}
            onSaved={() => setEditing(false)}
            postId={postId}
          />
        ) : (
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
            {comment.comment}
          </p>
        )}
      </div>
    </div>
  )
}

function CommentActions({
  actionId,
  onEdit,
  postId,
}: {
  actionId: string
  onEdit: () => void
  postId: string
}) {
  const router = useRouter()
  const toastKey = useRef('')
  const [open, setOpen] = useState(false)
  const action = deleteCommentFormAction.bind(null, actionId)
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, initialActionState)

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

  return (
    <div className="ml-auto flex items-center gap-1">
      <Button
        aria-label="Edit comment"
        className="h-7 w-7"
        onClick={onEdit}
        size="icon"
        title="Edit comment"
        type="button"
        variant="ghost"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogTrigger asChild>
          <Button
            aria-label="Delete comment"
            className="h-7 w-7 text-red-600 hover:text-red-700"
            size="icon"
            title="Delete comment"
            type="button"
            variant="ghost"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete comment?</DialogTitle>
            <DialogDescription>
              This removes the comment text from the post comments. The workflow action stays in history.
            </DialogDescription>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            {state.message && !state.ok ? (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
            ) : null}
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button disabled={pending} type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button disabled={pending} type="submit" variant="destructive">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EditCommentForm({
  actionId,
  comment,
  onCancel,
  onSaved,
  postId,
}: {
  actionId: string
  comment: string
  onCancel: () => void
  onSaved: () => void
  postId: string
}) {
  const router = useRouter()
  const toastKey = useRef('')
  const action = updateCommentFormAction.bind(null, actionId)
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, initialActionState)

  useEffect(() => {
    if (!state.message || toastKey.current === `${state.ok}:${state.message}`) {
      return
    }

    toastKey.current = `${state.ok}:${state.message}`

    if (state.ok) {
      toast.success(state.message)
      notifyActionHistoryRefresh(postId)
      router.refresh()
      onSaved()
    } else {
      toast.error(state.message)
    }
  }, [onSaved, postId, router, state])

  return (
    <form action={formAction} className="mt-3 space-y-2">
      <Label className="sr-only" htmlFor={`edit-comment-${actionId}`}>
        Edit comment
      </Label>
      <Textarea
        className="min-h-20 resize-none rounded-lg border-slate-200 bg-white"
        defaultValue={comment}
        id={`edit-comment-${actionId}`}
        maxLength={800}
        name="comment"
        required
      />
      {state.message && !state.ok ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button disabled={pending} onClick={onCancel} size="sm" type="button" variant="ghost">
          <X className="h-4 w-4" />
          Cancel
        </Button>
        <Button disabled={pending} size="sm" type="submit" variant="outline">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save
        </Button>
      </div>
    </form>
  )
}
