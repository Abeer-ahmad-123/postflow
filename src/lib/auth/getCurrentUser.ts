import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { jwtVerify } from 'jose'
import type { Payload } from 'payload'
import { cache } from 'react'

import { getPayloadClient } from '@/lib/payload/getPayloadClient'
import type { User } from '@/payload-types'

type HeaderStore = {
  get(name: string): null | string
}

type PayloadToken = {
  collection?: unknown
  email?: unknown
  id?: unknown
  isPayloadAdmin?: unknown
  name?: unknown
  sid?: unknown
}

function readCookie(headers: HeaderStore, name: string) {
  const cookieHeader = headers.get('cookie')

  if (!cookieHeader) {
    return null
  }

  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))

  if (!cookie) {
    return null
  }

  try {
    return decodeURIComponent(cookie.slice(name.length + 1))
  } catch {
    return cookie.slice(name.length + 1)
  }
}

async function readCurrentUserFromVerifiedToken(payload: Payload, headers: HeaderStore) {
  const token = readCookie(headers, `${payload.config.cookiePrefix}-token`)

  if (!token || !payload.secret) {
    return null
  }

  try {
    const { payload: decoded } = await jwtVerify(
      token,
      new TextEncoder().encode(payload.secret),
    )
    const tokenPayload = decoded as PayloadToken

    if (
      tokenPayload.collection !== 'users' ||
      (typeof tokenPayload.id !== 'number' && typeof tokenPayload.id !== 'string') ||
      typeof tokenPayload.email !== 'string'
    ) {
      return null
    }

    const userId = Number(tokenPayload.id)

    if (!Number.isFinite(userId)) {
      return null
    }

    const now = new Date().toISOString()

    return {
      collection: 'users',
      createdAt: now,
      email: tokenPayload.email,
      id: userId,
      isPayloadAdmin: tokenPayload.isPayloadAdmin === true,
      name: typeof tokenPayload.name === 'string' ? tokenPayload.name : tokenPayload.email,
      sessions:
        typeof tokenPayload.sid === 'string'
          ? [
              {
                expiresAt: now,
                id: tokenPayload.sid,
              },
            ]
          : undefined,
      updatedAt: now,
    } satisfies User
  } catch {
    return null
  }
}

async function readCurrentUser(payload: Payload) {
  const headers = await getHeaders()
  const tokenUser = await readCurrentUserFromVerifiedToken(payload, headers)

  if (tokenUser) {
    return tokenUser
  }

  const { user } = await payload.auth({ headers })

  return user
}

const getCachedCurrentUser = cache(async () => {
  const payload = await getPayloadClient()

  return readCurrentUser(payload)
})

export async function getCurrentUser(payloadInstance?: Payload) {
  return payloadInstance ? readCurrentUser(payloadInstance) : getCachedCurrentUser()
}

export async function requireCurrentUser(payloadInstance?: Payload) {
  const user = await getCurrentUser(payloadInstance)

  if (!user) {
    redirect('/login')
  }

  return user
}
