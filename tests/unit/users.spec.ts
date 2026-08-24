import { describe, expect, it, vi } from 'vitest'

import { Users } from '@/collections/Users'
import type { User } from '@/payload-types'

const adminUser = {
  createdAt: '2026-08-24T08:00:00.000Z',
  email: 'admin@example.com',
  id: 1,
  isPayloadAdmin: true,
  name: 'Admin User',
  updatedAt: '2026-08-24T08:00:00.000Z',
} as User

const normalUser = {
  createdAt: '2026-08-24T09:00:00.000Z',
  email: 'normal@example.com',
  id: 2,
  isPayloadAdmin: false,
  name: 'Normal User',
  updatedAt: '2026-08-24T09:00:00.000Z',
} as User

describe('user admin access', () => {
  it('marks the first created user as the Payload admin', async () => {
    const hook = Users.hooks?.beforeChange?.[0]

    const data = await hook?.({
      collection: Users as never,
      context: {},
      data: {
        email: adminUser.email,
        isPayloadAdmin: false,
        name: adminUser.name,
      },
      operation: 'create',
      originalDoc: undefined,
      req: {
        context: {},
        payload: {
          count: vi.fn(async () => ({ totalDocs: 0 })),
        },
      } as never,
    })

    expect(data).toMatchObject({
      isPayloadAdmin: true,
    })
  })

  it('marks later created users as normal users', async () => {
    const hook = Users.hooks?.beforeChange?.[0]

    const data = await hook?.({
      collection: Users as never,
      context: {
        publicSignup: true,
      },
      data: {
        email: normalUser.email,
        isPayloadAdmin: true,
        name: normalUser.name,
      },
      operation: 'create',
      originalDoc: undefined,
      req: {
        context: {
          publicSignup: true,
        },
        payload: {
          count: vi.fn(async () => ({ totalDocs: 1 })),
        },
      } as never,
    })

    expect(data).toMatchObject({
      isPayloadAdmin: false,
    })
  })

  it('prevents users from editing the Payload admin flag', async () => {
    const hook = Users.hooks?.beforeChange?.[0]

    await expect(
      hook?.({
        collection: Users as never,
        context: {},
        data: {
          isPayloadAdmin: true,
        },
        operation: 'update',
        originalDoc: normalUser,
        req: {
          context: {},
          user: normalUser,
        } as never,
      }),
    ).rejects.toThrow('Payload admin access is managed by the server.')
  })

  it('allows the first user into Payload admin and denies normal users', async () => {
    const adminAccess = Users.access?.admin

    await expect(
      adminAccess?.({
        req: {
          payload: {
            find: vi.fn(async () => ({ docs: [adminUser] })),
          },
          user: adminUser,
        } as never,
      }),
    ).resolves.toBe(true)

    await expect(
      adminAccess?.({
        req: {
          payload: {
            find: vi.fn(async () => ({ docs: [adminUser] })),
          },
          user: normalUser,
        } as never,
      }),
    ).resolves.toBe(false)
  })
})
