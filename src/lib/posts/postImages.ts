import type { Payload } from 'payload'

import type { Media, User } from '@/payload-types'
import { assertImageStorageAvailableOnVercel } from '@/lib/storage/uploadthing'
import {
  MAX_POST_IMAGES,
  MAX_POST_IMAGE_SIZE,
  POST_IMAGE_ACCEPT,
} from '@/lib/posts/postImageConfig'

const acceptedImageTypes = new Set(POST_IMAGE_ACCEPT.split(','))

export type PostImageFormInput = {
  files: File[]
  newImageIds: number[]
  retainedImageIds: number[]
}

function formImageIds(formData: FormData, key: string) {
  const value = formData.get(key)

  if (typeof value === 'string' && value) {
    try {
      const parsed: unknown = JSON.parse(value)

      if (!Array.isArray(parsed)) {
        throw new Error()
      }

      const imageIds = parsed.map((value) =>
        typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value,
      )

      if (
        !imageIds.every(
          (value) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0,
        )
      ) {
        throw new Error()
      }

      return [...new Set(imageIds as number[])]
    } catch {
      throw new Error('The selected images are invalid. Please refresh and try again.')
    }
  }

  return []
}

export function postImageFormInput(formData: FormData): PostImageFormInput {
  const files = formData
    .getAll('images')
    .filter((entry): entry is File => typeof entry !== 'string' && entry.size > 0)
  const newImageIds = formImageIds(formData, 'newImageIds')
  const retainedImageIds = formImageIds(formData, 'retainedImageIds')

  if (retainedImageIds.length + newImageIds.length + files.length > MAX_POST_IMAGES) {
    throw new Error(`You can upload up to ${MAX_POST_IMAGES} images.`)
  }

  for (const file of files) {
    if (!acceptedImageTypes.has(file.type)) {
      throw new Error('Images must be JPEG, PNG, WebP, or GIF files.')
    }

    if (file.size > MAX_POST_IMAGE_SIZE) {
      throw new Error('Each image must be 10 MB or smaller.')
    }
  }

  return { files, newImageIds, retainedImageIds }
}

export async function uploadPostImages({
  files,
  payload,
  user,
}: {
  files: File[]
  payload: Payload
  user: User
}) {
  const uploaded: Media[] = []

  if (files.length > 0) {
    assertImageStorageAvailableOnVercel()
  }

  try {
    for (const file of files) {
      const media = await payload.create({
        collection: 'media',
        data: {
          alt: file.name.replace(/\.[^.]+$/, ''),
        },
        file: {
          data: Buffer.from(await file.arrayBuffer()),
          mimetype: file.type,
          name: file.name,
          size: file.size,
        },
        overrideAccess: false,
        req: { user },
        user,
      })

      uploaded.push(media)
    }

    return uploaded
  } catch (error) {
    await deleteUploadedImages({ images: uploaded, payload })
    throw error
  }
}

export async function deleteUploadedImages({
  images,
  payload,
}: {
  images: Array<Pick<Media, 'id'>>
  payload: Payload
}) {
  await Promise.allSettled(
    images.map((image) =>
      payload.delete({
        collection: 'media',
        id: image.id,
        overrideAccess: true,
      }),
    ),
  )
}
