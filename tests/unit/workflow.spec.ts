import type { Payload } from 'payload'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { PostActions } from '@/collections/PostActions'
import { Posts } from '@/collections/Posts'
import type { Post, PostAction, User } from '@/payload-types'
import { addPostComment, changePostStatus, createTopic } from '@/lib/workflow/changePostStatus'
import {
  deletePostActionComment,
  updatePostActionComment,
} from '@/lib/workflow/postAudit'
import { getTransitionBlockReason } from '@/lib/workflow/postWorkflow'

const userA = { email: 'a@example.com', id: 1, name: 'User A' } as User
const userB = { email: 'b@example.com', id: 2, name: 'User B' } as User
const originalSlackWebhookUrl = process.env.SLACK_WEBHOOK_URL

beforeEach(() => {
  delete process.env.SLACK_WEBHOOK_URL
})

afterAll(() => {
  if (originalSlackWebhookUrl === undefined) {
    delete process.env.SLACK_WEBHOOK_URL
    return
  }

  process.env.SLACK_WEBHOOK_URL = originalSlackWebhookUrl
})

function makePost(overrides: Partial<Post> = {}) {
  return {
    createdAt: new Date().toISOString(),
    id: 10,
    performedBy: userA,
    postText: '',
    slug: 'new-ai-model-released',
    status: 'open',
    topicLink: 'https://example.com/source',
    topicName: 'New AI Model Released',
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Post
}

function mockPayload(post = makePost()) {
  const update = vi.fn(async (args) => ({
    ...post,
    ...args.data,
    performedBy: userB,
    updatedAt: new Date().toISOString(),
  }))

  return {
    create: vi.fn(async (args) => ({
      id: 99,
      ...args.data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    findByID: vi.fn(async () => post),
    update,
  } as unknown as Payload
}

function makePostAction(overrides: Partial<PostAction> = {}) {
  return {
    action: 'review',
    comment: 'Please revise this.',
    createdAt: new Date().toISOString(),
    id: 25,
    performedAt: new Date().toISOString(),
    performedBy: userA.id,
    post: 10,
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as PostAction
}

function mockCommentPayload(action = makePostAction(), post = makePost()) {
  return {
    findByID: vi.fn(async (args) => (args.collection === 'post-actions' ? action : post)),
    update: vi.fn(async (args) => ({
      ...action,
      ...args.data,
      updatedAt: new Date().toISOString(),
    })),
  } as unknown as Payload
}

describe('post workflow business rules', () => {
  it('creates a topic as open and assigns the authenticated creator', async () => {
    const payload = mockPayload()

    await createTopic({
      input: {
        postText: '',
        topicLink: 'https://example.com/ai',
        topicName: 'New AI Model Released',
      },
      payload,
      user: userA,
    })

    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'posts',
        data: expect.objectContaining({
          performedBy: userA.id,
          postText: '',
          status: 'open',
          topicLink: 'https://example.com/ai',
          topicName: 'New AI Model Released',
        }),
        overrideAccess: false,
      }),
    )
  })

  it('creates the initial open audit action from the Posts afterChange hook', async () => {
    const hook = Posts.hooks?.afterChange?.[0]
    const create = vi.fn()

    await hook?.({
      collection: Posts as never,
      context: {},
      data: {},
      doc: makePost(),
      operation: 'create',
      previousDoc: undefined,
      req: {
        context: {},
        payload: {
          create,
        },
        user: userA,
      } as never,
    })

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'post-actions',
        context: {
          internalAuditWrite: true,
        },
        data: expect.objectContaining({
          action: 'open',
          performedBy: userA.id,
          post: 10,
        }),
        overrideAccess: true,
      }),
    )
  })

  it('can skip the blocking initial audit hook for the frontend create flow', async () => {
    const hook = Posts.hooks?.afterChange?.[0]
    const create = vi.fn()

    await hook?.({
      collection: Posts as never,
      context: {
        skipInitialAuditWrite: true,
      },
      data: {},
      doc: makePost(),
      operation: 'create',
      previousDoc: undefined,
      req: {
        context: {},
        payload: {
          create,
        },
        user: userA,
      } as never,
    })

    expect(create).not.toHaveBeenCalled()
  })

  it('marks frontend topic creation to defer the initial audit row', async () => {
    const payload = mockPayload()

    await createTopic({
      deferInitialAudit: true,
      input: {
        postText: '',
        topicLink: 'https://example.com/ai',
        topicName: 'New AI Model Released',
      },
      payload,
      user: userA,
    })

    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'posts',
        context: {
          skipInitialAuditWrite: true,
        },
      }),
    )
  })

  it('allows a topic to be declined without post text and changes performedBy', async () => {
    const payload = mockPayload(makePost({ postText: '', status: 'open' }))

    await changePostStatus({
      newStatus: 'declined',
      payload,
      postId: 10,
      user: userB,
    })

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          performedBy: userB.id,
          status: 'declined',
        },
      }),
    )
  })

  it('creates an audit action with the authenticated user for status changes', async () => {
    const payload = mockPayload(makePost({ postText: 'Draft copy.', status: 'open' }))

    await changePostStatus({
      comment: 'Ready.',
      newStatus: 'review',
      payload,
      postId: 10,
      user: userB,
    })

    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'post-actions',
        context: {
          internalAuditWrite: true,
        },
        data: expect.objectContaining({
          action: 'review',
          comment: 'Ready.',
          performedBy: userB.id,
          post: 10,
        }),
        overrideAccess: true,
      }),
    )
  })

  it('can defer status-change audit writes for the frontend action flow', async () => {
    const payload = mockPayload(makePost({ postText: 'Draft copy.', status: 'open' }))

    await changePostStatus({
      deferAudit: true,
      newStatus: 'review',
      payload,
      postId: 10,
      user: userB,
    })

    expect(payload.update).toHaveBeenCalled()
    expect(payload.create).not.toHaveBeenCalled()
  })

  it('prevents users from spoofing performedBy during create and update', async () => {
    const hook = Posts.hooks?.beforeChange?.[0]
    const payload = {
      find: vi.fn(async () => ({
        docs: [],
      })),
    }

    const created = await hook?.({
      collection: Posts as never,
      context: {},
      data: {
        performedBy: userB.id,
        status: 'posted',
        topicLink: 'https://example.com',
        topicName: 'Spoof attempt',
      },
      operation: 'create',
      originalDoc: undefined,
      req: {
        payload,
        user: userA,
      } as never,
    })

    expect(created).toMatchObject({
      performedBy: userA.id,
      slug: 'spoof-attempt',
      status: 'open',
    })

    await expect(
      hook?.({
        collection: Posts as never,
        context: {},
        data: {
          performedBy: userB.id,
        },
        operation: 'update',
        originalDoc: makePost(),
        req: {
          user: userA,
        } as never,
      }),
    ).rejects.toThrow('performedBy is managed by the server')
  })

  it('allows content edits when Payload passes unchanged status and performedBy through the update hook', async () => {
    const hook = Posts.hooks?.beforeChange?.[0]
    const originalDoc = makePost({
      performedBy: userA,
      postText: '',
      status: 'open',
    })

    const data = await hook?.({
      collection: Posts as never,
      context: {},
      data: {
        performedBy: userA.id,
        postText: 'Updated draft content.',
        status: 'open',
        topicLink: originalDoc.topicLink,
        topicName: originalDoc.topicName,
      },
      operation: 'update',
      originalDoc,
      req: {
        user: userA,
      } as never,
    })

    expect(data).toMatchObject({
      postText: 'Updated draft content.',
      status: 'open',
    })
  })

  it('does not allow normal users to modify audit records', async () => {
    expect(PostActions.access?.update?.({ req: { user: userA } } as never)).toBe(false)
    expect(PostActions.access?.delete?.({ req: { user: userA } } as never)).toBe(false)

    const hook = PostActions.hooks?.beforeChange?.[0]

    expect(() =>
      hook?.({
        collection: PostActions as never,
        context: {},
        data: {},
        operation: 'update',
        originalDoc: {},
        req: {
          user: userA,
        } as never,
      }),
    ).toThrow('append-only')
  })

  it('allows internal comment writes to edit only the owner comment text', () => {
    const hook = PostActions.hooks?.beforeChange?.[0]
    const originalAction = makePostAction()

    const data = hook?.({
      collection: PostActions as never,
      context: {
        internalCommentWrite: true,
      },
      data: {
        action: 'review',
        comment: ' Updated comment. ',
        performedAt: originalAction.performedAt,
        performedBy: userA.id,
        post: 10,
      },
      operation: 'update',
      originalDoc: originalAction,
      req: {
        user: userA,
      } as never,
    })

    expect(data).toEqual({
      action: 'review',
      comment: 'Updated comment.',
      performedAt: originalAction.performedAt,
      performedBy: userA.id,
      post: 10,
    })

    expect(() =>
      hook?.({
        collection: PostActions as never,
        context: {
          internalCommentWrite: true,
        },
        data: {
          action: 'open',
          comment: 'Updated comment.',
        },
        operation: 'update',
        originalDoc: makePostAction(),
        req: {
          user: userA,
        } as never,
      }),
    ).toThrow('Only comment text can be edited')
  })

  it('updates a comment when the current user owns it', async () => {
    const payload = mockCommentPayload()

    await updatePostActionComment({
      actionId: 25,
      input: {
        comment: 'Updated comment.',
      },
      payload,
      user: userA,
    })

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'post-actions',
        context: {
          internalCommentWrite: true,
        },
        data: {
          comment: 'Updated comment.',
        },
        id: 25,
        overrideAccess: true,
      }),
    )
  })

  it('deletes a comment by clearing the owner comment text', async () => {
    const payload = mockCommentPayload()

    await deletePostActionComment({
      actionId: 25,
      payload,
      user: userA,
    })

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'post-actions',
        data: {
          comment: null,
        },
        id: 25,
      }),
    )
  })

  it('rejects comment updates from non-owners', async () => {
    const payload = mockCommentPayload()

    await expect(
      updatePostActionComment({
        actionId: 25,
        input: {
          comment: 'Not mine.',
        },
        payload,
        user: userB,
      }),
    ).rejects.toThrow('Only the comment owner')
  })

  it('rejects invalid transitions', async () => {
    const payload = mockPayload(makePost({ postText: 'Posted copy.', status: 'posted' }))

    await expect(
      changePostStatus({
        newStatus: 'open',
        payload,
        postId: 10,
        user: userB,
      }),
    ).rejects.toThrow('cannot move directly')
  })

  it.each(['review', 'ready', 'posted'] as const)('%s requires post content', async (newStatus) => {
    const status =
      newStatus === 'posted'
        ? 'ready'
        : newStatus === 'ready'
          ? 'review'
          : 'open'
    const payload = mockPayload(makePost({ postText: '   ', status }))

    await expect(
      changePostStatus({
        newStatus,
        payload,
        postId: 10,
        user: userB,
      }),
    ).rejects.toThrow('requires post content')
  })

  it('moves review posts to ready before posted', async () => {
    const payload = mockPayload(makePost({ postText: 'Draft copy.', status: 'review' }))

    await changePostStatus({
      newStatus: 'ready',
      payload,
      postId: 10,
      user: userB,
    })

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          performedBy: userB.id,
          status: 'ready',
        },
      }),
    )
  })

  it('only allows posted after a post is ready', async () => {
    const payload = mockPayload(makePost({ postText: 'Draft copy.', status: 'ready' }))

    await changePostStatus({
      newStatus: 'posted',
      payload,
      postId: 10,
      user: userB,
    })

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          performedBy: userB.id,
          status: 'posted',
        },
      }),
    )
  })

  it('allows posted posts to move back to ready', async () => {
    const payload = mockPayload(makePost({ postText: 'Posted copy.', status: 'posted' }))

    await changePostStatus({
      newStatus: 'ready',
      payload,
      postId: 10,
      user: userB,
    })

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          performedBy: userB.id,
          status: 'ready',
        },
      }),
    )
  })

  it.each(['review', 'declined'] as const)('allows ready posts to move to %s', async (newStatus) => {
    const payload = mockPayload(makePost({ postText: 'Draft copy.', status: 'ready' }))

    await changePostStatus({
      newStatus,
      payload,
      postId: 10,
      user: userB,
    })

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          performedBy: userB.id,
          status: newStatus,
        },
      }),
    )
  })

  it.each([
    ['review', 'open'],
    ['ready', 'review'],
    ['posted', 'ready'],
  ] as const)('adds a comment and moves %s back to %s', async (status, rollbackStatus) => {
    const payload = mockPayload(makePost({ postText: 'Draft copy.', status }))

    await addPostComment({
      input: {
        comment: 'Please revise this.',
      },
      payload,
      postId: 10,
      user: userB,
    })

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          performedBy: userB.id,
          status: rollbackStatus,
        },
      }),
    )
    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'post-actions',
        data: expect.objectContaining({
          action: rollbackStatus,
          comment: 'Please revise this.',
        }),
      }),
    )
  })

  it('adds a comment without status change when a post has no previous workflow step', async () => {
    const payload = mockPayload(makePost({ postText: 'Draft copy.', status: 'open' }))

    await addPostComment({
      input: {
        comment: 'Adding context.',
      },
      payload,
      postId: 10,
      user: userB,
    })

    expect(payload.update).not.toHaveBeenCalled()
    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'post-actions',
        data: expect.objectContaining({
          action: 'open',
          comment: 'Adding context.',
        }),
      }),
    )
  })

  it('blocks submit-for-review UI actions until post text exists', () => {
    expect(getTransitionBlockReason('review', '')).toBe('Submit for Review requires post text.')
    expect(getTransitionBlockReason('review', '   ')).toBe('Submit for Review requires post text.')
    expect(getTransitionBlockReason('review', 'Draft copy.')).toBeUndefined()
    expect(getTransitionBlockReason('declined', '')).toBeUndefined()
  })

  it('blocks review while post text edits are unsaved', () => {
    expect(getTransitionBlockReason('review', '', 'Draft copy.')).toBe(
      'Save post text before submit for review.',
    )
    expect(getTransitionBlockReason('review', 'Saved copy.', 'Changed copy.')).toBe(
      'Save changes before submit for review.',
    )
  })

  it('rejects unauthenticated workflow actions', async () => {
    const payload = mockPayload()

    await expect(
      changePostStatus({
        newStatus: 'declined',
        payload,
        postId: 10,
        user: null,
      }),
    ).rejects.toThrow('signed in')
  })
})
