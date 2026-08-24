import 'dotenv/config'

import { getPayload } from 'payload'

import config from '@/payload.config'

async function main() {
  const payload = await getPayload({ config })
  const users = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1000,
    overrideAccess: true,
    sort: 'createdAt',
  })

  const firstUser = users.docs[0]

  if (!firstUser) {
    payload.logger.info('No users found. Nothing to sync.')
    process.exit(0)
  }

  await Promise.all(
    users.docs.map((user) =>
      payload.update({
        collection: 'users',
        context: {
          internalUserAdminWrite: true,
        },
        data: {
          isPayloadAdmin: user.id === firstUser.id,
        },
        id: user.id,
        overrideAccess: true,
      }),
    ),
  )

  payload.logger.info(`Payload admin user synced: ${firstUser.email}`)
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
