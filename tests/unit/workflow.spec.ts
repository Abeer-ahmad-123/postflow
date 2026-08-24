import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { PostActions } from '@/collections/PostActions'
import { Posts } from '@/collections/Posts'
import type { Post, User } from '@/payload-types'
import { changePostStatus, createTopic } from '@/lib/workflow/changePostStatus'
import { getTransitionBlockReason } from '@/lib/workflow/postWorkflow'

const userA = { email: 'a@example.com', id: 1, name: 'User A' } as User
const userB = { email: 'b@example.com', id: 2, name: 'User B' } as User

function makePost(overrides: Partial<Post> = {}) {
  return {
    createdAt: new Date().toISOString(),
    id: 10,
    performedBy: userA,
    postText: '',
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
        user: userA,
      } as never,
    })

    expect(created).toMatchObject({
      performedBy: userA.id,
      status: 'open',
    })

    expect(() =>
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
    ).toThrow('performedBy is managed by the server')
  })

  it('allows content edits when Payload passes unchanged status and performedBy through the update hook', () => {
    const hook = Posts.hooks?.beforeChange?.[0]
    const originalDoc = makePost({
      performedBy: userA,
      postText: '',
      status: 'open',
    })

    const data = hook?.({
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

  it.each(['review', 'proof_read', 'posted'] as const)('%s requires post content', async (newStatus) => {
    const status = newStatus === 'posted' ? 'proof_read' : newStatus === 'proof_read' ? 'review' : 'open'
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
