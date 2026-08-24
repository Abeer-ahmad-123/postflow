import { NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/payload/getPayloadClient'

export async function GET() {
  try {
    await getPayloadClient()

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
