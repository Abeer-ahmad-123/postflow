import type { CollectionAfterChangeHook, CollectionBeforeChangeHook, CollectionConfig, Payload, Where } from 'payload'

import { authenticated, deny } from './access'
import type { User } from '@/payload-types'
import { slugifyPostName } from '@/lib/posts/postLinks'
import { createPostActionAudit } from '@/lib/workflow/postAudit'
import { relationshipID } from '@/lib/utils'
import { canEditPostContent, isPostStatus } from '@/lib/workflow/postWorkflow'
import { validatePostContentForStatus, validateURL } from '@/lib/validation/postValidation'

const topicFields = ['topicName', 'topicLink', 'postText'] as const
const maxSlugAttempts = 100

function hasOwn(data: object, key: string) {
  return Object.prototype.hasOwnProperty.call(data, key)
}

async function uniquePostSlug({
  currentPostId,
  payload,
  topicName,
}: {
  currentPostId?: number | string
  payload: Payload
  topicName: string
}) {
  const baseSlug = slugifyPostName(topicName)

  for (let index = 0; index < maxSlugAttempts; index += 1) {
    const candidate = index === 0 ? baseSlug : `${baseSlug}-${index + 1}`
    let where: Where = {
      slug: {
        equals: candidate,
      },
    }

    if (currentPostId) {
      where = {
        and: [
          where,
          {
            id: {
              not_equals: currentPostId,
            },
          },
        ],
      }
    }

    const existing = await payload.find({
      collection: 'posts',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      select: {
        slug: true,
      },
      where,
    })

    if (existing.docs.length === 0) {
      return candidate
    }
  }

  return `${baseSlug}-${Date.now()}`
}

const enforcePostRules: CollectionBeforeChangeHook = async ({
  context,
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (!req.user) {
    throw new Error('You must be signed in to modify posts.')
  }

  const nextData = { ...data }

  if (operation === 'create') {
    return {
      ...nextData,
      performedBy: req.user.id,
      slug: await uniquePostSlug({
        payload: req.payload,
        topicName: typeof nextData.topicName === 'string' ? nextData.topicName : '',
      }),
      status: 'open',
    }
  }

  const workflowStatusChange = Boolean(context?.workflowStatusChange)
  const statusChanged =
    hasOwn(nextData, 'status') && nextData.status !== originalDoc?.status
  const performedByChanged =
    hasOwn(nextData, 'performedBy') &&
    String(relationshipID(nextData.performedBy)) !== String(relationshipID(originalDoc?.performedBy))

  if (!workflowStatusChange && statusChanged) {
    throw new Error('Status changes must use the workflow service.')
  }

  if (!workflowStatusChange && performedByChanged) {
    throw new Error('performedBy is managed by the server and cannot be edited.')
  }

  if (workflowStatusChange) {
    const nextStatus = nextData.status

    if (!isPostStatus(nextStatus)) {
      throw new Error('Invalid workflow status.')
    }

    if (String(relationshipID(nextData.performedBy)) !== String(req.user.id)) {
      throw new Error('performedBy must match the authenticated user.')
    }

    if (hasOwn(nextData, 'slug')) {
      nextData.slug = originalDoc?.slug
    }

    validatePostContentForStatus(nextStatus, nextData.postText ?? originalDoc?.postText)
    return nextData
  }

  const topicNameChanged = hasOwn(nextData, 'topicName') && nextData.topicName !== originalDoc?.topicName
  const slugProvided = hasOwn(nextData, 'slug')

  if (topicNameChanged || slugProvided || !originalDoc?.slug) {
    nextData.slug = await uniquePostSlug({
      currentPostId: originalDoc?.id,
      payload: req.payload,
      topicName: typeof nextData.topicName === 'string' ? nextData.topicName : originalDoc?.topicName || '',
    })
  }

  const changedTopicContent = topicFields.some((field) => hasOwn(nextData, field))

  if (changedTopicContent && originalDoc?.status && !canEditPostContent(originalDoc.status)) {
    throw new Error('Ready, posted, and declined records are finalized and cannot be edited.')
  }

  return nextData
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
      name: 'slug',
      type: 'text',
      admin: {
        readOnly: true,
      },
      index: true,
      required: true,
      unique: true,
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
  ],
  hooks: {
    afterChange: [createInitialAction],
    beforeChange: [enforcePostRules],
  },
}
