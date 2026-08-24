import type { CollectionBeforeChangeHook, CollectionConfig, PayloadRequest } from 'payload'

import { authenticated, deny, updateSelf } from './access'

async function isPayloadAdminUser(req: PayloadRequest) {
  if (!req.user) {
    return false
  }

  if (req.user.isPayloadAdmin) {
    return true
  }

  const firstUser = await req.payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    sort: 'createdAt',
  })

  return String(firstUser.docs[0]?.id) === String(req.user.id)
}

const assignPayloadAdminFlag: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create') {
    if (Object.prototype.hasOwnProperty.call(data, 'isPayloadAdmin') && !req.context?.internalUserAdminWrite) {
      throw new Error('Payload admin access is managed by the server.')
    }

    return data
  }

  const existingUsers = await req.payload.count({
    collection: 'users',
    overrideAccess: true,
  })

  return {
    ...data,
    isPayloadAdmin: existingUsers.totalDocs === 0,
  }
}

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: ({ req }) => isPayloadAdminUser(req),
    create: ({ req }) => Boolean(req.user?.isPayloadAdmin || req.context?.publicSignup),
    delete: deny,
    read: authenticated,
    update: updateSelf,
  },
  admin: {
    useAsTitle: 'name',
  },
  auth: {
    depth: 0,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'isPayloadAdmin',
      type: 'checkbox',
      admin: {
        description: 'Server-managed. The first user gets Payload admin access; signup users do not.',
        readOnly: true,
      },
      defaultValue: false,
      hidden: true,
      saveToJWT: true,
    },
  ],
  hooks: {
    beforeChange: [assignPayloadAdminFlag],
  },
}
