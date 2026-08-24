'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth/getCurrentUser'
import type { ActionState } from '@/lib/forms/actionState'
import { getFormString } from '@/lib/utils'
import { getPayloadClient } from '@/lib/payload/getPayloadClient'
import { createPostActionAudit } from '@/lib/workflow/postAudit'
import { changePostStatus, createTopic, updatePostContent } from '@/lib/workflow/changePostStatus'

function actionError(error: unknown): ActionState {
  if (error instanceof z.ZodError) {
    return {
      message: error.issues[0]?.message || 'Please check the form fields.',
      ok: false,
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      ok: false,
    }
  }

  return {
    message: 'Something went wrong. Please try again.',
    ok: false,
  }
}

function postFormInput(formData: FormData) {
  return {
    postText: getFormString(formData, 'postText'),
    topicLink: getFormString(formData, 'topicLink'),
    topicName: getFormString(formData, 'topicName'),
  }
}

export async function createTopicFormAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let postId: string | undefined

  try {
    const payload = await getPayloadClient()
    const user = await getCurrentUser(payload)
    const post = await createTopic({
      deferInitialAudit: true,
      input: postFormInput(formData),
      payload,
      user,
    })

    postId = String(post.id)

    if (user) {
      after(async () => {
        try {
          await createPostActionAudit({
            action: 'open',
            payload,
            performedAt: post.createdAt,
            postId: post.id,
            user,
          })

          revalidatePath(`/posts/${postId}`)
        } catch (error) {
          console.error(`Unable to create initial audit action for post ${postId}`, error)
        }
      })
    }
  } catch (error) {
    console.error('Unable to create topic', error)
    return actionError(error)
  }

  redirect(`/posts/${postId}`)
}

export async function updatePostFormAction(
  postId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const payload = await getPayloadClient()
    const user = await getCurrentUser(payload)

    await updatePostContent({
      input: postFormInput(formData),
      payload,
      postId,
      user,
    })

    revalidatePath(`/posts/${postId}`)

    return {
      message: 'Post content updated.',
      ok: true,
    }
  } catch (error) {
    console.error(`Unable to update post ${postId}`, error)
    return actionError(error)
  }
}

export async function changeStatusFormAction(
  postId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const payload = await getPayloadClient()
    const user = await getCurrentUser(payload)
    const newStatus = getFormString(formData, 'status')
    const comment = getFormString(formData, 'comment')

    await changePostStatus({
      comment,
      newStatus,
      payload,
      postId,
      user,
    })

    revalidatePath(`/posts/${postId}`)

    return {
      message: 'Workflow status updated.',
      ok: true,
    }
  } catch (error) {
    console.error(`Unable to change status for post ${postId}`, error)
    return actionError(error)
  }
}
