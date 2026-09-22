'use client'

import { upload } from '@vercel/blob/client'

import type { Media } from '@/payload-types'

type CreateMediaResponse = {
  doc?: Media
  errors?: Array<{ message?: string }>
  message?: string
}

function blobFilename(filename: string) {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')
  return `${crypto.randomUUID()}-${safeName || 'image'}`
}

function responseError(result: CreateMediaResponse | null, fallback: string) {
  return result?.errors?.[0]?.message || result?.message || fallback
}

export async function uploadPostImagesToBlob(files: File[]) {
  const media: Media[] = []

  try {
    for (const file of files) {
      const blob = await upload(blobFilename(file.name), file, {
        access: 'public',
        clientPayload: 'media',
        contentType: file.type,
        handleUploadUrl: '/api/vercel-blob-client-upload-route',
        multipart: file.size > 4 * 1024 * 1024,
      })
      const filename = decodeURIComponent(blob.pathname.split('/').pop() || blob.pathname)
      const formData = new FormData()

      formData.set('_payload', JSON.stringify({ alt: file.name.replace(/\.[^.]+$/, '') }))
      formData.set(
        'file',
        JSON.stringify({
          clientUploadContext: {},
          collectionSlug: 'media',
          filename,
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
