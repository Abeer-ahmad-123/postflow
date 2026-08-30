import { CheckCheck } from 'lucide-react'

import { ReadyForLeoTable } from '@/components/posts/ready-for-leo-table'
import { getPayloadClient } from '@/lib/payload/getPayloadClient'
import { parsePage } from '@/lib/posts/postQueries'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function ReadyForLeoPage({ searchParams }: { searchParams: SearchParams }) {
  const rawParams = await searchParams
  const page = parsePage(typeof rawParams.page === 'string' ? rawParams.page : undefined)
  const payload = await getPayloadClient()
  const posts = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: 10,
    overrideAccess: true,
    page,
    sort: '-updatedAt',
    where: {
      status: {
        equals: 'ready',
      },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-normal text-slate-950">
            <CheckCheck className="h-6 w-6 text-teal-600" />
            Ready for Leo
          </h1>
          <p className="mt-1 text-sm text-slate-500">Posts that are ready for final posting.</p>
        </div>
      </div>

      {posts.docs.length > 0 ? (
        <ReadyForLeoTable
          docs={posts.docs}
          hasNextPage={posts.hasNextPage}
          hasPrevPage={posts.hasPrevPage}
          page={posts.page || 1}
          totalPages={posts.totalPages}
        />
      ) : (
        <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
          No posts are ready for Leo.
        </p>
      )}
    </div>
  )
}
