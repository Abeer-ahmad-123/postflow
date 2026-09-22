import { after, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth/getCurrentUser'
import { getPayloadClient } from '@/lib/payload/getPayloadClient'
import { deleteUploadedImages, postImageFormInput, uploadPostImages } from '@/lib/posts/postImages'
import { postPath } from '@/lib/posts/postLinks'
import { createTopic } from '@/lib/workflow/changePostStatus'
import { createPostActionAudit } from '@/lib/workflow/postAudit'

function jsonError(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        message: error.issues[0]?.message || 'Please check the form fields.',
        ok: false,
      },
      { status: 400 },
    )
  }

  if (error instanceof Error) {
    return NextResponse.json({ message: error.message, ok: false }, { status: 400 })
  }

  return NextResponse.json(
    {
      message: 'Something went wrong. Please try again.',
      ok: false,
    },
    { status: 500 },
  )
}

export async function POST(request: Request) {
  let uploadedImages: Awaited<ReturnType<typeof uploadPostImages>> = []
  let payload: Awaited<ReturnType<typeof getPayloadClient>> | undefined

  try {
    payload = await getPayloadClient()
    const user = await getCurrentUser(payload)
    const isMultipart = request.headers.get('content-type')?.includes('multipart/form-data')
    const formData = isMultipart ? await request.formData() : null
    const imageInput = formData
      ? postImageFormInput(formData)
      : { files: [], newImageIds: [], retainedImageIds: [] }
    const input = formData
      ? {
          postText: formData.get('postText'),
          topicLink: formData.get('topicLink'),
          topicName: formData.get('topicName'),
        }
      : await request.json()

    if (!user) {
      throw new Error('You must be signed in to perform this action.')
    }

    uploadedImages = await uploadPostImages({
      files: imageInput.files,
      payload,
      user,
    })

    const post = await createTopic({
      deferInitialAudit: true,
      imageIds: [...imageInput.newImageIds, ...uploadedImages.map((image) => image.id)],
      input,
      payload,
      user,
    })
    const postId = String(post.id)

    if (user) {
      const auditPayload = payload

      after(async () => {
        try {
          await createPostActionAudit({
            action: 'open',
            payload: auditPayload,
            performedAt: post.createdAt,
            postId: post.id,
            user,
          })
        } catch (error) {
          console.error(`Unable to create initial audit action for post ${postId}`, error)
        }
      })
    }

    return NextResponse.json({
      href: postPath(post),
      id: postId,
      message: 'Topic created.',
      ok: true,
    })
  } catch (error) {
    console.error('Unable to create topic', error)

    if (payload && uploadedImages.length > 0) {
      await deleteUploadedImages({ images: uploadedImages, payload })
    }

    return jsonError(error)
  }
}
