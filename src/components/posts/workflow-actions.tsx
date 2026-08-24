'use client'

import { WorkflowActionButton } from '@/components/posts/workflow-action-button'
import { usePostTextState } from '@/components/posts/post-text-state'
import {
  getAvailableTransitions,
  getTransitionBlockReason,
  statusLabels,
  type PostStatus,
} from '@/lib/workflow/postWorkflow'

export function WorkflowActions({
  postId,
  postText,
  status,
}: {
  postId: string
  postText?: null | string
  status: PostStatus
}) {
  const transitions = getAvailableTransitions(status)
  const { currentPostText, savedPostText } = usePostTextState(postText)

  if (transitions.length === 0) {
    return (
      <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
        {statusLabels[status]} is a terminal workflow state.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {transitions.map((transition) => (
        <WorkflowActionButton
          disabledReason={getTransitionBlockReason(transition, savedPostText, currentPostText)}
          key={transition}
          postId={postId}
          status={transition}
        />
      ))}
    </div>
  )
}
