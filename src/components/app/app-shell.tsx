import { BarChart3, FilePlus2, ListChecks } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { LogoutButton } from '@/components/app/logout-button'
import { PostflowLogo } from '@/components/app/postflow-logo'
import { Button } from '@/components/ui/button'
import type { User } from '@/payload-types'

const navigation = [
  {
    href: '/dashboard',
    icon: BarChart3,
    label: 'Dashboard',
  },
  {
    href: '/posts',
    icon: ListChecks,
    label: 'Posts',
  },
  {
    href: '/posts/new',
    icon: FilePlus2,
    label: 'New Topic',
  },
]

export function AppShell({ children, user }: { children: ReactNode; user: User }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="border-b border-slate-200 px-6 py-5">
          <Link className="inline-flex" href="/dashboard">
            <PostflowLogo />
          </Link>
          <p className="mt-1 text-sm text-slate-500">Topic and post workflow</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navigation.map((item) => (
            <Button asChild className="justify-start" key={item.href} variant="ghost">
              <Link href={item.href}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-500">Signed in as</p>
              <p className="truncate text-sm font-semibold text-slate-950">{user.name || user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-1 md:flex lg:hidden">
                {navigation.map((item) => (
                  <Button asChild key={item.href} size="sm" variant="ghost">
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </Button>
                ))}
              </div>
              <LogoutButton />
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
