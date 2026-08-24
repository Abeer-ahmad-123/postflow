import { getPayload } from 'payload'
import type { Payload } from 'payload'

import config from '@/payload.config'

let payloadClientPromise: Promise<Payload> | undefined

export async function getPayloadClient() {
  payloadClientPromise ??= getPayload({ config })
  return payloadClientPromise
}
