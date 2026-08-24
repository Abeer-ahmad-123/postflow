'use client'

import { Loader2, LogIn } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setPending(true)

    const formData = new FormData(event.currentTarget)
    const response = await fetch('/api/users/login', {
      body: JSON.stringify({
        email: String(formData.get('email') || ''),
        password: String(formData.get('password') || ''),
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })

    setPending(false)

    if (!response.ok) {
      setError('Email or password is incorrect.')
      return
    }

    toast.success('Welcome back.')
    router.replace('/dashboard')
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input autoComplete="email" id="email" name="email" required type="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input autoComplete="current-password" id="password" name="password" required type="password" />
      </div>
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <Button className="w-full" disabled={pending} type="submit">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        Login
      </Button>
    </form>
  )
}
