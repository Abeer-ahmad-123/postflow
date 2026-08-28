import type { Payload } from 'payload'

import type { Post, User } from '@/payload-types'
import {
  notifyPostStatusChangedToSlack,
  notifyTopicAddedToSlack,
} from '@/lib/notifications/slack'
import { createTopicSchema, editPostSchema, validatePostContentForStatus } from '@/lib/validation/postValidation'
import { createPostActionAudit } from '@/lib/workflow/postAudit'
import {
  canEditPostContent,
  canTransition,
  isPostStatus,
  statusLabels,
  type PostStatus,
} from '@/lib/workflow/postWorkflow'

type WorkflowUser = Pick<User, 'id'>

export class WorkflowError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorkflowError'
  }
}

function requireUser(user?: null | WorkflowUser): WorkflowUser {
  if (!user) {
    throw new WorkflowError('You must be signed in to perform this action.')
  }

  return user
}

export async function createTopic({
  deferInitialAudit,
  input,
  payload,
  user,
}: {
  deferInitialAudit?: boolean
  input: unknown
  payload: Payload
  user?: null | WorkflowUser
}) {
  const currentUser = requireUser(user)
  const parsed = createTopicSchema.parse(input)

  const post = await payload.create({
    collection: 'posts',
    context: deferInitialAudit
      ? {
          skipInitialAuditWrite: true,
        }
      : undefined,
    data: {
      performedBy: currentUser.id,
      postText: parsed.postText,
      status: 'open',
      topicLink: parsed.topicLink,
      topicName: parsed.topicName,
    },
    depth: 0,
    overrideAccess: false,
    req: {
      user: currentUser as User,
    },
    user: currentUser as User,
  })

  await notifyTopicAddedToSlack({
    post,
    user: currentUser,
  })

  return post
}

export async function updatePostContent({
  input,
  payload,
  postId,
  user,
}: {
  input: unknown
  payload: Payload
  postId: number | string
  user?: null | WorkflowUser
}) {
  const currentUser = requireUser(user)
  const parsed = editPostSchema.parse(input)
  const existing = await payload.findByID({
    collection: 'posts',
    depth: 0,
    id: postId,
    overrideAccess: false,
    user: currentUser as User,
  })

  if (!canEditPostContent(existing.status)) {
    throw new WorkflowError('Posted and declined records are finalized and cannot be edited.')
  }

  return payload.update({
    collection: 'posts',
    data: {
      postText: parsed.postText,
      topicLink: parsed.topicLink,
      topicName: parsed.topicName,
    },
    depth: 0,
    id: postId,
    overrideAccess: false,
    req: {
      user: currentUser as User,
    },
    user: currentUser as User,
  })
}

export async function changePostStatus({
  comment,
  deferAudit,
  newStatus,
  payload,
  postId,
  user,
}: {
  comment?: string
  deferAudit?: boolean
  newStatus: PostStatus | string
  payload: Payload
  postId: number | string
  user?: null | WorkflowUser
}) {
  const currentUser = requireUser(user)

  if (!isPostStatus(newStatus)) {
    throw new WorkflowError('Invalid workflow status.')
  }

  const post = await payload.findByID({
    collection: 'posts',
    depth: 0,
    id: postId,
    overrideAccess: false,
    user: currentUser as User,
  })

  if (!canTransition(post.status, newStatus)) {
    throw new WorkflowError(
      `${statusLabels[post.status]} cannot move directly to ${statusLabels[newStatus]}.`,
    )
  }

  validatePostContentForStatus(newStatus, post.postText)

  const updatedPost = await payload.update({
    collection: 'posts',
    context: {
      workflowStatusChange: true,
    },
    data: {
      performedBy: currentUser.id,
      status: newStatus,
    },
    depth: 0,
    id: postId,
    overrideAccess: false,
    req: {
      user: currentUser as User,
    },
    user: currentUser as User,
  })

  if (!deferAudit) {
    await createPostActionAudit({
      action: newStatus,
      comment,
      payload,
      postId: post.id,
      req: {
        user: currentUser as User,
      },
      user: currentUser as User,
    })
  }

  await notifyPostStatusChangedToSlack({
    comment,
    post: updatedPost,
    user: currentUser,
  })

  return updatedPost as Post
}
