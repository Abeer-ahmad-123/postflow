import { ArrowUpRight, ExternalLink } from 'lucide-react'
import Link from 'next/link'

import { Pagination } from '@/components/posts/pagination'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import type { PostSearchParams } from '@/lib/posts/postQueries'
import { formatDateTime, userName } from '@/lib/utils'
import type { Post } from '@/payload-types'

export function PostsTable({
  docs,
  hasNextPage,
  hasPrevPage,
  page,
  params,
  totalPages,
}: {
  docs: Post[]
  hasNextPage: boolean
  hasPrevPage: boolean
  page: number
  params: PostSearchParams
  totalPages: number
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Topic Name</th>
              <th className="px-4 py-3 font-medium">Topic Link</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Performed By</th>
              <th className="px-4 py-3 font-medium">Created At</th>
              <th className="px-4 py-3 font-medium">Updated At</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {docs.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>
                  No posts match the current filters.
                </td>
              </tr>
            ) : (
              docs.map((post) => (
                <tr className="align-top transition hover:bg-slate-50" key={post.id}>
                  <td className="max-w-[260px] px-4 py-3">
                    <Link className="font-medium text-slate-950 hover:underline" href={`/posts/${post.id}`}>
                      {post.topicName}
                    </Link>
                    {post.postText ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{post.postText}</p>
                    ) : null}
                  </td>
                  <td className="max-w-[240px] px-4 py-3">
                    <a
                      className="inline-flex max-w-full items-center gap-1 truncate text-slate-600 hover:text-slate-950"
                      href={post.topicLink}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span className="truncate">{post.topicLink}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={post.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{userName(post.performedBy)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(post.createdAt)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(post.updatedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/posts/${post.id}`}>
                        Open
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        hasNextPage={hasNextPage}
        hasPrevPage={hasPrevPage}
        page={page}
        params={params}
        totalPages={totalPages}
      />
    </div>
  )
}
