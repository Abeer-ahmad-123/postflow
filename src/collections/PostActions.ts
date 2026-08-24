import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { authenticated, deny } from './access'

const setAuditFields: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  if (operation !== 'create') {
    throw new Error('Post action history is append-only.')
  }

  if (!req.user) {
    throw new Error('You must be signed in to create an audit action.')
  }

  return {
    ...data,
    performedAt: new Date().toISOString(),
    performedBy: req.user.id,
  }
}

export const PostActions: CollectionConfig = {
  slug: 'post-actions',
  access: {
    create: ({ req }) => Boolean(req.user && req.context?.internalAuditWrite),
    delete: deny,
    read: authenticated,
    update: deny,
  },
  admin: {
    defaultColumns: ['post', 'action', 'performedBy', 'performedAt'],
    group: 'Workflow',
    useAsTitle: 'action',
  },
  fields: [
    {
      name: 'post',
      type: 'relationship',
      relationTo: 'posts',
      required: true,
    },
    {
      name: 'action',
      type: 'select',
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Review', value: 'review' },
        { label: 'Proof Read', value: 'proof_read' },
        { label: 'Posted', value: 'posted' },
        { label: 'Declined', value: 'declined' },
      ],
      required: true,
    },
    {
      name: 'performedBy',
      type: 'relationship',
      admin: {
        readOnly: true,
      },
      relationTo: 'users',
      required: true,
    },
    {
      name: 'performedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        readOnly: true,
      },
      required: true,
    },
    {
      name: 'comment',
      type: 'textarea',
    },
  ],
  hooks: {
    beforeChange: [setAuditFields],
  },
}
