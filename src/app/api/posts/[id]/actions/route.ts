import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth/getCurrentUser'
import { getPayloadClient } from '@/lib/payload/getPayloadClient'
import { getPostActionHistory } from '@/lib/posts/postQueries'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayloadClient()
  const user = await getCurrentUser(payload)

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized.', ok: false }, { status: 401 })
  }

  const post = await payload.findByID({
    collection: 'posts',
    depth: 1,
    disableErrors: true,
    id,
    overrideAccess: false,
    user,
  })

  if (!post) {
    return NextResponse.json({ message: 'Post not found.', ok: false }, { status: 404 })
  }

  const actions = await getPostActionHistory({
    overrideAccess: false,
    payload,
    post,
    user,
  })

  return NextResponse.json(
    {
      actions,
      ok: true,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
