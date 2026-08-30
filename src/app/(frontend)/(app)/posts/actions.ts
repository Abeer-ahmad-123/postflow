'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth/getCurrentUser'
import type { ActionState } from '@/lib/forms/actionState'
import { getFormString } from '@/lib/utils'
import { getPayloadClient } from '@/lib/payload/getPayloadClient'
import { postPath } from '@/lib/posts/postLinks'
import {
  createPostActionAudit,
  deletePostActionComment,
  updatePostActionComment,
} from '@/lib/workflow/postAudit'
import {
  addPostComment,
  changePostStatus,
  createTopic,
  updatePostContent,
} from '@/lib/workflow/changePostStatus'

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

function commentInput(formData: FormData) {
  return {
    comment: getFormString(formData, 'comment'),
  }
}

export async function createTopicFormAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let postHref = '/posts'
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
    postHref = postPath(post)

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

          revalidatePath(postPath(post))
        } catch (error) {
          console.error(`Unable to create initial audit action for post ${postId}`, error)
        }
      })
    }
  } catch (error) {
    console.error('Unable to create topic', error)
    return actionError(error)
  }

  redirect(postHref)
}

export async function updatePostFormAction(
  postId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const payload = await getPayloadClient()
    const user = await getCurrentUser(payload)

    const post = await updatePostContent({
      input: postFormInput(formData),
      payload,
      postId,
      user,
    })

    revalidatePath(postPath(post))
    revalidatePath('/posts')
    revalidatePath('/ready-for-leo')

    return {
      href: postPath(post),
      id: String(post.id),
      message: 'Post content updated.',
      ok: true,
    }
  } catch (error) {
    console.error(`Unable to update post ${postId}`, error)
    return actionError(error)
  }
}

export async function updateCommentFormAction(
  actionId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const payload = await getPayloadClient()
    const user = await getCurrentUser(payload)

    if (!user) {
      throw new Error('You must be signed in to update a comment.')
    }

    const { post } = await updatePostActionComment({
      actionId,
      input: commentInput(formData),
      payload,
      user,
    })

    revalidatePath(postPath(post))
    revalidatePath('/posts')
    revalidatePath('/ready-for-leo')

    return {
      message: 'Comment updated.',
      ok: true,
    }
  } catch (error) {
    console.error(`Unable to update comment ${actionId}`, error)
    return actionError(error)
  }
}

export async function deleteCommentFormAction(
  actionId: string,
  _previousState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  try {
    const payload = await getPayloadClient()
    const user = await getCurrentUser(payload)

    if (!user) {
      throw new Error('You must be signed in to delete a comment.')
    }

    const { post } = await deletePostActionComment({
      actionId,
      payload,
      user,
    })

    revalidatePath(postPath(post))
    revalidatePath('/posts')
    revalidatePath('/ready-for-leo')

    return {
      message: 'Comment deleted.',
      ok: true,
    }
  } catch (error) {
    console.error(`Unable to delete comment ${actionId}`, error)
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

    const post = await changePostStatus({
      comment,
      newStatus,
      payload,
      postId,
      user,
    })

    revalidatePath(postPath(post))
    revalidatePath('/posts')
    revalidatePath('/ready-for-leo')

    return {
      message: 'Workflow status updated.',
      ok: true,
    }
  } catch (error) {
    console.error(`Unable to change status for post ${postId}`, error)
    return actionError(error)
  }
}

export async function addCommentFormAction(
  postId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const payload = await getPayloadClient()
    const user = await getCurrentUser(payload)

    const post = await addPostComment({
      input: commentInput(formData),
      payload,
      postId,
      user,
    })

    revalidatePath(postPath(post))
    revalidatePath('/posts')
    revalidatePath('/ready-for-leo')

    return {
      message: 'Comment added.',
      ok: true,
    }
  } catch (error) {
    console.error(`Unable to add comment for post ${postId}`, error)
    return actionError(error)
  }
}
