export const statuses = ['open', 'review', 'proof_read', 'posted', 'declined'] as const

export type PostStatus = (typeof statuses)[number]

export const statusLabels: Record<PostStatus, string> = {
  declined: 'Declined',
  open: 'Open',
  posted: 'Posted',
  proof_read: 'Proof Read',
  review: 'Review',
}

export const statusTone: Record<PostStatus, string> = {
  declined: 'border-red-200 bg-red-50 text-red-700',
  open: 'border-sky-200 bg-sky-50 text-sky-700',
  posted: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  proof_read: 'border-violet-200 bg-violet-50 text-violet-700',
  review: 'border-amber-200 bg-amber-50 text-amber-700',
}

export const workflowTransitions: Record<PostStatus, PostStatus[]> = {
  declined: [],
  open: ['review', 'declined'],
  posted: [],
  proof_read: ['review', 'posted', 'declined'],
  review: ['open', 'proof_read', 'declined'],
}

export const editableStatuses: readonly PostStatus[] = ['open', 'review', 'proof_read']

export const workflowActionLabels: Partial<Record<PostStatus, string>> = {
  declined: 'Decline',
  open: 'Send Back',
  posted: 'Mark as Posted',
  proof_read: 'Proof Read',
  review: 'Submit for Review',
}

export const confirmationStatuses: readonly PostStatus[] = ['posted', 'declined']

export const postContentRequiredStatuses: readonly PostStatus[] = ['review', 'proof_read', 'posted']

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
