'use server'

import { z } from 'zod'

import type { ActionState } from '@/lib/forms/actionState'
import { getFormString } from '@/lib/utils'
import { getPayloadClient } from '@/lib/payload/getPayloadClient'
import { signupSchema } from '@/lib/users/userValidation'

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
    message: 'Unable to create account. Please try again.',
    ok: false,
  }
}

export async function signupAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const input = signupSchema.parse({
      email: getFormString(formData, 'email'),
      inviteCode: getFormString(formData, 'inviteCode'),
      name: getFormString(formData, 'name'),
      password: getFormString(formData, 'password'),
    })
    const configuredInviteCode = process.env.POSTFLOW_SIGNUP_INVITE_CODE?.trim()

    if (!configuredInviteCode) {
      throw new Error('Signup invite code is not configured.')
    }

    if (input.inviteCode !== configuredInviteCode) {
      return {
        message: 'Invalid invite code.',
        ok: false,
      }
    }
    const payload = await getPayloadClient()

    const existing = await payload.find({
      collection: 'users',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: {
        email: {
          equals: input.email,
        },
      },
    })

    if (existing.docs.length > 0) {
      return {
        message: 'An account with this email already exists.',
        ok: false,
      }
    }

    await payload.create({
      collection: 'users',
      context: {
        publicSignup: true,
      },
      data: {
        email: input.email,
        name: input.name,
        password: input.password,
      },
      overrideAccess: false,
    })

    return {
      message: 'Account created. You can now log in.',
      ok: true,
    }
  } catch (error) {
    console.error('Unable to sign up', error)
    return actionError(error)
  }
}
