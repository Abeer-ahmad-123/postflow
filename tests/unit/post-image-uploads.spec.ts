import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const uploadFilesMock = vi.hoisted(() => vi.fn())

vi.mock('uploadthing/client', () => ({
  genUploader: vi.fn(() => ({ uploadFiles: uploadFilesMock })),
}))

import { uploadPostImagesToUploadThing } from '@/lib/posts/postImageUploads.client'
import type { Media } from '@/payload-types'

beforeEach(() => {
  uploadFilesMock.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('UploadThing post image uploads', () => {
  it('uploads directly to UploadThing before creating the media record', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'My image.png', {
      type: 'image/png',
    })
    const media = {
      _key: 'upload-key',
      createdAt: '2026-10-13T00:00:00.000Z',
      filename: 'My image.png',
      id: 42,
      updatedAt: '2026-10-13T00:00:00.000Z',
      url: 'https://utfs.io/f/upload-key',
    } as Media
    const fetchMock = vi.fn().mockResolvedValueOnce({
      json: async () => ({ doc: media }),
      ok: true,
    })

    uploadFilesMock.mockResolvedValueOnce([
      { key: 'upload-key', url: 'https://utfs.io/f/upload-key' },
    ])
    vi.stubGlobal('fetch', fetchMock)

    await expect(uploadPostImagesToUploadThing([file])).resolves.toEqual([media])
    expect(uploadFilesMock).toHaveBeenCalledWith('uploader', { files: [file] })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [mediaURL, mediaRequest] = fetchMock.mock.calls[0] as [string, RequestInit]
    const mediaForm = mediaRequest.body as FormData

    expect(mediaURL).toBe('/api/media')
    expect(JSON.parse(String(mediaForm.get('_payload')))).toEqual({
      _key: 'upload-key',
      alt: 'My image',
      url: 'https://utfs.io/f/upload-key',
    })
    expect(JSON.parse(String(mediaForm.get('file')))).toEqual({
      clientUploadContext: { key: 'upload-key' },
      collectionSlug: 'media',
      filename: 'My image.png',
      mimeType: 'image/png',
      size: 3,
    })
  })

  it('stops before creating media when UploadThing rejects the upload', async () => {
    const file = new File([new Uint8Array([1])], 'image.png', { type: 'image/png' })

    uploadFilesMock.mockRejectedValueOnce(new Error('Upload failed'))
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(uploadPostImagesToUploadThing([file])).rejects.toThrow('Upload failed')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('removes completed media records if a later media record fails', async () => {
    const first = new File([new Uint8Array([1])], 'first.png', { type: 'image/png' })
    const second = new File([new Uint8Array([2])], 'second.png', { type: 'image/png' })
    const media = {
      createdAt: '2026-10-13T00:00:00.000Z',
      id: 42,
      updatedAt: '2026-10-13T00:00:00.000Z',
    } as Media
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ json: async () => ({ doc: media }), ok: true })
      .mockResolvedValueOnce({
        json: async () => ({ errors: [{ message: 'Unable to save media' }] }),
        ok: false,
      })
      .mockResolvedValueOnce({ ok: true })

    uploadFilesMock
      .mockResolvedValueOnce([{ key: 'first-key', url: 'https://utfs.io/f/first-key' }])
      .mockResolvedValueOnce([{ key: 'second-key', url: 'https://utfs.io/f/second-key' }])
    vi.stubGlobal('fetch', fetchMock)

    await expect(uploadPostImagesToUploadThing([first, second])).rejects.toThrow(
      'Unable to save media',
    )
    expect(fetchMock).toHaveBeenLastCalledWith('/api/media/42', { method: 'DELETE' })
  })
})
