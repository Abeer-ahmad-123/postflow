'use client'

import { Loader2, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

export function LogoutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function logout() {
    setPending(true)

    const response = await fetch('/api/auth/logout', {
      method: 'POST',
    })

    if (!response.ok) {
      setPending(false)
      toast.error('Unable to log out.')
      return
    }

    router.replace('/login')
  }

  return (
    <Button disabled={pending} onClick={logout} type="button" variant="ghost">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      Logout
    </Button>
  )
}
