import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Post, User } from '@/payload-types'
import {
  notifyPostStatusChangedToSlack,
  notifyTopicAddedToSlack,
} from '@/lib/notifications/slack'

const originalSlackWebhookUrl = process.env.SLACK_WEBHOOK_URL
const originalServerUrl = process.env.NEXT_PUBLIC_SERVER_URL
const originalOpenStatusMention = process.env.SLACK_OPEN_STATUS_MENTION
const originalReadyStatusMention = process.env.SLACK_READY_STATUS_MENTION
const originalReviewStatusMention = process.env.SLACK_REVIEW_STATUS_MENTION

const userA = { email: 'a@example.com', id: 1, name: 'User A' } as User

function makePost(overrides: Partial<Post> = {}) {
  return {
    createdAt: new Date().toISOString(),
    id: 10,
    performedBy: userA,
    postText: 'Draft copy.',
    slug: 'new-ai-model-released',
    status: 'open',
    topicLink: 'https://example.com/source',
    topicName: 'New AI Model Released',
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Post
}

function restoreEnv(
  key:
    | 'NEXT_PUBLIC_SERVER_URL'
    | 'SLACK_OPEN_STATUS_MENTION'
    | 'SLACK_READY_STATUS_MENTION'
    | 'SLACK_REVIEW_STATUS_MENTION'
    | 'SLACK_WEBHOOK_URL',
  value?: string,
) {
  if (value === undefined) {
    delete process.env[key]
    return
  }

  process.env[key] = value
}

afterEach(() => {
  restoreEnv('SLACK_WEBHOOK_URL', originalSlackWebhookUrl)
  restoreEnv('NEXT_PUBLIC_SERVER_URL', originalServerUrl)
  restoreEnv('SLACK_OPEN_STATUS_MENTION', originalOpenStatusMention)
  restoreEnv('SLACK_READY_STATUS_MENTION', originalReadyStatusMention)
  restoreEnv('SLACK_REVIEW_STATUS_MENTION', originalReviewStatusMention)
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Slack notifications', () => {
  it('does not call Slack when the webhook URL is not configured', async () => {
    delete process.env.SLACK_WEBHOOK_URL
    const fetchMock = vi.fn()

    vi.stubGlobal('fetch', fetchMock)

    await notifyTopicAddedToSlack({
      post: makePost(),
      user: userA,
    })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts workflow status notifications to the configured Slack webhook', async () => {
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://postflow.example.com/'
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.test/services/T/B/C'
    const fetchMock = vi.fn(async (_url: string, _request: RequestInit) => ({
      ok: true,
      status: 200,
    }))

    vi.stubGlobal('fetch', fetchMock)

    await notifyPostStatusChangedToSlack({
      comment: 'Published on LinkedIn.',
      post: makePost({ status: 'posted' }),
      user: userA,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)

    const firstCall = fetchMock.mock.calls[0]
    const [url, request] = firstCall as [string, RequestInit]
    const body = JSON.parse(String(request.body))
    const blocksText = JSON.stringify(body.blocks)

    expect(url).toBe('https://hooks.slack.test/services/T/B/C')
    expect(request).toMatchObject({
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
    expect(body.text).toBe('Postflow: Mark as Posted - New AI Model Released')
    expect(blocksText).toContain('*Mark as Posted*')
    expect(blocksText).toContain('<https://postflow.example.com/posts/new-ai-model-released|New AI Model Released>')
    expect(blocksText).toContain('By User A')
    expect(blocksText).toContain('Status: Posted')
    expect(blocksText).toContain('Published on LinkedIn.')
  })

  it('mentions the open owner when a topic is added as open', async () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.test/services/T/B/C'
    process.env.SLACK_OPEN_STATUS_MENTION = 'UABDUL123'
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
    }))

    vi.stubGlobal('fetch', fetchMock)

    await notifyTopicAddedToSlack({
      post: makePost({ status: 'open' }),
      user: userA,
    })

    const [, request] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(String(request.body))
    const blocksText = JSON.stringify(body.blocks)

    expect(body.text).toBe('Postflow: Topic Added <@UABDUL123> - New AI Model Released')
    expect(blocksText).toContain('*Topic Added* <@UABDUL123>')
  })

  it('mentions Abdul Wadood when a post moves to open', async () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.test/services/T/B/C'
    process.env.SLACK_OPEN_STATUS_MENTION = 'UABDUL123'
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
    }))

    vi.stubGlobal('fetch', fetchMock)

    await notifyPostStatusChangedToSlack({
      post: makePost({ status: 'open' }),
      user: userA,
    })

    const [, request] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(String(request.body))
    const blocksText = JSON.stringify(body.blocks)

    expect(body.text).toBe('Postflow: Send Back <@UABDUL123> - New AI Model Released')
    expect(blocksText).toContain('<@UABDUL123>')
  })

  it('mentions Ghazifa Khan when a post moves to review', async () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.test/services/T/B/C'
    process.env.SLACK_REVIEW_STATUS_MENTION = '<@UGHAZIFA123>'
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
    }))

    vi.stubGlobal('fetch', fetchMock)

    await notifyPostStatusChangedToSlack({
      post: makePost({ status: 'review' }),
      user: userA,
    })

    const [, request] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(String(request.body))
    const blocksText = JSON.stringify(body.blocks)

    expect(body.text).toBe('Postflow: Submit for Review <@UGHAZIFA123> - New AI Model Released')
    expect(blocksText).toContain('<@UGHAZIFA123>')
  })

  it('mentions Ehtisham Ashraf when a post moves to ready', async () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.test/services/T/B/C'
    process.env.SLACK_READY_STATUS_MENTION = 'UEHTISHAM123'
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
    }))

    vi.stubGlobal('fetch', fetchMock)

    await notifyPostStatusChangedToSlack({
      post: makePost({ status: 'ready' }),
      user: userA,
    })

    const [, request] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(String(request.body))
    const blocksText = JSON.stringify(body.blocks)

    expect(body.text).toBe('Postflow: Mark as Ready <@UEHTISHAM123> - New AI Model Released')
    expect(blocksText).toContain('<@UEHTISHAM123>')
  })

  it('does not send plain-text names as fake mentions', async () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.test/services/T/B/C'
    process.env.SLACK_OPEN_STATUS_MENTION = '@Abdul Wadood'
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
    }))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    vi.stubGlobal('fetch', fetchMock)

    await notifyPostStatusChangedToSlack({
      post: makePost({ status: 'open' }),
      user: userA,
    })

    const [, request] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(String(request.body))
    const blocksText = JSON.stringify(body.blocks)

    expect(body.text).toBe('Postflow: Send Back - New AI Model Released')
    expect(blocksText).not.toContain('@Abdul Wadood')
    expect(warnSpy).toHaveBeenCalledWith(
      'SLACK_OPEN_STATUS_MENTION must be a Slack member ID like U123ABC or a mention token like <@U123ABC>.',
    )
  })

  it('logs Slack delivery failures without throwing', async () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.test/services/T/B/C'
    const fetchMock = vi.fn(async () => ({ ok: false, status: 500 }))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      notifyTopicAddedToSlack({
        post: makePost(),
        user: userA,
      }),
    ).resolves.toBeUndefined()

    expect(errorSpy).toHaveBeenCalledWith(
      'Unable to send Slack notification',
      expect.any(Error),
    )
  })
})
