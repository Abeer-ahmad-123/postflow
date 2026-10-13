import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { uploadthingStorage } from '@payloadcms/storage-uploadthing'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Posts } from './collections/Posts'
import { PostActions } from './collections/PostActions'
import { isUploadThingStorageConfigured } from './lib/storage/uploadthing'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const legacySSLModeAliases = new Set(['prefer', 'require', 'verify-ca'])
const uploadThingStorageEnabled = isUploadThingStorageConfigured()

const getDatabaseUrl = () => {
  const databaseUrl = process.env.DATABASE_URL || ''

  if (!databaseUrl) {
    return databaseUrl
  }

  try {
    const url = new URL(databaseUrl)
    const sslMode = url.searchParams.get('sslmode')

    if (sslMode && legacySSLModeAliases.has(sslMode)) {
      url.searchParams.set('sslmode', 'verify-full')
      return url.toString()
    }
  } catch {
    return databaseUrl
  }

  return databaseUrl
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Posts, PostActions],
  cors: [process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: getDatabaseUrl(),
    },
    push: false,
  }),
  sharp,
  plugins: [
    uploadthingStorage({
      alwaysInsertFields: true,
      clientUploads: {
        routerInputConfig: {
          blob: {
            maxFileCount: 1,
            maxFileSize: '16MB',
          },
        },
      },
      collections: {
        media: true,
      },
      enabled: uploadThingStorageEnabled,
      options: {
        acl: 'public-read',
        token: process.env.UPLOADTHING_TOKEN || '',
      },
    }),
  ],
})
