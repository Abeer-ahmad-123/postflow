'use client'

import { Loader2, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

import { signupAction } from '@/app/(frontend)/signup/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { initialActionState, type ActionState } from '@/lib/forms/actionState'

export function SignupForm() {
  const router = useRouter()
  const toastKey = useRef('')
  const [state, formAction, pending] = useActionState<ActionState, FormData>(signupAction, initialActionState)

  useEffect(() => {
    if (!state.message || toastKey.current === `${state.ok}:${state.message}`) {
      return
    }

    toastKey.current = `${state.ok}:${state.message}`

    if (state.ok) {
      toast.success(state.message)
      router.push('/login')
    } else {
      toast.error(state.message)
    }
  }, [router, state])

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input autoComplete="name" id="name" maxLength={120} name="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input autoComplete="email" id="email" name="email" required type="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input autoComplete="new-password" id="password" minLength={8} name="password" required type="password" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="inviteCode">Invite Code</Label>
        <Input autoComplete="off" id="inviteCode" name="inviteCode" required type="password" />
      </div>
      {state.message && !state.ok ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
      ) : null}
      <Button className="w-full" disabled={pending} type="submit">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        Create Account
      </Button>
      <p className="text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link className="font-medium text-slate-950 underline" href="/login">
          Log in
        </Link>
      </p>
    </form>
  )
}
