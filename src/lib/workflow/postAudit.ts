import type { Payload, PayloadRequest } from 'payload'

import { postCommentSchema } from '@/lib/validation/postValidation'
import { relationshipID } from '@/lib/utils'
import type { Post, PostAction, User } from '@/payload-types'
import type { PostStatus } from '@/lib/workflow/postWorkflow'

type AuditUser = Pick<User, 'id'>

export async function createPostActionAudit({
  action,
  comment,
  payload,
  performedAt,
  postId,
  req,
  user,
}: {
  action: PostStatus
  comment?: string
  payload: Payload
  performedAt?: string
  postId: number | string
  req?: Partial<PayloadRequest>
  user: AuditUser
}) {
  const normalizedPostId = typeof postId === 'string' ? Number(postId) : postId

  if (!Number.isFinite(normalizedPostId)) {
    throw new Error('Invalid post ID for audit action.')
  }

  return payload.create({
    collection: 'post-actions',
    context: {
      internalAuditWrite: true,
    },
    data: {
      action,
      comment: comment?.trim() || undefined,
      performedAt: performedAt || new Date().toISOString(),
      performedBy: user.id,
      post: normalizedPostId,
    },
    depth: 0,
    overrideAccess: true,
    req: req || {
      user: user as User,
    },
    user: user as User,
  })
}

async function findOwnedCommentAction({
  actionId,
  payload,
  user,
}: {
  actionId: number | string
  payload: Payload
  user: AuditUser
}) {
  const action = await payload.findByID({
    collection: 'post-actions',
    depth: 0,
    id: actionId,
    overrideAccess: false,
    user: user as User,
  })

  if (!action.comment?.trim()) {
    throw new Error('Comment not found.')
  }

  if (String(relationshipID(action.performedBy)) !== String(user.id)) {
    throw new Error('Only the comment owner can update this comment.')
  }

  const postId = relationshipID(action.post)

  if (typeof postId !== 'number' && typeof postId !== 'string') {
    throw new Error('Comment is not attached to a post.')
  }

  return {
    action,
    postId,
  }
}

async function findPostForCommentAction({
  payload,
  postId,
  user,
}: {
  payload: Payload
  postId: number | string
  user: AuditUser
}) {
  return payload.findByID({
    collection: 'posts',
    depth: 0,
    id: postId,
    overrideAccess: false,
    user: user as User,
  })
}

export async function updatePostActionComment({
  actionId,
  input,
  payload,
  user,
}: {
  actionId: number | string
  input: unknown
  payload: Payload
  user: AuditUser
}) {
  const parsed = postCommentSchema.parse(input)
  const { postId } = await findOwnedCommentAction({
    actionId,
    payload,
    user,
  })

  const [action, post] = await Promise.all([
    payload.update({
      collection: 'post-actions',
      context: {
        internalCommentWrite: true,
      },
      data: {
        comment: parsed.comment,
      },
      depth: 0,
      id: actionId,
      overrideAccess: true,
      req: {
        context: {
          internalCommentWrite: true,
        },
        user: user as User,
      },
      user: user as User,
    }),
    findPostForCommentAction({
      payload,
      postId,
      user,
    }),
  ])

  return {
    action: action as PostAction,
    post: post as Post,
  }
}

export async function deletePostActionComment({
  actionId,
  payload,
  user,
}: {
  actionId: number | string
  payload: Payload
  user: AuditUser
}) {
  const { postId } = await findOwnedCommentAction({
    actionId,
    payload,
    user,
  })

  const [action, post] = await Promise.all([
    payload.update({
      collection: 'post-actions',
      context: {
        internalCommentWrite: true,
      },
      data: {
        comment: null,
      },
      depth: 0,
      id: actionId,
      overrideAccess: true,
      req: {
        context: {
          internalCommentWrite: true,
        },
        user: user as User,
      },
      user: user as User,
    }),
    findPostForCommentAction({
      payload,
      postId,
      user,
    }),
  ])

  return {
    action: action as PostAction,
    post: post as Post,
  }
}
