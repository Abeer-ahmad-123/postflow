import type { Payload, Where } from 'payload'

import { isPostStatus, statuses, type PostStatus } from '@/lib/workflow/postWorkflow'
import type { Post, PostAction, User } from '@/payload-types'

export type PostSearchParams = {
  dateField?: string
  from?: string
  page?: string
  performedBy?: string
  q?: string
  sort?: string
  status?: string
  to?: string
}

export const sortOptions = [
  { label: 'Newest Created', value: '-createdAt' },
  { label: 'Oldest Created', value: 'createdAt' },
  { label: 'Recently Updated', value: '-updatedAt' },
  { label: 'Topic A-Z', value: 'topicName' },
  { label: 'Topic Z-A', value: '-topicName' },
] as const

const sortableValues = new Set(sortOptions.map((option) => option.value))

export function parsePage(value?: string) {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

export function parseSort(value?: string) {
  return value && sortableValues.has(value as (typeof sortOptions)[number]['value']) ? value : '-updatedAt'
}

export function buildPostsWhere(params: PostSearchParams): Where | undefined {
  const and: Where[] = []
  const query = params.q?.trim()

  if (query) {
    and.push({
      or: [
        {
          topicName: {
            like: query,
          },
        },
        {
          topicLink: {
            like: query,
          },
        },
        {
          postText: {
            like: query,
          },
        },
      ],
    })
  }

  if (params.status && isPostStatus(params.status)) {
    and.push({
      status: {
        equals: params.status,
      },
    })
  }

  if (params.performedBy) {
    and.push({
      performedBy: {
        equals: params.performedBy,
      },
    })
  }

  const dateField = params.dateField === 'updatedAt' ? 'updatedAt' : 'createdAt'
  const dateRange: Record<string, string> = {}

  if (params.from) {
    dateRange.greater_than_equal = new Date(`${params.from}T00:00:00.000Z`).toISOString()
  }

  if (params.to) {
    dateRange.less_than_equal = new Date(`${params.to}T23:59:59.999Z`).toISOString()
  }

  if (Object.keys(dateRange).length > 0) {
    and.push({
      [dateField]: dateRange,
    })
  }

  return and.length > 0 ? { and } : undefined
}

export async function getDashboardCounts({ payload }: { payload: Payload }) {
  const posts = await payload.find({
    collection: 'posts',
    depth: 0,
    overrideAccess: true,
    pagination: false,
    select: {
      status: true,
    },
  })
  const byStatus = posts.docs.reduce(
    (acc, row) => {
      if (isPostStatus(row.status)) {
        acc[row.status] += 1
      }

      return acc
    },
    Object.fromEntries(statuses.map((status) => [status, 0])) as Record<PostStatus, number>,
  )

  return {
    all: statuses.reduce((total, status) => total + byStatus[status], 0),
    byStatus,
  }
}

export async function getPostActionHistory({
  limit = 100,
  overrideAccess = true,
  payload,
  post,
  user,
}: {
  limit?: number
  overrideAccess?: boolean
  payload: Payload
  post: Post
  user?: User
}) {
  const actions = await payload.find({
    collection: 'post-actions',
    depth: 1,
    limit,
    overrideAccess,
    sort: '-performedAt',
    user,
    where: {
      post: {
        equals: post.id,
      },
    },
  })

  if (actions.docs.length > 0) {
    return actions.docs
  }

  return [
    {
      action: 'open',
      createdAt: post.createdAt,
      id: 0,
      performedAt: post.createdAt,
      performedBy: post.performedBy,
      post: post.id,
      updatedAt: post.updatedAt,
    },
  ] satisfies PostAction[]
}

export async function getPostByRouteParam({
  depth = 1,
  overrideAccess = true,
  payload,
  routeParam,
  user,
}: {
  depth?: number
  overrideAccess?: boolean
  payload: Payload
  routeParam: string
  user?: User
}) {
  const normalizedParam = routeParam.trim()

  if (!normalizedParam) {
    return null
  }

  const bySlug = await payload.find({
    collection: 'posts',
    depth,
    limit: 1,
    overrideAccess,
    pagination: false,
    user,
    where: {
      slug: {
        equals: normalizedParam,
      },
    },
  })

  if (bySlug.docs[0]) {
    return bySlug.docs[0]
  }

  if (!/^\d+$/.test(normalizedParam)) {
    return null
  }

  return payload.findByID({
    collection: 'posts',
    depth,
    disableErrors: true,
    id: normalizedParam,
    overrideAccess,
    user,
  })
}
