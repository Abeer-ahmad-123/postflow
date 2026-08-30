import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { authenticated, deny } from './access'
import { relationshipID } from '@/lib/utils'

const commentWriteFields = new Set(['comment'])
const immutableAuditFields = ['action', 'performedAt', 'performedBy', 'post'] as const
const systemPassthroughFields = new Set(['createdAt', 'id', 'updatedAt'])

function equivalentAuditFieldValue(
  field: (typeof immutableAuditFields)[number],
  nextValue: unknown,
  originalValue: unknown,
) {
  if (field === 'performedBy' || field === 'post') {
    return String(relationshipID(nextValue)) === String(relationshipID(originalValue))
  }

  return nextValue === originalValue
}

const setAuditFields: CollectionBeforeChangeHook = ({ context, data, operation, originalDoc, req }) => {
  if (operation === 'update' && context?.internalCommentWrite) {
    if (!req.user) {
      throw new Error('You must be signed in to update a comment.')
    }

    const invalidField = Object.keys(data).find((key) => {
      if (commentWriteFields.has(key) || systemPassthroughFields.has(key)) {
        return false
      }

      if (!immutableAuditFields.includes(key as (typeof immutableAuditFields)[number])) {
        return true
      }

      const field = key as (typeof immutableAuditFields)[number]
      return !equivalentAuditFieldValue(field, data[key], originalDoc?.[field])
    })

    if (invalidField) {
      throw new Error('Only comment text can be edited.')
    }

    if (String(relationshipID(originalDoc?.performedBy)) !== String(req.user.id)) {
      throw new Error('Only the comment owner can edit this comment.')
    }

    return {
      ...data,
      action: originalDoc?.action,
      comment: typeof data.comment === 'string' ? data.comment.trim() : null,
      performedAt: originalDoc?.performedAt,
      performedBy: originalDoc?.performedBy,
      post: originalDoc?.post,
    }
  }

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
  indexes: [
    {
      fields: ['post', 'performedAt'],
    },
  ],
  fields: [
    {
      name: 'post',
      type: 'relationship',
      index: true,
      relationTo: 'posts',
      required: true,
    },
    {
      name: 'action',
      type: 'select',
      index: true,
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Review', value: 'review' },
        { label: 'Ready', value: 'ready' },
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
      index: true,
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
      index: true,
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
