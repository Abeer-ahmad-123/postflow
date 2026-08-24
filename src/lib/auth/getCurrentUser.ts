import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Payload } from 'payload'
import { cache } from 'react'

import { getPayloadClient } from '@/lib/payload/getPayloadClient'

async function readCurrentUser(payload: Payload) {
  const headers = await getHeaders()
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
