import type { Payload, PayloadRequest } from 'payload'

import type { User } from '@/payload-types'
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
