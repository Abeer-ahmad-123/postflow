import { NextResponse } from 'next/server'
import { generatePayloadCookie } from 'payload'
import { z } from 'zod'

import { getPayloadClient } from '@/lib/payload/getPayloadClient'

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null))

  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  try {
    const payload = await getPayloadClient()
    const result = await payload.login({
      collection: 'users',
      data: parsed.data,
      depth: 0,
    })

    if (!result.token) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    const cookie = generatePayloadCookie({
      collectionAuthConfig: payload.collections.users.config.auth,
      cookiePrefix: payload.config.cookiePrefix,
      token: result.token,
    })

    return NextResponse.json(
      { ok: true },
      {
        headers: {
          'Set-Cookie': cookie,
        },
      },
    )
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
}
