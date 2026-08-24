import { Search } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PostSearchParams } from '@/lib/posts/postQueries'
import { sortOptions } from '@/lib/posts/postQueries'
import { statusLabels, statuses } from '@/lib/workflow/postWorkflow'
import type { User } from '@/payload-types'

export function PostFilters({
  params,
  users,
}: {
  params: PostSearchParams
  users: User[]
}) {
  return (
    <form className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 lg:grid-cols-12" method="get">
      <div className="space-y-2 lg:col-span-3">
        <Label htmlFor="q">Search</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            defaultValue={params.q}
            id="q"
            name="q"
            placeholder="Topic, link, or post text"
          />
        </div>
      </div>
      <div className="space-y-2 lg:col-span-2">
        <Label htmlFor="status">Status</Label>
        <select
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          defaultValue={params.status || ''}
          id="status"
          name="status"
        >
          <option value="">All</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2 lg:col-span-2">
        <Label htmlFor="performedBy">Performed By</Label>
        <select
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          defaultValue={params.performedBy || ''}
          id="performedBy"
          name="performedBy"
        >
          <option value="">All users</option>
          {users.map((user) => (
            <option key={user.id} value={String(user.id)}>
              {user.name || user.email}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2 lg:col-span-2">
        <Label htmlFor="dateField">Date Field</Label>
        <select
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          defaultValue={params.dateField || 'createdAt'}
          id="dateField"
          name="dateField"
        >
          <option value="createdAt">Created</option>
          <option value="updatedAt">Updated</option>
        </select>
      </div>
      <div className="space-y-2 lg:col-span-1">
        <Label htmlFor="from">From</Label>
        <Input defaultValue={params.from} id="from" name="from" type="date" />
      </div>
      <div className="space-y-2 lg:col-span-1">
        <Label htmlFor="to">To</Label>
        <Input defaultValue={params.to} id="to" name="to" type="date" />
      </div>
      <div className="space-y-2 lg:col-span-1">
        <Label htmlFor="sort">Sort</Label>
        <select
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          defaultValue={params.sort || '-updatedAt'}
          id="sort"
          name="sort"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-end gap-2 lg:col-span-12">
        <Button type="submit">
          <Search className="h-4 w-4" />
          Apply
        </Button>
        <Button asChild type="button" variant="outline">
          <Link href="/posts">Reset</Link>
        </Button>
      </div>
    </form>
  )
}
