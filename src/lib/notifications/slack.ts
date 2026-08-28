import type { Post, User } from '@/payload-types'
import { userName } from '@/lib/utils'
import {
  statusLabels,
  workflowActionLabels,
  type PostStatus,
} from '@/lib/workflow/postWorkflow'

type SlackNotificationUser = Pick<User, 'id'> & Partial<Pick<User, 'email' | 'name'>>
type SlackNotificationPost = Pick<Post, 'id' | 'status' | 'topicLink' | 'topicName'>

type SlackBlock =
  | {
      text: {
        text: string
        type: 'mrkdwn'
      }
      type: 'section'
    }
  | {
      elements: Array<{
        text: string
        type: 'mrkdwn'
      }>
      type: 'context'
    }

const fallbackActionLabels: Record<PostStatus, string> = {
  declined: 'Decline',
  open: 'Send Back',
  posted: 'Mark as Posted',
  proof_read: 'Proof Read',
  review: 'Submit for Review',
}
const slackRequestTimeoutMs = 5000

function slackWebhookUrl() {
  return process.env.SLACK_WEBHOOK_URL?.trim()
}

function postflowBaseUrl() {
  return process.env.NEXT_PUBLIC_SERVER_URL?.trim().replace(/\/+$/, '')
}

function postflowPostUrl(postId: number | string) {
  const baseUrl = postflowBaseUrl()

  return baseUrl ? `${baseUrl}/posts/${encodeURIComponent(String(postId))}` : undefined
}

function slackEscape(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function slackUrl(value: string) {
  return value.replace(/\|/g, '%7C').replace(/>/g, '%3E')
}

function slackLink(url: string | undefined, label: string) {
  return url ? `<${slackUrl(url)}|${slackEscape(label)}>` : slackEscape(label)
}

function actorName(user: SlackNotificationUser) {
  const name = userName(user)

  return name === 'Unknown user' ? `User ${user.id}` : name
}

function actionLabel(status: PostStatus) {
  return workflowActionLabels[status] || fallbackActionLabels[status] || statusLabels[status]
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 1)}...`
}

function buildSlackPayload({
  comment,
  eventLabel,
  post,
  user,
}: {
  comment?: string
  eventLabel: string
  post: SlackNotificationPost
  user: SlackNotificationUser
}) {
  const title = post.topicName || `Post ${post.id}`
  const postLink = slackLink(postflowPostUrl(post.id), title)
  const sourceLink = slackLink(post.topicLink, 'Source')
  const text = `Postflow: ${eventLabel} - ${title}`
  const context = [
    `By ${slackEscape(actorName(user))}`,
    `Status: ${slackEscape(statusLabels[post.status])}`,
  ]
  const blocks: SlackBlock[] = [
    {
      text: {
        text: `*${slackEscape(eventLabel)}*\n${postLink}`,
        type: 'mrkdwn',
      },
      type: 'section',
    },
    {
      elements: [
        {
          text: context.join(' | '),
          type: 'mrkdwn',
        },
      ],
      type: 'context',
    },
    {
      text: {
        text: `*Topic source:* ${sourceLink}`,
        type: 'mrkdwn',
      },
      type: 'section',
    },
  ]

  const normalizedComment = comment?.trim()

  if (normalizedComment) {
    blocks.push({
      text: {
        text: `*Comment:* ${slackEscape(truncate(normalizedComment, 1000))}`,
        type: 'mrkdwn',
      },
      type: 'section',
    })
  }

  return {
    blocks,
    text,
  }
}

async function sendSlackNotification(body: ReturnType<typeof buildSlackPayload>) {
  const webhookUrl = slackWebhookUrl()

  if (!webhookUrl) {
    return
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), slackRequestTimeoutMs)

  try {
    const response = await fetch(webhookUrl, {
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Slack webhook responded with ${response.status}.`)
    }
  } catch (error) {
    console.error('Unable to send Slack notification', error)
  } finally {
    clearTimeout(timeout)
  }
}

export async function notifyTopicAddedToSlack({
  post,
  user,
}: {
  post: SlackNotificationPost
  user: SlackNotificationUser
}) {
  await sendSlackNotification(
    buildSlackPayload({
      eventLabel: 'Topic Added',
      post,
      user,
    }),
  )
}

export async function notifyPostStatusChangedToSlack({
  comment,
  post,
  user,
}: {
  comment?: string
  post: SlackNotificationPost
  user: SlackNotificationUser
}) {
  await sendSlackNotification(
    buildSlackPayload({
      comment,
      eventLabel: actionLabel(post.status),
      post,
      user,
    }),
  )
}
