import { describe, expect, it } from 'vitest'

import { postImageFormInput } from '@/lib/posts/postImages'

function image(name: string, type = 'image/png') {
  return new File([new Uint8Array([1, 2, 3])], name, { type })
}

describe('post image validation', () => {
  it('accepts up to three image uploads', () => {
    const formData = new FormData()
    formData.append('images', image('one.png'))
    formData.append('images', image('two.png'))
    formData.append('images', image('three.png'))

    expect(postImageFormInput(formData).files).toHaveLength(3)
  })

  it('counts retained images toward the three-image limit', () => {
    const formData = new FormData()
    formData.set('retainedImageIds', JSON.stringify(['10', '11']))
    formData.append('images', image('three.png'))
    formData.append('images', image('four.png'))

    expect(() => postImageFormInput(formData)).toThrow('You can upload up to 3 images.')
  })

  it('accepts media IDs created by direct UploadThing uploads', () => {
    const formData = new FormData()
    formData.set('newImageIds', JSON.stringify([20, 21]))
    formData.set('retainedImageIds', JSON.stringify(['10']))

    expect(postImageFormInput(formData)).toMatchObject({
      newImageIds: [20, 21],
      retainedImageIds: [10],
    })
  })

  it('rejects malformed media IDs', () => {
    const formData = new FormData()
    formData.set('newImageIds', JSON.stringify([20, -1, 2.5]))

    expect(() => postImageFormInput(formData)).toThrow(
      'The selected images are invalid. Please refresh and try again.',
    )
  })

  it('rejects unsupported files', () => {
    const formData = new FormData()
    formData.append('images', image('notes.txt', 'text/plain'))

    expect(() => postImageFormInput(formData)).toThrow(
      'Images must be JPEG, PNG, WebP, or GIF files.',
    )
  })
})
