import { after, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth/getCurrentUser'
import { getPayloadClient } from '@/lib/payload/getPayloadClient'
import { postPath } from '@/lib/posts/postLinks'
import { createTopic } from '@/lib/workflow/changePostStatus'
import { createPostActionAudit } from '@/lib/workflow/postAudit'

function jsonError(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        message: error.issues[0]?.message || 'Please check the form fields.',
        ok: false,
      },
      { status: 400 },
    )
  }

  if (error instanceof Error) {
    return NextResponse.json({ message: error.message, ok: false }, { status: 400 })
  }

  return NextResponse.json(
    {
      message: 'Something went wrong. Please try again.',
      ok: false,
    },
    { status: 500 },
  )
}

export async function POST(request: Request) {
  try {
    const payload = await getPayloadClient()
    const user = await getCurrentUser(payload)

    const post = await createTopic({
      deferInitialAudit: true,
      input: await request.json(),
      payload,
      user,
    })
    const postId = String(post.id)

    if (user) {
      after(async () => {
        try {
          await createPostActionAudit({
            action: 'open',
            payload,
            performedAt: post.createdAt,
            postId: post.id,
            user,
          })
        } catch (error) {
          console.error(`Unable to create initial audit action for post ${postId}`, error)
        }
      })
    }

    return NextResponse.json({
      href: postPath(post),
      id: postId,
      message: 'Topic created.',
      ok: true,
    })
  } catch (error) {
    console.error('Unable to create topic', error)
    return jsonError(error)
  }
}
