import { z } from 'zod'

import {
  hasMeaningfulPostText,
  statusLabels,
  statusRequiresPostContent,
  statuses,
  type PostStatus,
} from '@/lib/workflow/postWorkflow'

export const createTopicSchema = z.object({
  postText: z.string().optional(),
  topicLink: z
    .string()
    .trim()
    .min(1, 'Topic link is required.')
    .url('Enter a valid URL, including https://.'),
  topicName: z.string().trim().min(1, 'Topic name is required.').max(180, 'Keep topic names under 180 characters.'),
})

export const editPostSchema = createTopicSchema

export const workflowActionSchema = z.object({
  comment: z.string().trim().max(800, 'Comments must be 800 characters or fewer.').optional(),
  status: z.enum(statuses),
})

export const postCommentSchema = z.object({
  comment: z.string().trim().min(1, 'Comment is required.').max(800, 'Comments must be 800 characters or fewer.'),
})

export function validateURL(value: unknown) {
  const result = z.string().trim().url().safeParse(value)
  return result.success || 'Enter a valid URL, including https://.'
}

export function validatePostContentForStatus(status: PostStatus, postText: unknown) {
  if (!statusRequiresPostContent(status)) {
    return
  }

  if (!hasMeaningfulPostText(postText)) {
    throw new Error(`${statusLabels[status]} requires post content before the workflow can move forward.`)
  }
}
