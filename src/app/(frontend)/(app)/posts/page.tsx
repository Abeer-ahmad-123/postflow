import { Plus } from 'lucide-react'
import Link from 'next/link'

import { PostFilters } from '@/components/posts/post-filters'
import { PostsTable } from '@/components/posts/posts-table'
import { Button } from '@/components/ui/button'
import { buildPostsWhere, parsePage, parseSort, type PostSearchParams } from '@/lib/posts/postQueries'
import { getPayloadClient } from '@/lib/payload/getPayloadClient'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function normalizeSearchParams(raw: Record<string, string | string[] | undefined>): PostSearchParams {
  return {
    dateField: typeof raw.dateField === 'string' ? raw.dateField : undefined,
    from: typeof raw.from === 'string' ? raw.from : undefined,
    page: typeof raw.page === 'string' ? raw.page : undefined,
    performedBy: typeof raw.performedBy === 'string' ? raw.performedBy : undefined,
    q: typeof raw.q === 'string' ? raw.q : undefined,
    sort: typeof raw.sort === 'string' ? raw.sort : undefined,
    status: typeof raw.status === 'string' ? raw.status : undefined,
    to: typeof raw.to === 'string' ? raw.to : undefined,
  }
}

export default async function PostsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = normalizeSearchParams(await searchParams)
  const payload = await getPayloadClient()
  const page = parsePage(params.page)

  const [posts, users] = await Promise.all([
    payload.find({
      collection: 'posts',
      depth: 1,
      limit: 10,
      overrideAccess: true,
      page,
      sort: parseSort(params.sort),
      where: buildPostsWhere(params),
    }),
    payload.find({
      collection: 'users',
      depth: 0,
      limit: 100,
      overrideAccess: true,
      sort: 'name',
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Posts</h1>
          <p className="mt-1 text-sm text-slate-500">Search, filter, sort, and manage topic workflow records.</p>
        </div>
        <Button asChild>
          <Link href="/posts/new" className='text-white'>
            <Plus className="h-4 w-4" />
            New Topic
          </Link>
        </Button>
      </div>

      <PostFilters params={params} users={users.docs} />
      {posts.docs.length > 0 ? (
        <PostsTable
          docs={posts.docs}
          hasNextPage={posts.hasNextPage}
          hasPrevPage={posts.hasPrevPage}
          page={posts.page || 1}
          params={params}
          totalPages={posts.totalPages}
        />
      ) : (
        <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
          No posts found.
        </p>
      )}
    </div>
  )
}
