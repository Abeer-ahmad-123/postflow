import Link from 'next/link'

import { PostflowLogo } from '@/components/app/postflow-logo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            <PostflowLogo />
          </CardTitle>
          <CardDescription>Sign in with your Payload user account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <LoginForm />
          <p className="text-sm text-slate-500">
            Need an account?{' '}
            <Link className="font-medium text-slate-950 underline" href="/signup">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
