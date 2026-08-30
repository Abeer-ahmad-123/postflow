import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import type { PostSearchParams } from '@/lib/posts/postQueries'

function pageHref(params: PostSearchParams, page: number, basePath: string) {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (key !== 'page' && value) {
      query.set(key, value)
    }
  })

  if (page > 1) {
    query.set('page', String(page))
  }

  const suffix = query.toString()
  return suffix ? `${basePath}?${suffix}` : basePath
}

export function Pagination({
  basePath = '/posts',
  hasNextPage,
  hasPrevPage,
  page,
  params,
  totalPages,
}: {
  basePath?: string
  hasNextPage: boolean
  hasPrevPage: boolean
  page: number
  params: PostSearchParams
  totalPages: number
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center">
      <p className="text-sm text-slate-500">
        Page {page} of {Math.max(totalPages, 1)}
      </p>
      <div className="flex gap-2">
        {hasPrevPage ? (
          <Button asChild className="min-w-28 whitespace-nowrap" size="sm" variant="outline">
            <Link href={pageHref(params, page - 1, basePath)}>
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Link>
          </Button>
        ) : (
          <Button className="min-w-28 whitespace-nowrap" disabled size="sm" variant="outline">
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
        )}
        {hasNextPage ? (
          <Button asChild className="min-w-24 whitespace-nowrap" size="sm" variant="outline">
            <Link href={pageHref(params, page + 1, basePath)}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button className="min-w-24 whitespace-nowrap" disabled size="sm" variant="outline">
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
