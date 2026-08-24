import type { CollectionAfterChangeHook, CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { authenticated, deny } from './access'
import type { User } from '@/payload-types'
import { createPostActionAudit } from '@/lib/workflow/postAudit'
import { relationshipID } from '@/lib/utils'
import { canEditPostContent, isPostStatus } from '@/lib/workflow/postWorkflow'
import { validatePostContentForStatus, validateURL } from '@/lib/validation/postValidation'

const topicFields = ['topicName', 'topicLink', 'postText'] as const

const enforcePostRules: CollectionBeforeChangeHook = ({ context, data, operation, originalDoc, req }) => {
  if (!req.user) {
    throw new Error('You must be signed in to modify posts.')
  }

  if (operation === 'create') {
    return {
      ...data,
      performedBy: req.user.id,
      status: 'open',
    }
  }

  const workflowStatusChange = Boolean(context?.workflowStatusChange)
  const statusChanged =
    Object.prototype.hasOwnProperty.call(data, 'status') && data.status !== originalDoc?.status
  const performedByChanged =
    Object.prototype.hasOwnProperty.call(data, 'performedBy') &&
    String(relationshipID(data.performedBy)) !== String(relationshipID(originalDoc?.performedBy))

  if (!workflowStatusChange && statusChanged) {
    throw new Error('Status changes must use the workflow service.')
  }

  if (!workflowStatusChange && performedByChanged) {
    throw new Error('performedBy is managed by the server and cannot be edited.')
  }

  if (workflowStatusChange) {
    const nextStatus = data.status

    if (!isPostStatus(nextStatus)) {
      throw new Error('Invalid workflow status.')
    }

    if (String(relationshipID(data.performedBy)) !== String(req.user.id)) {
      throw new Error('performedBy must match the authenticated user.')
    }

    validatePostContentForStatus(nextStatus, data.postText ?? originalDoc?.postText)
    return data
  }

  const changedTopicContent = topicFields.some((field) =>
    Object.prototype.hasOwnProperty.call(data, field),
  )

  if (changedTopicContent && originalDoc?.status && !canEditPostContent(originalDoc.status)) {
    throw new Error('Posted and declined records are finalized and cannot be edited.')
  }

  return data
}

const createInitialAction: CollectionAfterChangeHook = async ({ context, doc, operation, req }) => {
  if (operation !== 'create' || !req.user || context?.skipInitialAuditWrite) {
    return doc
  }

  await createPostActionAudit({
    action: 'open',
    payload: req.payload,
    performedAt: doc.createdAt,
    postId: doc.id,
    req,
    user: req.user as User,
  })

  return doc
}

export const Posts: CollectionConfig = {
  slug: 'posts',
  access: {
    create: authenticated,
    delete: deny,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['topicName', 'status', 'performedBy', 'updatedAt'],
    group: 'Workflow',
    useAsTitle: 'topicName',
  },
  fields: [
    {
      name: 'topicName',
      type: 'text',
      index: true,
      required: true,
    },
    {
      name: 'topicLink',
      type: 'text',
      index: true,
      required: true,
      validate: validateURL,
    },
    {
      name: 'postText',
      type: 'textarea',
    },
    {
      name: 'status',
      type: 'select',
      admin: {
        readOnly: true,
      },
      defaultValue: 'open',
      index: true,
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
      index: true,
      relationTo: 'users',
      required: true,
    },
  ],
  hooks: {
    afterChange: [createInitialAction],
    beforeChange: [enforcePostRules],
  },
}
