import path from 'path'
import type { CollectionConfig } from 'payload'

import { authenticated } from './access'
import { POST_IMAGE_ACCEPT } from '@/lib/posts/postImageConfig'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    group: 'Workflow',
    useAsTitle: 'filename',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
  ],
  upload: {
    displayPreview: true,
    mimeTypes: POST_IMAGE_ACCEPT.split(','),
    staticDir: path.resolve(process.cwd(), 'media'),
  },
}
