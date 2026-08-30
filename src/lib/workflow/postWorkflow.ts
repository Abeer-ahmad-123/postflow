export const statuses = ['open', 'review', 'ready', 'posted', 'declined'] as const

export type PostStatus = (typeof statuses)[number]

export const statusLabels: Record<PostStatus, string> = {
  declined: 'Declined',
  open: 'Open',
  posted: 'Posted',
  ready: 'Ready',
  review: 'Review',
}

export const statusTone: Record<PostStatus, string> = {
  declined: 'border-red-200 bg-red-50 text-red-700',
  open: 'border-sky-200 bg-sky-50 text-sky-700',
  posted: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  ready: 'border-teal-200 bg-teal-50 text-teal-700',
  review: 'border-amber-200 bg-amber-50 text-amber-700',
}

export const workflowTransitions: Record<PostStatus, PostStatus[]> = {
  declined: [],
  open: ['review', 'declined'],
  posted: [],
  ready: ['review', 'declined', 'posted'],
  review: ['open', 'ready', 'declined'],
}

export const editableStatuses: readonly PostStatus[] = ['open', 'review']

export const workflowActionLabels: Partial<Record<PostStatus, string>> = {
  declined: 'Decline',
  open: 'Send Back',
  posted: 'Mark as Posted',
  ready: 'Mark as Ready',
  review: 'Submit for Review',
}

export const confirmationStatuses: readonly PostStatus[] = ['posted', 'declined']

export const postContentRequiredStatuses: readonly PostStatus[] = ['review', 'ready', 'posted']

export const commentRollbackTransitions: Partial<Record<PostStatus, PostStatus>> = {
  posted: 'ready',
  ready: 'review',
  review: 'open',
}

export function isPostStatus(value: unknown): value is PostStatus {
  return statuses.includes(value as PostStatus)
}

export function getAvailableTransitions(status: PostStatus) {
  return workflowTransitions[status]
}

export function canTransition(from: PostStatus, to: PostStatus) {
  return workflowTransitions[from].includes(to)
}

export function canEditPostContent(status: PostStatus) {
  return editableStatuses.includes(status)
}

export function requiresConfirmation(status: PostStatus) {
  return confirmationStatuses.includes(status)
}

export function getCommentRollbackStatus(status: PostStatus) {
  return commentRollbackTransitions[status]
}

export function statusRequiresPostContent(status: PostStatus) {
  return postContentRequiredStatuses.includes(status)
}

export function hasMeaningfulPostText(postText: unknown) {
  return typeof postText === 'string' && postText.trim().length >= 1
}

function normalizedPostText(postText: unknown) {
  return typeof postText === 'string' ? postText.trim() : ''
}

export function getTransitionBlockReason(
  toStatus: PostStatus,
  savedPostText: unknown,
  currentPostText: unknown = savedPostText,
) {
  if (!statusRequiresPostContent(toStatus)) {
    return undefined
  }

  const actionLabel = workflowActionLabels[toStatus] || statusLabels[toStatus]
  const lowerActionLabel = actionLabel.toLowerCase()

  if (!hasMeaningfulPostText(currentPostText)) {
    return `${actionLabel} requires post text.`
  }

  if (!hasMeaningfulPostText(savedPostText)) {
    return `Save post text before ${lowerActionLabel}.`
  }

  if (normalizedPostText(currentPostText) !== normalizedPostText(savedPostText)) {
    return `Save changes before ${lowerActionLabel}.`
  }

  return undefined
}
