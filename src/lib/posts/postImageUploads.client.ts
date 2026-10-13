'use client'

import { genUploader } from 'uploadthing/client'

import type { Media } from '@/payload-types'

type CreateMediaResponse = {
  doc?: Media
  errors?: Array<{ message?: string }>
  message?: string
}

const { uploadFiles } = genUploader({
  package: 'postflow',
  url: '/api/storage-uploadthing-client-upload-route?collectionSlug=media',
})

function responseError(result: CreateMediaResponse | null, fallback: string) {
  return result?.errors?.[0]?.message || result?.message || fallback
}

async function uploadFileToUploadThing(file: File) {
  const uploads = await uploadFiles('uploader', { files: [file] })
  const upload = uploads[0]

  if (!upload?.key) {
    throw new Error(`Unable to upload ${file.name}.`)
  }

  return upload
}

export async function uploadPostImagesToUploadThing(files: File[]) {
  const media: Media[] = []

  try {
    for (const file of files) {
      const upload = await uploadFileToUploadThing(file)
      const formData = new FormData()

      // Payload's UploadThing adapter needs the direct-upload key on the media record
      // to generate its public URL and delete the object later.
      formData.set(
        '_payload',
        JSON.stringify({
          _key: upload.key,
          alt: file.name.replace(/\.[^.]+$/, ''),
          url: upload.url,
        }),
      )
      formData.set(
        'file',
        JSON.stringify({
          clientUploadContext: { key: upload.key },
          collectionSlug: 'media',
          filename: file.name,
          mimeType: file.type,
          size: file.size,
        }),
      )

      const response = await fetch('/api/media', {
        body: formData,
        method: 'POST',
      })
      const result = (await response.json().catch(() => null)) as CreateMediaResponse | null

      if (!response.ok || !result?.doc) {
        throw new Error(responseError(result, `Unable to save ${file.name}.`))
      }

      media.push(result.doc)
    }

    return media
  } catch (error) {
    await deleteUploadedMedia(media.map((item) => item.id))
    throw error
  }
}

export async function deleteUploadedMedia(mediaIds: Array<number | string>) {
  await Promise.allSettled(
    mediaIds.map((id) =>
      fetch(`/api/media/${encodeURIComponent(String(id))}`, {
        method: 'DELETE',
      }),
    ),
  )
}
